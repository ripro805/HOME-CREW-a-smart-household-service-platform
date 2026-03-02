from rest_framework import serializers
from .models import Service, Review, ServiceImage, ServiceCategory

class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ["id", "name", "description"]


class ServiceImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    def get_image(self, obj):
        """Return the image URL, handling both uploaded files (Cloudinary) and
        plain URL strings stored by populate_db / migrations."""
        if not obj.image:
            return None
        raw = str(obj.image)
        if raw.startswith('http://') or raw.startswith('https://'):
            return raw
        try:
            url = obj.image.url
            if url.startswith('http'):
                return url
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(url)
            return url
        except Exception:
            return raw

    class Meta:
        model = ServiceImage
        fields = ["id", "image"]
class ServiceSerializer(serializers.ModelSerializer):
    images = ServiceImageSerializer(many=True, read_only=True)
    category = ServiceCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(queryset=ServiceCategory.objects.all(), source="category", write_only=True)
    class Meta:
        model = Service
        fields = ["id", "name", "description", "price", "avg_rating", "category", "category_id", "images"]
        

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["id", "service", "client", "rating", "comment", "created_at"]
