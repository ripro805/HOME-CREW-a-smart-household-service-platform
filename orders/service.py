from django.db import transaction
from django.db.models import Count
from django.utils import timezone
from .models import Cart, CartItem, Order, OrderItem
from rest_framework.exceptions import PermissionDenied, ValidationError
from . import emails as order_emails
import re
from accounts.models import User
from services.models import Service

class OrderService:
    @staticmethod
    def _tokenize_address(value):
        text = (value or '').lower().strip()
        if not text:
            return set()
        return set(token for token in re.split(r'[^a-z0-9]+', text) if len(token) > 1)

    @staticmethod
    def _pick_technician_by_location(address_text):
        source_tokens = OrderService._tokenize_address(address_text)
        if not source_tokens:
            return None

        candidates = (
            User.objects.filter(role='technician', is_active=True)
            .exclude(address__isnull=True)
            .exclude(address__exact='')
            .annotate(assigned_order_count=Count('assigned_orders'))
        )

        best = None
        best_score = -1
        best_load = None
        source_text = (address_text or '').lower()

        for tech in candidates:
            tech_addr = (tech.address or '').lower()
            tech_tokens = OrderService._tokenize_address(tech_addr)
            overlap = len(source_tokens.intersection(tech_tokens))

            # Bonus score when one address text contains the other (same area hints)
            if tech_addr and (tech_addr in source_text or source_text in tech_addr):
                overlap += 3

            if overlap <= 0:
                continue

            current_load = getattr(tech, 'assigned_order_count', 0)
            if overlap > best_score or (overlap == best_score and (best_load is None or current_load < best_load)):
                best = tech
                best_score = overlap
                best_load = current_load

        return best

    @staticmethod
    def _pick_technician_from_services(service_ids):
        if not service_ids:
            return None

        technicians = (
            User.objects.filter(
                role='technician',
                is_active=True,
                assigned_services__id__in=service_ids,
            )
            .annotate(assigned_order_count=Count('assigned_orders'))
            .distinct()
            .order_by('assigned_order_count', 'id')
        )
        return technicians.first()

    @staticmethod
    def _pick_any_active_technician():
        return (
            User.objects.filter(role='technician', is_active=True)
            .annotate(assigned_order_count=Count('assigned_orders'))
            .order_by('assigned_order_count', 'id')
            .first()
        )

    @staticmethod
    def auto_assign_technician(order, service_ids=None):
        if order.assigned_technician_id:
            return order

        address_text = (order.service_address or '').strip() or (order.client.address or '').strip()
        technician = OrderService._pick_technician_by_location(address_text)
        if not technician:
            technician = OrderService._pick_technician_from_services(service_ids or [])
        if not technician:
            technician = OrderService._pick_any_active_technician()
        if not technician:
            return order

        order.assigned_technician = technician
        order.assigned_at = timezone.now()
        order.save(update_fields=['assigned_technician', 'assigned_at'])
        return order

    @staticmethod
    def create_order(user_id, cart_id, contact_name='', contact_phone='', service_address='', preferred_date=''):
        with transaction.atomic():
            cart = Cart.objects.select_related('client').get(pk=cart_id)
            if cart.client.id != user_id:
                raise PermissionDenied('You can only order from your own cart.')
            cart_items = cart.items.select_related('service').all()
            if not cart_items:
                raise ValidationError('Cart is empty.')

            total_price = sum([item.service.price * item.quantity for item in cart_items])
            resolved_contact_name = (contact_name or '').strip() or (cart.client.get_full_name() or '')
            resolved_contact_phone = (contact_phone or '').strip() or (cart.client.phone_number or '')
            resolved_service_address = (service_address or '').strip() or (cart.client.address or '')

            order = Order.objects.create(
                client=cart.client,
                total_price=total_price,
                contact_name=resolved_contact_name,
                contact_phone=resolved_contact_phone,
                service_address=resolved_service_address,
                preferred_date=(preferred_date or '').strip(),
            )

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
            ordered_service_ids = [item.service_id for item in cart_items]
            OrderService.auto_assign_technician(order, service_ids=ordered_service_ids)
            cart.items.all().delete()
            return order

    @staticmethod
    def cancel_order(order, user):
        old_status = order.status
        if user.is_staff:
            order.status = Order.CANCELLED
            order.save()
            order_emails.send_order_status_email(order, old_status)
            return order
        if order.client != user:
            raise PermissionDenied({"detail": "You can only cancel your own order"})
        if order.status == Order.DELIVERED:
            raise ValidationError({"detail": "You can not cancel an order"})
        order.status = Order.CANCELLED
        order.save()
        order_emails.send_order_status_email(order, old_status)
        return order

# Transaction Demo (for documentation)
"""
Transaction Example:
A       B
100     0
        400

This demonstrates atomicity: either all changes succeed, or none do.
"""
