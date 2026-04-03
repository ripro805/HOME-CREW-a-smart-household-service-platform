from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.http import JsonResponse
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from accounts.models import User
from orders.models import Order
from services.models import Service

from .emails import send_contact_message_to_admin
from .serializers import ContactMessageSerializer

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
        "support-conversations": request.build_absolute_uri(reverse('support-conversation-list')),
        "assistant-chat": request.build_absolute_uri(reverse('assistant-chat')),
    }
    return JsonResponse({
        "message": "Welcome to the HouseHoldService API!",
        "links": api_links
    })

@api_view(['GET'])
@permission_classes([IsAdminUser])
def analytics_dashboard(request):
    """Provide analytics data for admin dashboard"""
    
    # Get date range (last 30 days)
    end_date = timezone.now()
    start_date = end_date - timedelta(days=30)
    
    # Revenue over time (last 30 days)
    revenue_data = Order.objects.filter(
        created_at__gte=start_date,
        status__in=[Order.READY_TO_SHIP, Order.SHIPPED, Order.DELIVERED]
    ).annotate(
        date=TruncDate('created_at')
    ).values('date').annotate(
        revenue=Sum('total_price')
    ).order_by('date')
    
    # Orders over time (last 30 days)
    orders_data = Order.objects.filter(
        created_at__gte=start_date
    ).annotate(
        date=TruncDate('created_at')
    ).values('date').annotate(
        count=Count('id')
    ).order_by('date')
    
    # Order status distribution
    status_distribution = Order.objects.values('status').annotate(
        count=Count('id')
    ).order_by('status')
    
    # Top services by orders
    top_services = Service.objects.annotate(
        order_count=Count('orderitem')
    ).order_by('-order_count')[:5].values('name', 'order_count')
    
    # Summary statistics
    total_revenue = Order.objects.filter(
        status__in=[Order.READY_TO_SHIP, Order.SHIPPED, Order.DELIVERED]
    ).aggregate(total=Sum('total_price'))['total'] or 0
    
    total_orders = Order.objects.count()
    total_clients = User.objects.filter(role='client').count()
    total_services = Service.objects.count()
    
    # Recent revenue (last 7 days)
    recent_revenue = Order.objects.filter(
        created_at__gte=end_date - timedelta(days=7),
        status__in=[Order.READY_TO_SHIP, Order.SHIPPED, Order.DELIVERED]
    ).aggregate(total=Sum('total_price'))['total'] or 0
    
    # Previous period revenue (8-14 days ago)
    previous_revenue = Order.objects.filter(
        created_at__gte=end_date - timedelta(days=14),
        created_at__lt=end_date - timedelta(days=7),
        status__in=[Order.READY_TO_SHIP, Order.SHIPPED, Order.DELIVERED]
    ).aggregate(total=Sum('total_price'))['total'] or 0
    
    # Calculate revenue change percentage
    revenue_change = 0
    if previous_revenue > 0:
        revenue_change = ((recent_revenue - previous_revenue) / previous_revenue) * 100
    
    return JsonResponse({
        'revenue_over_time': list(revenue_data),
        'orders_over_time': list(orders_data),
        'status_distribution': list(status_distribution),
        'top_services': list(top_services),
        'summary': {
            'total_revenue': float(total_revenue),
            'total_orders': total_orders,
            'total_clients': total_clients,
            'total_services': total_services,
            'recent_revenue': float(recent_revenue),
            'revenue_change_percentage': round(revenue_change, 2)
        }
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def contact_message(request):
    serializer = ContactMessageSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    send_contact_message_to_admin(serializer.validated_data)

    return Response(
        {'detail': 'Your message has been sent successfully.'},
        status=status.HTTP_200_OK,
    )
