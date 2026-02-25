from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.generics import get_object_or_404
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from api.permissions import IsAdminOrSelfOrReadOnly
from .models import Cart, CartItem, Order, OrderItem, Service
from .service import OrderService
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
    permission_classes = [IsAdminOrSelfOrReadOnly]

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

        CreateOrderSerializer,
    def get_serializer_context(self):
        if getattr(self, 'swagger_fake_view', False):
            return {}
        return {"cart_id": self.kwargs["cart_pk"]}


# =========================
# DELETE CART
# =========================
        http_method_names = ['get', 'post', 'delete', 'patch', 'head', 'options']
        permission_classes = [IsAdminOrSelfOrReadOnly]
    permission_classes = [IsAdminOrSelfOrReadOnly]

    def delete(self, request, *args, **kwargs):
        cart = get_object_or_404(Cart, client=request.user)
        cart.delete()
        return Response(
            {"message": "Cart deleted successfully"},
            status=status.HTTP_204_NO_CONTENT,
        )


# =========================
# ORDER VIEWSET
# =========================
class OrderViewSet(viewsets.ModelViewSet):
    from drf_yasg.utils import swagger_auto_schema

    @swagger_auto_schema(operation_description="""
    Order Management Endpoint
    Features:
    1. Admins can update/delete any order; clients can create/view their own.
    2. Supports order creation, status update, cancellation, and deletion.
    3. Prevents cancellation of delivered orders.
    4. Returns order details including items, status, and timestamps.
    """)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(operation_description="""
    Retrieve a single order by ID.
    Features:
    1. Returns all details for a specific order.
    2. Includes items, status, timestamps, and client info.
    """)
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @swagger_auto_schema(operation_description="""
    Create a new order (client only).
    Features:
    1. Accepts cart items in request body.
    2. Returns created order object.
    """)
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @swagger_auto_schema(operation_description="""
    Update an existing order (admin only).
    Features:
    1. Accepts updated fields in request body.
    2. Returns updated order object.
    """)
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @swagger_auto_schema(operation_description="""
    Delete an order (admin only).
    Features:
    1. Removes order from system.
    2. Returns status 204 on success.
    """)
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    http_method_names = ['get', 'post', 'delete', 'patch', 'head', 'options']

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status == order.DELIVERED:
            return Response({'detail': 'You can not cancel an order'}, status=status.HTTP_400_BAD_REQUEST)
        OrderService.cancel_order(order=order, user=request.user)
        return Response({'status': 'Order canceled'})

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        order = self.get_object()
        serializer = UpdateOrderSerializer(order, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'status': f"Order status updated to {request.data['status']}"})

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