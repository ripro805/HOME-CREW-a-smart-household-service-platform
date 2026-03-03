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
from django.http import HttpResponseRedirect
from django.views.generic import RedirectView


def _frontend_url(request=None):
    from django.conf import settings as s
    # If the link landed on localhost (dev machine), always go to React dev server
    if request and request.get_host().startswith('localhost'):
        return 'http://localhost:5173'
    protocol = s.DJOSER.get('PROTOCOL', 'http')
    domain   = s.DJOSER.get('DOMAIN', 'localhost:5173')
    return f'{protocol}://{domain}'


def activate_redirect(request, uid, token):
    return HttpResponseRedirect(f'{_frontend_url(request)}/activate/{uid}/{token}')


def password_reset_redirect(request, uid, token):
    return HttpResponseRedirect(f'{_frontend_url(request)}/password/reset/confirm/{uid}/{token}')

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
    path("", RedirectView.as_view(url="/api/v1/", permanent=False)),
    path("admin/", admin.site.urls),
    # Catch activation & password-reset links that point to backend (old emails)
    # and redirect them to the React frontend
    path("activate/<str:uid>/<str:token>", activate_redirect),
    path("password/reset/confirm/<str:uid>/<str:token>", password_reset_redirect),
    path("api/v1/", include("api.urls")),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
   
    path("__debug__", include(debug_toolbar.urls)),
]
