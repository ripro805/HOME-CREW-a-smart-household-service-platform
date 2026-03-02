# Create your models here.

from django.db import models
from accounts.models import User
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from .validators import validate_file_size
from cloudinary.models import CloudinaryField
# Service Category model
class ServiceCategory(models.Model):
	name = models.CharField(max_length=100, unique=True)
	description = models.TextField(blank=True)

	def __str__(self):
		return self.name
class Service(models.Model):
	name = models.CharField(max_length=100)
	description = models.TextField()
	price = models.DecimalField(max_digits=10, decimal_places=2)
	avg_rating = models.FloatField(default=0)
	category = models.ForeignKey(ServiceCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="services")

	def __str__(self):
		return self.name
class  ServiceImage(models.Model):
	service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="images")
	image = models.URLField(max_length=500, blank=True, null=True)
class Review(models.Model):
	service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="reviews")
	client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
	rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
	comment = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f"{self.service.name} - {self.rating} by {self.client.username}"
