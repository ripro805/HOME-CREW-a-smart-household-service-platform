
from rest_framework import serializers
from .models import Cart, CartItem, Order, OrderItem, Service
from orders.service import OrderService
from accounts.models import User
from services.models import Review


class TechnicianSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'phone_number']


class AssignTechnicianSerializer(serializers.Serializer):
    technician_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        tech_id = attrs.get('technician_id', None)
        if tech_id in (None, ''):
            attrs['technician'] = None
            return attrs

        technician = User.objects.filter(id=tech_id, role='technician', is_active=True).first()
        if not technician:
            raise serializers.ValidationError({'technician_id': 'Valid active technician not found.'})
        attrs['technician'] = technician
        return attrs
# =========================
# UPDATE ORDER SERIALIZER (ADMIN ONLY)
# =========================
class UpdateOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['status']

class CreateOrderSerializer(serializers.Serializer):
    cart_id = serializers.IntegerField()
    contact_name = serializers.CharField(required=False, allow_blank=True)
    contact_phone = serializers.CharField(required=False, allow_blank=True)
    service_address = serializers.CharField(required=False, allow_blank=True)
    preferred_date = serializers.CharField(required=False, allow_blank=True)

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
            order = OrderService.create_order(
                user_id=user_id,
                cart_id=cart_id,
                contact_name=validated_data.get('contact_name', ''),
                contact_phone=validated_data.get('contact_phone', ''),
                service_address=validated_data.get('service_address', ''),
                preferred_date=validated_data.get('preferred_date', ''),
            )
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
        prefetched = getattr(obj, '_prefetched_objects_cache', {}).get('images')
        if prefetched is not None:
            images = prefetched[:3]
        else:
            from services.models import ServiceImage
            images = ServiceImage.objects.filter(service=obj).only('id', 'image_file', 'image_url')[:3]
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
    assigned_technician = TechnicianSummarySerializer(read_only=True)
    reviewable_services = serializers.SerializerMethodField()
    reviewed_service_ids = serializers.SerializerMethodField()
    has_pending_review = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id',
            'client',
            'client_email',
            'client_name',
            'contact_name',
            'contact_phone',
            'service_address',
            'preferred_date',
            'status',
            'items',
            'total_price',
            'created_at',
            'payment_status',
            'can_pay',
            'reviewable_services',
            'reviewed_service_ids',
            'has_pending_review',
            'assigned_technician',
            'assigned_at',
            'technician_accepted_at',
        ]

    def get_client_email(self, obj):
        return obj.client.email if obj.client else None

    def get_client_name(self, obj):
        if obj.contact_name:
            return obj.contact_name
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

    def _get_request_user(self):
        request = self.context.get('request')
        return getattr(request, 'user', None)

    def _review_ids_cache(self):
        cache = self.context.get('_reviewed_service_ids_cache')
        if cache is None:
            cache = {}
            self.context['_reviewed_service_ids_cache'] = cache
        return cache

    def _unique_items_cache(self):
        cache = self.context.get('_unique_order_items_cache')
        if cache is None:
            cache = {}
            self.context['_unique_order_items_cache'] = cache
        return cache

    def _get_unique_items(self, obj):
        cached_items = self._unique_items_cache().get(obj.id)
        if cached_items is not None:
            return cached_items

        unique = {}
        for item in obj.items.all():
            if item.service_id not in unique:
                unique[item.service_id] = item
        items = list(unique.values())
        self._unique_items_cache()[obj.id] = items
        return items

    def get_reviewed_service_ids(self, obj):
        cached_review_ids = self._review_ids_cache().get(obj.id)
        if cached_review_ids is not None:
            return cached_review_ids

        user = self._get_request_user()
        if not user or not user.is_authenticated or getattr(user, 'role', None) != 'client':
            return []
        if obj.client_id != user.id:
            return []

        service_ids = [item.service_id for item in self._get_unique_items(obj)]
        if not service_ids:
            return []

        reviewed_ids = list(
            Review.objects.filter(client=user, service_id__in=service_ids)
            .values_list('service_id', flat=True)
            .distinct()
        )
        self._review_ids_cache()[obj.id] = reviewed_ids
        return reviewed_ids

    def get_reviewable_services(self, obj):
        reviewed_ids = set(self.get_reviewed_service_ids(obj))
        rows = []
        for item in self._get_unique_items(obj):
            rows.append(
                {
                    'id': item.service_id,
                    'name': item.service.name,
                    'reviewed': item.service_id in reviewed_ids,
                }
            )
        return rows

    def get_has_pending_review(self, obj):
        if obj.status != Order.DELIVERED:
            return False
        reviewable = self.get_reviewable_services(obj)
        return any(not row['reviewed'] for row in reviewable)