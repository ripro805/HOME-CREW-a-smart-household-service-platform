from django.http import JsonResponse
from rest_framework.decorators import api_view
from django.urls import reverse

@api_view(['GET'])
def api_home(request):
    # Build useful API root links
    api_links = {
        "users": request.build_absolute_uri(reverse('user-list')),
        "services": request.build_absolute_uri(reverse('service-list')),
        "categories": request.build_absolute_uri(reverse('category-list')),
        "orders": request.build_absolute_uri(reverse('order-list')),
        "reviews": request.build_absolute_uri(reverse('service-reviews-list', kwargs={"service_pk": 1})),
        "service-images": request.build_absolute_uri(reverse('service-images-list', kwargs={"service_pk": 1})),
        "carts": request.build_absolute_uri(reverse('cart-list')),
        "cart-items": request.build_absolute_uri(reverse('cart-items-list', kwargs={"cart_pk": 1})),
    }
    return JsonResponse({
        "message": "Welcome to the HouseHoldService API!",
        "links": api_links
    })
