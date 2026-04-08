from django.db.models import Avg
from rest_framework import serializers
from .models import Service, Review, ServiceImage, ServiceCategory
from accounts.models import User

class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ["id", "name", "description"]


class ServiceImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    image_file = serializers.ImageField(write_only=True, required=False, allow_null=True)
    image_url = serializers.URLField(write_only=True, required=False, allow_null=True, allow_blank=True)

    def get_image(self, obj):
        """Return the image URL from either image_file or image_url"""
        return obj.image  # Uses the @property from model

    class Meta:
        model = ServiceImage
        fields = ["id", "image", "image_file", "image_url"]
        read_only_fields = ["image"]
class ServiceSerializer(serializers.ModelSerializer):
    avg_rating = serializers.SerializerMethodField()
    images = ServiceImageSerializer(many=True, read_only=True)
    category = ServiceCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(queryset=ServiceCategory.objects.all(), source="category", write_only=True)
    review_count = serializers.SerializerMethodField()
    assigned_technicians = serializers.SerializerMethodField()
    assigned_technician_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="technician"),
        source="assigned_technicians",
        many=True,
        write_only=True,
        required=False,
    )
    
    def get_avg_rating(self, obj):
        annotated = getattr(obj, "calculated_avg_rating", None)
        if annotated is not None:
            return float(annotated)
        return float(obj.avg_rating or 0)

    def get_review_count(self, obj):
        annotated = getattr(obj, "calculated_review_count", None)
        if annotated is not None:
            return int(annotated)

        prefetched = getattr(obj, "_prefetched_objects_cache", {}).get("reviews")
        if prefetched is not None:
            return len(prefetched)

        return obj.reviews.count()

    def get_assigned_technicians(self, obj):
        techs = getattr(obj, "_prefetched_objects_cache", {}).get("assigned_technicians")
        if techs is None:
            techs = obj.assigned_technicians.all()
        return [
            {
                "id": t.id,
                "first_name": t.first_name,
                "last_name": t.last_name,
                "email": t.email,
                "phone_number": t.phone_number,
            }
            for t in techs
        ]
    
    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "description",
            "price",
            "avg_rating",
            "review_count",
            "category",
            "category_id",
            "available_locations",
            "images",
            "assigned_technicians",
            "assigned_technician_ids",
        ]
        

class ReviewSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ["id", "service", "client", "client_name", "rating", "comment", "created_at"]
        read_only_fields = ["service", "client", "client_name", "created_at"]

    def get_client_name(self, obj):
        if obj.client:
            return obj.client.get_full_name() or obj.client.email
        return "Anonymous"


class ServiceDetailSerializer(ServiceSerializer):
    reviews = ReviewSerializer(many=True, read_only=True)

    class Meta(ServiceSerializer.Meta):
        fields = ServiceSerializer.Meta.fields + ["reviews"]


class AdminReviewSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    client_email = serializers.EmailField(source='client.email', read_only=True)
    client_name = serializers.SerializerMethodField()

    def get_client_name(self, obj):
        if not obj.client:
            return 'Anonymous'
        return obj.client.get_full_name() or obj.client.email

    class Meta:
        model = Review
        fields = ["id", "service", "service_name", "client", "client_name", "client_email", "rating", "comment", "created_at"]
