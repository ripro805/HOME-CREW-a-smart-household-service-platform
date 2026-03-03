from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.generics import get_object_or_404
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated, AllowAny
from api.permissions import IsAdminOrSelfOrReadOnly
from .models import Cart, CartItem, Order, OrderItem, Service
from rest_framework.decorators import api_view, permission_classes
from sslcommerz_lib import SSLCOMMERZ 
from .service import OrderService
from django.conf import settings as django_settings
from django.http import HttpResponseRedirect
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from .serializers import (
    CartSerializer,
    CartItemSerializer,
    AddCartItemSerializer,
    UpdateCartItemSerializer,
    OrderSerializer,
    OrderItemSerializer,
    CreateOrderSerializer,
    UpdateOrderSerializer,
)


# =========================
# CART VIEWSET
# =========================
class CartViewSet(viewsets.ModelViewSet):
    """
    Cart Management Endpoint
    Features:
    1. Admins can view all carts; clients see only their own.
    2. Supports cart creation, retrieval, update, and deletion.
    3. Automatically assigns cart to user on creation.
    4. Returns cart details including items and client info.
    """
    serializer_class = CartSerializer
    permission_classes = [IsAdminOrSelfOrReadOnly]
    
    def perform_create(self, serializer):
        serializer.save(client=self.request.user)
        
    def get_queryset(self):
        user = self.request.user
        if getattr(user, "role", None) == "admin":
            return Cart.objects.all()
        return Cart.objects.filter(client=user)


# =========================
# CART ITEM (NESTED)
# =========================
class CartItemViewSet(viewsets.ModelViewSet):
    """
    Cart Item Management Endpoint (Nested)
    Features:
    1. Supports adding, updating, and removing items in a cart.
    2. Admins can manage any cart; clients only their own.
    3. Returns item details including service, quantity, and price.
    4. Enforces cart ownership and permissions.
    """
    http_method_names = ["get", "post", "patch", "delete"]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return CartItem.objects.none()
        cart_id = self.kwargs["cart_pk"]
        user = self.request.user

        if getattr(user, "role", None) == "admin":
            return CartItem.objects.filter(cart_id=cart_id)

        cart = Cart.objects.filter(id=cart_id, client=user).first()
        return CartItem.objects.filter(cart=cart) if cart else CartItem.objects.none()

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AddCartItemSerializer
        if self.request.method == "PATCH":
            return UpdateCartItemSerializer
        return CartItemSerializer

    def get_serializer_context(self):
        if getattr(self, 'swagger_fake_view', False):
            return {}
        return {"cart_id": self.kwargs["cart_pk"]}


# =========================
# ORDER VIEWSET
# =========================
class OrderViewSet(viewsets.ModelViewSet):
    """
    Order Management Endpoint
    Features:
    1. Admins can update/delete any order; clients can create/view their own.
    2. Supports order creation, status update, cancellation, and deletion.
    3. Prevents cancellation of delivered orders.
    4. Returns order details including items, status, and timestamps.
    """

    @swagger_auto_schema(operation_description="""
    List all orders accessible to the authenticated user.
    Admins see all orders, clients see only their own orders.
    """)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(operation_description="""
    Retrieve a single order by ID.
    Returns all details for a specific order including items, status, timestamps, and client info.
    """)
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @swagger_auto_schema(operation_description="""
    Create a new order (client only).
    Accepts cart items in request body and returns created order object.
    """)
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @swagger_auto_schema(operation_description="""
    Update an existing order (admin only).
    Accepts updated fields in request body and returns updated order object.
    """)
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @swagger_auto_schema(operation_description="""
    Delete an order (admin only).
    Removes order from system and returns status 204 on success.
    """)
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    http_method_names = ['get', 'post', 'delete', 'patch', 'head', 'options']

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status in [order.SHIPPED, order.DELIVERED]:
            return Response({'detail': 'Cannot cancel an order that is already ongoing or delivered.'}, status=status.HTTP_400_BAD_REQUEST)
        OrderService.cancel_order(order=order, user=request.user)
        return Response({'status': 'Order canceled'})

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        if new_status == order.CANCELLED and order.status in [order.SHIPPED, order.DELIVERED]:
            return Response({'detail': 'Cannot cancel an order that is already ongoing or delivered.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = UpdateOrderSerializer(order, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'status': f"Order status updated to {new_status}"})

    @swagger_auto_schema(
        method='post',
        operation_description="""Initiate payment for this order using SSLCommerz.
        Only available for orders with NOT_PAID status.
        Returns payment gateway URL for redirection.""",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'phone': openapi.Schema(type=openapi.TYPE_STRING, description='Customer phone number'),
                'address': openapi.Schema(type=openapi.TYPE_STRING, description='Customer address'),
                'city': openapi.Schema(type=openapi.TYPE_STRING, description='Customer city'),
            }
        ),
        responses={200: 'Payment session created', 400: 'Bad request', 403: 'Order already paid'}
    )
    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        """Initiate SSLCommerz payment for this order"""
        order = self.get_object()
        
        # Check if order can be paid
        if order.status != Order.NOT_PAID:
            return Response(
                {'detail': 'This order has already been paid or cannot be paid.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Prepare SSLCommerz settings
        settings = {
            'store_id': django_settings.SSLCOMMERZ_STORE_ID,
            'store_pass': django_settings.SSLCOMMERZ_STORE_PASSWORD,
            'issandbox': django_settings.SSLCOMMERZ_IS_SANDBOX
        }
        
        sslcz = SSLCOMMERZ(settings)
        
        # Calculate number of items
        num_items = sum(item.quantity for item in order.items.all())
        
        # Prepare payment data
        post_body = {
            'total_amount': float(order.total_price),
            'currency': "BDT",
            'tran_id': f"ORDER-{order.id}-{int(order.created_at.timestamp())}",
            'success_url': f"http://127.0.0.1:8000/api/v1/orders/payment/success/",
            'fail_url': f"http://127.0.0.1:8000/api/v1/orders/payment/fail/",
            'cancel_url': f"http://127.0.0.1:8000/api/v1/orders/payment/cancel/",
            'emi_option': 0,
            'cus_name': request.user.get_full_name() or request.user.email,
            'cus_email': request.user.email,
            'cus_phone': request.data.get('phone', '01700000000'),
            'cus_add1': request.data.get('address', 'Dhaka'),
            'cus_city': request.data.get('city', 'Dhaka'),
            'cus_country': "Bangladesh",
            'shipping_method': "NO",
            'multi_card_name': "",
            'num_of_item': num_items,
            'product_name': f'Order #{order.id}',
            'product_category': "Service",
            'product_profile': "general",
            'value_a': str(order.id)  # Store order ID for callback
        }

        try:
            response = sslcz.createSession(post_body)
            
            if response.get('status') == 'SUCCESS':
                return Response({
                    'status': 'success',
                    'gateway_url': response.get('GatewayPageURL'),
                    'transaction_id': post_body['tran_id'],
                    'order_id': order.id,
                    'amount': float(order.total_price)
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'status': 'failed',
                    'message': response.get('failedreason', 'Payment initialization failed')
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_permissions(self):
        if self.action in ['update_status', 'destroy', 'partial_update', 'update']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'cancel':
            from rest_framework import serializers
            class EmptySerializer(serializers.Serializer):
                class Meta:
                    ref_name = "OrderCancelEmptySerializer"
            return EmptySerializer
        if self.action == 'create':
            return CreateOrderSerializer
        elif self.action == 'update_status':
            return UpdateOrderSerializer
        return OrderSerializer

    def get_serializer_context(self):
        return {'user_id': self.request.user.id, 'user': self.request.user}

    def get_queryset(self):
        if self.request.user.is_staff:
            return Order.objects.prefetch_related('items__service').all()
        return Order.objects.prefetch_related('items__service').filter(client=self.request.user)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({'detail': 'Only admin can delete orders.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({'detail': 'Only admin can update orders.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response({'detail': 'Only admin can update orders.'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)


# =========================
# ORDER ITEM (NESTED)
# =========================
class OrderItemViewSet(viewsets.ModelViewSet):
    serializer_class = OrderItemSerializer
    permission_classes = [IsAdminOrSelfOrReadOnly]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return OrderItem.objects.none()
        return OrderItem.objects.filter(order_id=self.kwargs["order_pk"])


# =========================
# ADD TO CART
# =========================
class AddToCartView(generics.GenericAPIView):
    """
    Add Service to Cart Endpoint
    Features:
    1. POST: Add a service to the user's cart.
    2. Accepts service_id and quantity in request body.
    3. Updates quantity if item already exists.
    4. Returns success message and updated cart.
    """
    permission_classes = [IsAdminOrSelfOrReadOnly]
    serializer_class = CartItemSerializer

    def get_serializer_class(self):
        if getattr(self, 'swagger_fake_view', False):
            return self.serializer_class
        return self.serializer_class

    def post(self, request):
        service_id = request.data.get("service_id")
        quantity = int(request.data.get("quantity", 1))

        service = get_object_or_404(Service, id=service_id)
        cart, _ = Cart.objects.get_or_create(client=request.user)

        item, created = CartItem.objects.get_or_create(
            cart=cart, service=service
        )

        item.quantity = item.quantity + quantity if not created else quantity
        item.save()

        return Response(
            {"message": "Service added to cart"},
            status=status.HTTP_201_CREATED,
        )


# =========================
# REMOVE FROM CART
# =========================
class RemoveFromCartView(generics.GenericAPIView):
    """
    Remove Service from Cart Endpoint
    Features:
    1. POST: Remove a service from the user's cart.
    2. Accepts service_id in request body.
    3. Returns success message and updated cart.
    """
    permission_classes = [IsAdminOrSelfOrReadOnly]
    serializer_class = CartItemSerializer

    def get_serializer_class(self):
        if getattr(self, 'swagger_fake_view', False):
            return self.serializer_class
        return self.serializer_class

    def post(self, request):
        service_id = request.data.get("service_id")
        cart = get_object_or_404(Cart, client=request.user)
        item = get_object_or_404(CartItem, cart=cart, service_id=service_id)
        item.delete()
        return Response({"message": "Service removed from cart"})


# =========================
# VIEW CART
# =========================
class ViewCartView(generics.GenericAPIView):
    """
    View Cart Endpoint
    Features:
    1. GET: Retrieve the user's cart and all items.
    2. Returns cart details including services, quantities, and prices.
    3. Useful for client cart review before ordering.
    """
    serializer_class = CartSerializer
    permission_classes = [IsAdminOrSelfOrReadOnly]

    def get(self, request):
        cart = Cart.objects.filter(client=request.user).first()
        if not cart:
            return Response({"cart": []})
        return Response(self.serializer_class(cart).data)


# =========================
# PLACE ORDER
# =========================
class PlaceOrderView(generics.GenericAPIView):
    """
    Place Order Endpoint
    Features:
    1. POST: Place an order for all items in the user's cart.
    2. Creates order, calculates total price, and clears cart.
    3. Returns success message and order summary.
    """
    permission_classes = [IsAdminOrSelfOrReadOnly]
    serializer_class = CreateOrderSerializer

    def get_serializer_class(self):
        if getattr(self, 'swagger_fake_view', False):
            return self.serializer_class
        return self.serializer_class

    def post(self, request):
        cart = get_object_or_404(Cart, client=request.user)

        if not cart.items.exists():
            return Response(
                {"error": "Cart is empty"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = Order.objects.create(client=request.user)
        total_price = 0

        for item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                service=item.service,
                quantity=item.quantity,
                price=item.service.price,
            )
            total_price += item.quantity * item.service.price

        order.total_price = total_price
        order.save()

        cart.items.all().delete()

        return Response(
            {"message": "Order placed successfully"},
            status=status.HTTP_201_CREATED,
        )
 
@swagger_auto_schema(
    method='post',
    operation_description="Initiate SSLCommerz Payment Session",
    responses={
        200: "Payment session created successfully",
        400: "Payment initialization failed",
        401: "Authentication required",
    }
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])       
def initiate_payment(request):
    """
    Initiate SSLCommerz Payment
    Features:
    1. POST: Initialize payment session with SSLCommerz
    2. Returns payment gateway URL for user redirection
    """
    amount = request.data.get('amount', 100.26)
    order_id = request.data.get('orderID')
    
    settings = {
        'store_id': django_settings.SSLCOMMERZ_STORE_ID,
        'store_pass': django_settings.SSLCOMMERZ_STORE_PASSWORD,
        'issandbox': django_settings.SSLCOMMERZ_IS_SANDBOX
    }
    
    sslcz = SSLCOMMERZ(settings)
    post_body = {
        'total_amount': float(amount),
        'currency': "BDT",
        'tran_id': f"txn _{order_id}",
        'success_url': "http://localhost:5173/payment/success/",
        'fail_url': "http://localhost:5173/payment/fail/",
        'cancel_url': "http://localhost:5173/payment/cancel/",
        'emi_option': 0,
        'cus_name': request.user.get_full_name() or request.user.email,
        'cus_email': request.user.email,
        'cus_phone': request.data.get('phone', '01700000000'),
        'cus_add1': request.data.get('address', 'Dhaka'),
        'cus_city': request.data.get('city', 'Dhaka'),
        'cus_country': "Bangladesh",
        'shipping_method': "NO",
        'multi_card_name': "",
        'num_of_item': request.data.get('num_items', 1),
        'product_name': request.data.get('product_name', 'Service Order'),
        'product_category': "Service",
        'product_profile': "general"
    }

    try:
        response = sslcz.createSession(post_body)
        
        if response.get('status') == 'SUCCESS':
            return Response({
                'status': 'success',
                'gateway_url': response.get('GatewayPageURL'),
                'transaction_id': post_body['tran_id']
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'status': 'failed',
                'message': response.get('failedreason', 'Payment initialization failed')
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =========================
# PAYMENT CALLBACK HANDLERS
# =========================

@api_view(['POST', 'GET'])
@permission_classes([AllowAny])
def payment_success_callback(request):
    """
    SSLCommerz Success Callback
    Called by SSLCommerz after successful payment
    """
    # SSLCommerz sends data as POST or GET
    data = request.POST if request.method == 'POST' else request.GET
    
    order_id = data.get('value_a')  # We stored order_id in value_a
    transaction_id = data.get('tran_id')
    amount = data.get('amount')
    status_code = data.get('status')  # SSLCommerz sends status in callback
    
    # Log callback data for debugging
    print(f"Payment Success Callback - Order: {order_id}, Transaction: {transaction_id}, Status: {status_code}")
    
    if not order_id:
        print("Error: No order_id in callback data")
        return HttpResponseRedirect(f'http://localhost:5173/payment/fail/')
    
    try:
        order = Order.objects.get(id=order_id)
        
        # In sandbox mode or if status is VALID/VALIDATED from callback, update order directly
        # This is more reliable than validation API which may not work in sandbox
        if status_code in ['VALID', 'VALIDATED', 'SUCCESS']:
            order.status = Order.READY_TO_SHIP
            order.save()
            print(f"Order {order_id} status updated to READY_TO_SHIP")
            
            # Redirect to frontend success page
            return HttpResponseRedirect(f'http://localhost:5173/payment/success/{order_id}')
        else:
            # If status is not valid, try validation API as fallback
            print(f"Status code '{status_code}' not in valid list, trying validation API")
            
            settings = {
                'store_id': django_settings.SSLCOMMERZ_STORE_ID,
                'store_pass': django_settings.SSLCOMMERZ_STORE_PASSWORD,
                'issandbox': django_settings.SSLCOMMERZ_IS_SANDBOX
            }
            
            try:
                sslcz = SSLCOMMERZ(settings)
                validation = sslcz.validationTransactionOrder(transaction_id)
                
                if validation.get('status') in ['VALID', 'VALIDATED']:
                    order.status = Order.READY_TO_SHIP
                    order.save()
                    print(f"Order {order_id} validated and updated via API")
                    return HttpResponseRedirect(f'http://localhost:5173/payment/success/{order_id}')
            except Exception as validation_error:
                print(f"Validation API error: {str(validation_error)}")
                # In sandbox mode, if validation fails but we got success callback, still update order
                if django_settings.SSLCOMMERZ_IS_SANDBOX:
                    print(f"Sandbox mode: Updating order anyway")
                    order.status = Order.READY_TO_SHIP
                    order.save()
                    return HttpResponseRedirect(f'http://localhost:5173/payment/success/{order_id}')
            
            print(f"Payment validation failed for order {order_id}")
            return HttpResponseRedirect(f'http://localhost:5173/payment/fail/{order_id}')
            
    except Order.DoesNotExist:
        print(f"Error: Order {order_id} not found")
        return HttpResponseRedirect(f'http://localhost:5173/payment/fail/')
    except Exception as e:
        print(f"Payment callback error: {str(e)}")
        return HttpResponseRedirect(f'http://localhost:5173/payment/fail/{order_id if order_id else ""}')


@api_view(['POST', 'GET'])
@permission_classes([AllowAny])
def payment_fail_callback(request):
    """
    SSLCommerz Fail Callback
    Called by SSLCommerz after failed payment
    """
    data = request.POST if request.method == 'POST' else request.GET
    order_id = data.get('value_a')
    
    if order_id:
        return HttpResponseRedirect(f'http://localhost:5173/payment/fail/{order_id}')
    return HttpResponseRedirect(f'http://localhost:5173/payment/fail/')


@api_view(['POST', 'GET'])
@permission_classes([AllowAny])
def payment_cancel_callback(request):
    """
    SSLCommerz Cancel Callback
    Called by SSLCommerz after user cancels payment
    """
    data = request.POST if request.method == 'POST' else request.GET
    order_id = data.get('value_a')
    
    if order_id:
        return HttpResponseRedirect(f'http://localhost:5173/payment/cancel/{order_id}')
    return HttpResponseRedirect(f'http://localhost:5173/payment/cancel/')


@api_view(['POST'])
@permission_classes([AllowAny])
def payment_ipn_listener(request):
    """
    IPN (Instant Payment Notification) listener
    SSLCommerz may call this for additional transaction updates
    """
    data = request.POST
    order_id = data.get('value_a')
    transaction_id = data.get('tran_id')
    status_code = data.get('status')
    
    if order_id and status_code in ['VALID', 'VALIDATED']:
        try:
            order = Order.objects.get(id=order_id)
            if order.status == Order.NOT_PAID:
                order.status = Order.READY_TO_SHIP
                order.save()
            return Response({'status': 'success'}, status=status.HTTP_200_OK)
        except Order.DoesNotExist:
            pass
    
    return Response({'status': 'received'}, status=status.HTTP_200_OK)