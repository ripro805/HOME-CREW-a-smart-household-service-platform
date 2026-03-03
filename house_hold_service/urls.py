"""
URL configuration for house_hold_service project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""





from django.contrib import admin
from django.urls import path, include
import debug_toolbar
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from django.conf import settings
from django.views.generic import TemplateView

schema_view = get_schema_view(
    openapi.Info(
        title="HOME_CREW-a-smart-household-service-platform API",
        default_version='v1',
        description="API documentation for the HouseHoldService platform, providing endpoints for user management, service listings, reviews, orders, and cart operations.",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="contact@homecrew.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
    # url='http://127.0.0.1:8000/api/v1/',
    # urlconf='api.urls',
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("api.urls")),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path("__debug__", include(debug_toolbar.urls)),
    # SPA catch-all — serves React's index.html for every non-API route
    # This makes payment/success/39, activate/uid/token, etc. all work
    # because React Router handles them client-side.
    path('', TemplateView.as_view(template_name='index.html')),
    path('<path:path>', TemplateView.as_view(template_name='index.html')),
]
