
from rest_framework import serializers
from .models import Cart, CartItem, Order, OrderItem, Service
from orders.service import OrderService
# =========================
# UPDATE ORDER SERIALIZER (ADMIN ONLY)
# =========================
class UpdateOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['status']

class CreateOrderSerializer(serializers.Serializer):
    cart_id = serializers.IntegerField()

    def validate_cart_id(self, cart_id):
        if not Cart.objects.filter(pk=cart_id).exists():
            raise serializers.ValidationError('No cart found with this id')
        if not CartItem.objects.filter(cart_id=cart_id).exists():
            raise serializers.ValidationError('Cart is empty')
        return cart_id

    def create(self, validated_data):
        user_id = self.context['user_id']
        cart_id = validated_data['cart_id']
        try:
            order = OrderService.create_order(user_id=user_id, cart_id=cart_id)
            return order
        except ValueError as e:
            raise serializers.ValidationError(str(e))

    def to_representation(self, instance):
        return OrderSerializer(instance).data


# =========================
# ADD ITEM TO CART
# =========================
class AddCartItemSerializer(serializers.ModelSerializer):
    service = serializers.IntegerField(source='service_id', write_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'service', 'quantity']

    def validate_service(self, value):
        if not Service.objects.filter(id=value).exists():
            raise serializers.ValidationError("Service does not exist")
        return value

    def save(self, **kwargs):
        cart_id = self.context.get('cart_id')
        service_id = self.validated_data['service_id']
        quantity = self.validated_data['quantity']

        cart_item, created = CartItem.objects.get_or_create(
            cart_id=cart_id,
            service_id=service_id,
            defaults={'quantity': quantity}
        )

        if not created:
            cart_item.quantity += quantity
            cart_item.save()

        self.instance = cart_item
        return self.instance


# =========================
# UPDATE CART ITEM
# =========================
class UpdateCartItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = ['quantity']


# =========================
# CART ITEM VIEW SERIALIZER
# =========================
class SimpleServiceSerializer(serializers.ModelSerializer):
    """Simple service serializer for cart items to avoid circular imports"""
    images = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    
    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'price', 'avg_rating', 'category', 'images']
    
    def get_images(self, obj):
        from services.models import ServiceImage
        images = ServiceImage.objects.filter(service=obj)[:3]
        result = []
        for img in images:
            raw = str(img.image) if img.image else ''
            if raw.startswith('http://') or raw.startswith('https://'):
                url = raw
            elif img.image:
                try:
                    url = img.image.url
                    if not url.startswith('http'):
                        url = raw
                except Exception:
                    url = raw
            else:
                url = ''
            result.append({'id': img.id, 'image': url})
        return result
    
    def get_category(self, obj):
        if obj.category:
            return {'id': obj.category.id, 'name': obj.category.name}
        return None

class CartItemSerializer(serializers.ModelSerializer):
    service = SimpleServiceSerializer(read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'service', 'quantity', 'total_price']

    def get_total_price(self, obj):
        return obj.quantity * obj.service.price


# =========================
# CART SERIALIZER
# =========================
class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    client = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'client', 'items', 'created_at']


# =========================
# ORDER ITEM SERIALIZER
# =========================
class OrderItemSerializer(serializers.ModelSerializer):
    service = SimpleServiceSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'service', 'quantity']


# =========================
# ORDER SERIALIZER
# =========================
class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    client_email = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    can_pay = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ['id', 'client', 'client_email', 'client_name', 'status', 'items', 'total_price', 'created_at', 'payment_status', 'can_pay']

    def get_client_email(self, obj):
        return obj.client.email if obj.client else None

    def get_client_name(self, obj):
        if obj.client:
            return obj.client.get_full_name() or obj.client.email
        return None
    
    def get_payment_status(self, obj):
        """Return human-readable payment status"""
        if obj.status == Order.NOT_PAID:
            return 'Pending Payment'
        else:
            return 'Paid'
    
    def get_can_pay(self, obj):
        """Return True if order can be paid (status is NOT_PAID)"""
        return obj.status == Order.NOT_PAID