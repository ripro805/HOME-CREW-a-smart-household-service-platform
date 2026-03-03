from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from api.permissions import IsAdminOrSelfOrReadOnly
from django.db.models import Avg
import logging

# Setup logger
logger = logging.getLogger(__name__)


from rest_framework.response import Response
from rest_framework import status, viewsets, generics, filters
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from api.permissions import IsAdminOrSelfOrReadOnly, IsReviewOwnerOrAdmin
from django_filters.rest_framework import DjangoFilterBackend
from .models import Service, Review, ServiceCategory, ServiceImage
from .serializers import ServiceSerializer, ReviewSerializer, ServiceCategorySerializer, ServiceImageSerializer, AdminReviewSerializer
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
        logger.info("ServiceViewSet.list called: user=%s", request.user)
        try:
            response = super().list(request, *args, **kwargs)
            logger.info("ServiceViewSet.list succeeded")
            return response
        except Exception as e:
            logger.error("ServiceViewSet.list error: %s", str(e), exc_info=True)
            raise

    @swagger_auto_schema(operation_description="""
    Retrieve a single service by ID.
    Features:
    1. Returns all details for a specific service.
    2. Includes category, price, avg_rating, and description.
    """)
    def retrieve(self, request, *args, **kwargs):
        logger.info("ServiceViewSet.retrieve called: user=%s, args=%s, kwargs=%s", request.user, args, kwargs)
        try:
            response = super().retrieve(request, *args, **kwargs)
            logger.info("ServiceViewSet.retrieve succeeded")
            return response
        except Exception as e:
            logger.error("ServiceViewSet.retrieve error: %s", str(e), exc_info=True)
            raise

    @swagger_auto_schema(operation_description="""
    Create a new service (admin only).
    Features:
    1. Accepts service details in request body.
    2. Returns created service object.
    """)
    def create(self, request, *args, **kwargs):
        logger.info("ServiceViewSet.create called: user=%s, data=%s", request.user, request.data)
        try:
            response = super().create(request, *args, **kwargs)
            logger.info("ServiceViewSet.create succeeded")
            return response
        except Exception as e:
            logger.error("ServiceViewSet.create error: %s", str(e), exc_info=True)
            raise

    @swagger_auto_schema(operation_description="""
    Update an existing service (admin only).
    Features:
    1. Accepts updated fields in request body.
    2. Returns updated service object.
    """)
    def update(self, request, *args, **kwargs):
        logger.info("ServiceViewSet.update called: user=%s, data=%s", request.user, request.data)
        try:
            response = super().update(request, *args, **kwargs)
            logger.info("ServiceViewSet.update succeeded")
            return response
        except Exception as e:
            logger.error("ServiceViewSet.update error: %s", str(e), exc_info=True)
            raise

    @swagger_auto_schema(operation_description="""
    Delete a service (admin only).
    Features:
    1. Removes service from listing.
    2. Returns status 204 on success.
    """)
    def destroy(self, request, *args, **kwargs):
        logger.info("ServiceViewSet.destroy called: user=%s, args=%s, kwargs=%s", request.user, args, kwargs)
        try:
            response = super().destroy(request, *args, **kwargs)
            logger.info("ServiceViewSet.destroy succeeded")
            return response
        except Exception as e:
            logger.error("ServiceViewSet.destroy error: %s", str(e), exc_info=True)
            raise

    queryset = Service.objects.select_related('category').order_by('id').all()
    serializer_class = ServiceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ServiceFilter
    search_fields = ['name', 'description', 'category__name']
    ordering_fields = ['price', 'avg_rating']
    pagination_class = ServiceResultsSetPagination
    permission_classes = [IsAdminOrSelfOrReadOnly]

    def get_permissions(self):
        """Allow anyone to view services, but require auth for modifications"""
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

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
    pagination_class = None  # Disable pagination for categories
    permission_classes = [IsAdminOrSelfOrReadOnly]

    def get_permissions(self):
        """Allow anyone to view categories, but require auth for modifications"""
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

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
        logger.info("AddReviewView.post called: user=%s, service_id=%s, data=%s", request.user, service_id, request.data)
        rating = int(request.data.get('rating', 0))
        comment = request.data.get('comment', '')
        if not (1 <= rating <= 5):
            logger.warning("Invalid rating: %s", rating)
            return Response({'error': 'Rating must be between 1 and 5'}, status=400)
        try:
            service = Service.objects.get(pk=service_id)
        except Service.DoesNotExist:
            logger.error("Service not found: service_id=%s", service_id)
            return Response({'error': 'Service not found'}, status=404)
        Review.objects.create(service=service, client=request.user, rating=rating, comment=comment)
        # Update average rating
        avg = Review.objects.filter(service=service).aggregate(Avg('rating'))['rating__avg']
        service.avg_rating = avg
        service.save()
        logger.info("Review added: service_id=%s, avg_rating=%s", service_id, avg)
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
    Review Management Endpoint (nested under /services/{id}/reviews/)
    """
    serializer_class = ReviewSerializer
    permission_classes = [IsReviewOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ReviewFilter
    search_fields = ['comment']
    ordering_fields = ['rating', 'created_at']

    def get_queryset(self):
        service_pk = self.kwargs.get('service_pk')
        if service_pk:
            return Review.objects.filter(service_id=service_pk).select_related('client').order_by('-created_at')
        return Review.objects.all().select_related('client').order_by('-created_at')

    def perform_create(self, serializer):
        service_id = self.kwargs['service_pk']
        serializer.save(client=self.request.user, service_id=service_id)


class AdminReviewViewSet(viewsets.ModelViewSet):
    """
    Admin-only flat reviews endpoint: GET /api/v1/reviews/
    Allows listing all reviews and deleting any review.
    """
    serializer_class = AdminReviewSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'delete', 'head', 'options']
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['comment', 'service__name', 'client__email']
    ordering_fields = ['rating', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        if not (self.request.user.is_authenticated and getattr(self.request.user, 'role', '') == 'admin'):
            return Review.objects.none()
        return Review.objects.select_related('service', 'client').order_by('-created_at')