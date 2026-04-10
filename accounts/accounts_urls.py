
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, RegisterView, UserLoginView, profile, service_history, client_ai_insights

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('profile/', profile, name='profile'),
    path('service-history/', service_history, name='service-history'),
    path('client-ai-insights/', client_ai_insights, name='client-ai-insights'),
    # Add promote/admin endpoint if needed
    path('', include(router.urls)),
]
