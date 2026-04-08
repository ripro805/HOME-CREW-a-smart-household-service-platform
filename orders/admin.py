from django.contrib import admin
from .models import Order, OrderItem, Cart, CartItem


# =========================
# ORDER ADMIN
# =========================
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "client", "assigned_technician", "status", "total_price", "created_at")
    list_filter = ("status", "created_at")
    search_fields = (
        "id",
        "client__username",
        "client__email",
    )
    readonly_fields = ("id", "total_price", "created_at")
    list_select_related = ("client", "assigned_technician")
    ordering = ("-created_at",)


# =========================
# ORDER ITEM ADMIN
# =========================
@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("order", "service", "quantity", "price")
    list_filter = ("service",)
    search_fields = (
        "order__id",
        "order__client__username",
        "service__name",
    )
    readonly_fields = ("id",)
    list_select_related = ("order", "service")
    
    # Provide a callable for 'price' so admin list_display validation succeeds
    def price(self, obj):
        # Safely return the price if present (some DB rows may not have it yet)
        return getattr(obj, "price", None)


# =========================
# CART ADMIN
# =========================
@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("id", "client", "created_at")
    search_fields = (
        "id",
        "client__username",
        "client__email",
    )
    list_filter = ("created_at",)
    readonly_fields = ("id", "created_at")
    list_select_related = ("client",)


# =========================
# CART ITEM ADMIN
# =========================
@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ("cart", "service", "quantity")
    list_filter = ("service",)
    search_fields = (
        "cart__id",
        "cart__client__username",
        "service__name",
    )
    readonly_fields = ("id",)
    list_select_related = ("cart", "service")