
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
    service_id = serializers.IntegerField()

    class Meta:
        model = CartItem
        fields = ['id', 'service_id', 'quantity']

    def validate_service_id(self, value):
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
class CartItemSerializer(serializers.ModelSerializer):
    service = serializers.StringRelatedField()
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

    class Meta:
        model = Cart
        fields = ['id', 'client', 'items', 'created_at']


# =========================
# ORDER ITEM SERIALIZER
# =========================
class OrderItemSerializer(serializers.ModelSerializer):
    service = serializers.StringRelatedField()

    class Meta:
        model = OrderItem
        fields = ['id', 'service', 'quantity']


# =========================
# ORDER SERIALIZER
# =========================
class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(source='orderitem_set', many=True, read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'client', 'status', 'items', 'created_at']