from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from accounts.views import UserViewSet
from services.views import ServiceViewSet, ReviewViewSet, ServiceCategoryViewSet, ServiceImageViewSet, AdminReviewViewSet
from orders.views import OrderViewSet, OrderItemViewSet, CartItemViewSet, CartViewSet
from django.conf import settings
from django.conf.urls.static import static

# Main router
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'services', ServiceViewSet, basename='service')
router.register('categories', ServiceCategoryViewSet, basename='category')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'carts', CartViewSet, basename='cart')
router.register(r'reviews', AdminReviewViewSet, basename='admin-review')

# Nested routers
orders_router = NestedDefaultRouter(router, r'orders', lookup='order')
orders_router.register(r'items', OrderItemViewSet, basename='order-items')

services_router = NestedDefaultRouter(router, r'services', lookup='service')
services_router.register(r'reviews', ReviewViewSet, basename='service-reviews')
services_router.register(r'images', ServiceImageViewSet, basename='service-images')

cart_router = NestedDefaultRouter(router, r'carts', lookup='cart')
cart_router.register(r'items', CartItemViewSet, basename='cart-items')

urlpatterns = [
    # Include app-level custom endpoints BEFORE router to avoid conflicts
    path("orders/", include("orders.orders_urls")),
    path("accounts/", include("accounts.accounts_urls")),
    path("services/", include("services.services_urls")),
    path("contact/", views.contact_message, name="contact-message"),
    path("auth/", include("djoser.urls")),
    path("auth/", include("djoser.urls.jwt")),
    path("analytics/", views.analytics_dashboard, name="analytics-dashboard"),
    # Router endpoints (catch-all patterns)
    path('', include(router.urls)),
    path('', include(orders_router.urls)),
    path('', include(services_router.urls)),
    path('', include(cart_router.urls)),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
