import django_filters
from .models import Service, Review

class ServiceFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr='lte')
    min_rating = django_filters.NumberFilter(field_name="avg_rating", lookup_expr='gte')
    max_rating = django_filters.NumberFilter(field_name="avg_rating", lookup_expr='lte')

    class Meta:
        model = Service
        fields = ['min_price', 'max_price', 'min_rating', 'max_rating', 'name']

class ReviewFilter(django_filters.FilterSet):
    min_rating = django_filters.NumberFilter(field_name="rating", lookup_expr='gte')
    max_rating = django_filters.NumberFilter(field_name="rating", lookup_expr='lte')
    client = django_filters.CharFilter(field_name="client__username", lookup_expr='icontains')

    class Meta:
        model = Review
        fields = ['min_rating', 'max_rating', 'client']
