

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServiceViewSet, AddReviewView, ServicesSortedByRatingView, technician_reviews

router = DefaultRouter()
router.register(r'', ServiceViewSet, basename='service')

urlpatterns = [
    path('sorted/', ServicesSortedByRatingView.as_view(), name='services-sorted'),
    path('technician/reviews/', technician_reviews, name='technician-reviews'),
    path('<int:service_id>/review/', AddReviewView.as_view(), name='add-review'),
    path('', include(router.urls)),
]
