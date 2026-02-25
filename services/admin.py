from django.contrib import admin
from .models import Service, Review, ServiceCategory

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "price", "avg_rating", "category")
    search_fields = ("name", "description")
    list_filter = ("price", "avg_rating", "category")

@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "service", "client", "rating", "created_at")
    search_fields = ("service__name", "client__username", "comment")
    list_filter = ("service", "rating", "created_at")
