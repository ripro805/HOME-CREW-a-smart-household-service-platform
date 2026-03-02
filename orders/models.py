from django.db import models
from accounts.models import User
from services.models import Service
import uuid


# =========================
# CART MODEL
# =========================
class Cart(models.Model):
    id = models.AutoField(primary_key=True)
    client = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="cart"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart of {self.client.username}"


# =========================
# CART ITEM MODEL
# =========================
class CartItem(models.Model):
    id = models.AutoField(primary_key=True)
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items"
    )
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('cart', 'service')

    def __str__(self):
        return f"{self.quantity} x {self.service.name}"


# =========================
# ORDER MODEL
# =========================
class Order(models.Model):
    NOT_PAID = 'NOT_PAID'
    READY_TO_SHIP = 'READY_TO_SHIP'
    SHIPPED = 'SHIPPED'
    DELIVERED = 'DELIVERED'
    CANCELLED = 'CANCELLED'

    STATUS_CHOICES = [
        (NOT_PAID, 'Not Paid'),
        (READY_TO_SHIP, 'Ready to Ship'),
        (SHIPPED, 'Shipped'),
        (DELIVERED, 'Delivered'),
        (CANCELLED, 'Cancelled'),
    ]

    id = models.AutoField(primary_key=True)
    client = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="orders"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=NOT_PAID
    )
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order {self.id} by {self.client.username}"


# =========================
# ORDER ITEM MODEL
# =========================
class OrderItem(models.Model):
    id = models.AutoField(primary_key=True)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items"
    )
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        # lock service price at order time
        if not self.price:
            self.price = self.service.price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity} x {self.service.name}"