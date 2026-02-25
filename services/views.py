from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from api.permissions import IsAdminOrSelfOrReadOnly
from django.db.models import Avg


from rest_framework.response import Response
from rest_framework import status, viewsets, generics, filters
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from api.permissions import IsAdminOrSelfOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from .models import Service, Review, ServiceCategory, ServiceImage
from .serializers import ServiceSerializer, ReviewSerializer, ServiceCategorySerializer, ServiceImageSerializer
from django.db import models
from .serializers import ServiceSerializer, ReviewSerializer, ServiceCategorySerializer
from .filters import ServiceFilter, ReviewFilter
from .pagination import ServiceResultsSetPagination

class ServiceViewSet(viewsets.ModelViewSet):
    from drf_yasg.utils import swagger_auto_schema

    @swagger_auto_schema(operation_description="""
    Service Listing & Management Endpoint
    Features:
    1. Admins can create, update, and delete services.
    2. Clients can view and search services.
    3. Supports filtering, searching, and ordering by price/rating.
    4. Returns service details including category, price, and avg_rating.
    """)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(operation_description="""
    Retrieve a single service by ID.
    Features:
    1. Returns all details for a specific service.
    2. Includes category, price, avg_rating, and description.
    """)
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @swagger_auto_schema(operation_description="""
    Create a new service (admin only).
    Features:
    1. Accepts service details in request body.
    2. Returns created service object.
    """)
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @swagger_auto_schema(operation_description="""
    Update an existing service (admin only).
    Features:
    1. Accepts updated fields in request body.
    2. Returns updated service object.
    """)
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @swagger_auto_schema(operation_description="""
    Delete a service (admin only).
    Features:
    1. Removes service from listing.
    2. Returns status 204 on success.
    """)
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    queryset = Service.objects.select_related('category').all()
    serializer_class = ServiceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ServiceFilter
    search_fields = ['name', 'description', 'category__name']
    ordering_fields = ['price', 'avg_rating']
    pagination_class = ServiceResultsSetPagination
    permission_classes = [IsAdminOrSelfOrReadOnly]

class ServiceCategoryViewSet(viewsets.ModelViewSet):
    """
    Service Category Management Endpoint
    Features:
    1. Admins can create, update, and delete categories.
    2. Clients can view and search categories.
    3. Supports searching and ordering by name.
    4. Returns category details and service count.
    """
    queryset = ServiceCategory.objects.annotate(service_count=models.Count('services')).all()
    serializer_class = ServiceCategorySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name']
    pagination_class = ServiceResultsSetPagination
    permission_classes = [IsAdminOrSelfOrReadOnly]

class ServiceImageViewSet(viewsets.ModelViewSet):
    """
    Service Image Management Endpoint
    Features:
    1. Admins can upload and delete images for services.
    2. Clients can view service images.
    3. Returns image URLs and metadata.
    """
    serializer_class = ServiceImageSerializer
    permission_classes = [IsAdminOrSelfOrReadOnly]
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ServiceImage.objects.none()
        return ServiceImage.objects.filter(service_id=self.kwargs['service_pk'])
    def perform_create(self, serializer):
        service_id = self.kwargs['service_pk']
        serializer.save(service_id=service_id)

# AddReviewView: Clients can leave reviews/ratings for a service
class AddReviewView(APIView):
    """
    Add Review Endpoint
    Features:
    1. POST: Add a review and rating for a service.
    2. Accepts rating (1-5) and comment in request body.
    3. Updates service's average rating.
    4. Returns success message and review details.
    """
    permission_classes = [IsAdminOrSelfOrReadOnly]

    def post(self, request, service_id):
        rating = int(request.data.get('rating', 0))
        comment = request.data.get('comment', '')
        if not (1 <= rating <= 5):
            return Response({'error': 'Rating must be between 1 and 5'}, status=400)
        try:
            service = Service.objects.get(pk=service_id)
        except Service.DoesNotExist:
            return Response({'error': 'Service not found'}, status=404)
        Review.objects.create(service=service, client=request.user, rating=rating, comment=comment)
        # Update average rating
        avg = Review.objects.filter(service=service).aggregate(Avg('rating'))['rating__avg']
        service.avg_rating = avg
        service.save()
        return Response({'message': 'Review added'}, status=201)

# ServicesSortedByRatingView: List services sorted by average rating
class ServicesSortedByRatingView(generics.ListAPIView):
    """
    Services Sorted by Rating Endpoint
    Features:
    1. GET: List all services sorted by average rating.
    2. Returns service details ordered by rating.
    """
    queryset = Service.objects.all().order_by('-avg_rating')
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminOrSelfOrReadOnly]

class ReviewViewSet(viewsets.ModelViewSet):
    """
    Review Management Endpoint
    Features:
    1. Admins can manage all reviews.
    2. Clients can create reviews for services.
    3. Supports filtering, searching, and ordering by rating/date.
    4. Returns review details including rating, comment, and timestamps.
    """
    
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAdminOrSelfOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ReviewFilter
    search_fields = ['comment']
    ordering_fields = ['rating', 'created_at']
    def perform_create(self, serializer):
        service_id = self.kwargs['service_pk']
        serializer.save(client=self.request.user, service_id=service_id)