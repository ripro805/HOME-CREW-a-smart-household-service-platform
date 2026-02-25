
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, AddToCartView, RemoveFromCartView, ViewCartView, PlaceOrderView

router = DefaultRouter()
router.register(r'', OrderViewSet, basename='order')

urlpatterns = [
    path('cart/add/', AddToCartView.as_view(), name='add-to-cart'),
    path('cart/remove/', RemoveFromCartView.as_view(), name='remove-from-cart'),
    path('cart/', ViewCartView.as_view(), name='view-cart'),
    path('place-order/', PlaceOrderView.as_view(), name='place-order'),
    path('', include(router.urls)),
]
