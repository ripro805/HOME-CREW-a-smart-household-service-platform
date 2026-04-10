from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.http import JsonResponse
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from accounts.models import User
from orders.models import Order, OrderItem
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
    """Provide analytics data for admin dashboard."""

    def _coerce_days(raw_value):
        try:
            days = int(raw_value)
        except (TypeError, ValueError):
            days = 30
        return days if days in (7, 30, 90, 180, 365) else 30

    def _safe_pct(current, previous):
        if previous <= 0:
            return 100.0 if current > 0 else 0.0
        return ((current - previous) / previous) * 100

    period_days = _coerce_days(request.query_params.get('days'))
    end_date = timezone.now()
    start_date = end_date - timedelta(days=period_days)
    previous_start_date = start_date - timedelta(days=period_days)

    revenue_statuses = [Order.READY_TO_SHIP, Order.SHIPPED, Order.DELIVERED]

    period_orders = Order.objects.filter(created_at__gte=start_date)
    previous_period_orders = Order.objects.filter(
        created_at__gte=previous_start_date,
        created_at__lt=start_date,
    )

    period_revenue_qs = period_orders.filter(status__in=revenue_statuses)
    previous_period_revenue_qs = previous_period_orders.filter(status__in=revenue_statuses)

    revenue_over_time = (
        period_revenue_qs
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(revenue=Sum('total_price'))
        .order_by('date')
    )

    orders_over_time = (
        period_orders
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(count=Count('id'))
        .order_by('date')
    )

    status_distribution = (
        period_orders
        .values('status')
        .annotate(count=Count('id'))
        .order_by('status')
    )

    top_services_qs = (
        OrderItem.objects
        .filter(order__created_at__gte=start_date)
        .values('service__name')
        .annotate(
            order_count=Count('order_id', distinct=True),
            total_quantity=Sum('quantity'),
            revenue=Sum('price'),
        )
        .order_by('-order_count', '-total_quantity')[:5]
    )

    top_categories_qs = (
        OrderItem.objects
        .filter(order__created_at__gte=start_date)
        .values('service__category__name')
        .annotate(
            order_count=Count('order_id', distinct=True),
            total_quantity=Sum('quantity'),
        )
        .order_by('-order_count', '-total_quantity')[:5]
    )

    top_technicians_qs = (
        User.objects
        .filter(role='technician')
        .annotate(
            assigned_jobs=Count('assigned_orders', filter=Q(assigned_orders__created_at__gte=start_date), distinct=True),
            completed_jobs=Count(
                'assigned_orders',
                filter=Q(
                    assigned_orders__created_at__gte=start_date,
                    assigned_orders__status=Order.DELIVERED,
                ),
                distinct=True,
            ),
            generated_revenue=Sum(
                'assigned_orders__total_price',
                filter=Q(
                    assigned_orders__created_at__gte=start_date,
                    assigned_orders__status__in=revenue_statuses,
                ),
            ),
        )
        .values('id', 'first_name', 'last_name', 'email', 'assigned_jobs', 'completed_jobs', 'generated_revenue')
        .order_by('-completed_jobs', '-generated_revenue')[:5]
    )

    period_revenue = period_revenue_qs.aggregate(total=Sum('total_price'))['total'] or 0
    previous_period_revenue = previous_period_revenue_qs.aggregate(total=Sum('total_price'))['total'] or 0
    period_orders_count = period_orders.count()
    previous_period_orders_count = previous_period_orders.count()
    cancelled_count = period_orders.filter(status=Order.CANCELLED).count()
    completed_count = period_orders.filter(status=Order.DELIVERED).count()

    avg_order_value = float(period_revenue) / period_orders_count if period_orders_count else 0.0
    cancellation_rate = (cancelled_count / period_orders_count * 100) if period_orders_count else 0.0
    completion_rate = (completed_count / period_orders_count * 100) if period_orders_count else 0.0

    revenue_change = _safe_pct(float(period_revenue), float(previous_period_revenue))
    order_change = _safe_pct(period_orders_count, previous_period_orders_count)

    total_clients = User.objects.filter(role='client').count()
    total_services = Service.objects.count()

    top_services = [
        {
            'name': row['service__name'] or 'Unknown Service',
            'order_count': row['order_count'] or 0,
            'total_quantity': row['total_quantity'] or 0,
            'revenue': float(row['revenue'] or 0),
        }
        for row in top_services_qs
    ]

    top_categories = [
        {
            'name': row['service__category__name'] or 'Uncategorized',
            'order_count': row['order_count'] or 0,
            'total_quantity': row['total_quantity'] or 0,
        }
        for row in top_categories_qs
    ]

    top_technicians = []
    for row in top_technicians_qs:
        full_name = f"{row.get('first_name', '').strip()} {row.get('last_name', '').strip()}".strip()
        top_technicians.append(
            {
                'id': row['id'],
                'name': full_name or row.get('email') or f"Technician #{row['id']}",
                'assigned_jobs': row['assigned_jobs'] or 0,
                'completed_jobs': row['completed_jobs'] or 0,
                'generated_revenue': float(row.get('generated_revenue') or 0),
            }
        )

    ai_highlights = []
    if revenue_change > 0:
        ai_highlights.append(f"Revenue is up {abs(revenue_change):.1f}% compared to the previous {period_days}-day window.")
    elif revenue_change < 0:
        ai_highlights.append(f"Revenue is down {abs(revenue_change):.1f}% compared to the previous {period_days}-day window.")
    else:
        ai_highlights.append("Revenue is stable compared to the previous period.")

    if top_categories:
        ai_highlights.append(
            f"Highest-demand category is {top_categories[0]['name']} with {top_categories[0]['order_count']} orders."
        )

    if cancellation_rate >= 15:
        ai_highlights.append(f"Cancellation rate is elevated at {cancellation_rate:.1f}%; consider follow-up on delay and pricing complaints.")
    else:
        ai_highlights.append(f"Cancellation rate is healthy at {cancellation_rate:.1f}%.")

    if top_technicians:
        ai_highlights.append(
            f"Top technician this period: {top_technicians[0]['name']} ({top_technicians[0]['completed_jobs']} completed jobs)."
        )

    return JsonResponse(
        {
            'period_days': period_days,
            'revenue_over_time': list(revenue_over_time),
            'orders_over_time': list(orders_over_time),
            'status_distribution': list(status_distribution),
            'top_services': top_services,
            'top_categories': top_categories,
            'top_technicians': top_technicians,
            'summary': {
                'total_revenue': float(period_revenue),
                'total_orders': period_orders_count,
                'total_clients': total_clients,
                'total_services': total_services,
                'recent_revenue': float(period_revenue),
                'revenue_change_percentage': round(revenue_change, 2),
                'order_change_percentage': round(order_change, 2),
                'avg_order_value': round(avg_order_value, 2),
                'cancellation_rate': round(cancellation_rate, 2),
                'completion_rate': round(completion_rate, 2),
            },
            'ai_summary': {
                'headline': f"Analytics overview for the last {period_days} days",
                'highlights': ai_highlights,
            },
        }
    )


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
