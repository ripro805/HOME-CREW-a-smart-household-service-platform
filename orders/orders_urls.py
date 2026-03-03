
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrderViewSet, AddToCartView, RemoveFromCartView, ViewCartView, 
    PlaceOrderView, initiate_payment, payment_success_callback, 
    payment_fail_callback, payment_cancel_callback, payment_ipn_listener
)

router = DefaultRouter()
router.register(r'', OrderViewSet, basename='order')

urlpatterns = [
    path('cart/add/', AddToCartView.as_view(), name='add-to-cart'),
    path('cart/remove/', RemoveFromCartView.as_view(), name='remove-from-cart'),
    path('cart/', ViewCartView.as_view(), name='view-cart'),
    path('place-order/', PlaceOrderView.as_view(), name='place-order'),
    path('initiate-payment/', initiate_payment, name='initiate-payment'),
    path('payment/success/', payment_success_callback, name='payment-success-callback'),
    path('payment/fail/', payment_fail_callback, name='payment-fail-callback'),
    path('payment/cancel/', payment_cancel_callback, name='payment-cancel-callback'),
    path('payment/ipn/', payment_ipn_listener, name='payment-ipn-listener'),
    path('', include(router.urls)),
]
