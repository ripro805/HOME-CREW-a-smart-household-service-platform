from django.db import transaction
from .models import Cart, CartItem, Order, OrderItem
from rest_framework.exceptions import PermissionDenied, ValidationError

class OrderService:
    @staticmethod
    def create_order(user_id, cart_id):
        with transaction.atomic():
            cart = Cart.objects.select_related('client').get(pk=cart_id)
            if cart.client.id != user_id:
                raise PermissionDenied('You can only order from your own cart.')
            cart_items = cart.items.select_related('service').all()
            if not cart_items:
                raise ValidationError('Cart is empty.')

            total_price = sum([item.service.price * item.quantity for item in cart_items])
            order = Order.objects.create(client=cart.client, total_price=total_price)

            order_items = [
                OrderItem(
                    order=order,
                    service=item.service,
                    price=item.service.price,
                    quantity=item.quantity
                )
                for item in cart_items
            ]
            OrderItem.objects.bulk_create(order_items)
            cart.items.all().delete()
            return order

    @staticmethod
    def cancel_order(order, user):
        if user.is_staff:
            order.status = Order.CANCELLED
            order.save()
            return order
        if order.client != user:
            raise PermissionDenied({"detail": "You can only cancel your own order"})
        if order.status == Order.DELIVERED:
            raise ValidationError({"detail": "You can not cancel an order"})
        order.status = Order.CANCELLED
        order.save()
        return order

# Transaction Demo (for documentation)
"""
Transaction Example:
A       B
100     0
        400

This demonstrates atomicity: either all changes succeed, or none do.
"""
