
# Create your models here.

from django.db import models
from django.contrib.auth.models import AbstractUser
from cloudinary.models import CloudinaryField

from .managers import CustomUserManager

class User(AbstractUser):
	username = None  # Remove the username field
	first_name = models.CharField(max_length=50)
	last_name = models.CharField(max_length=50)
	email = models.EmailField(unique=True)
	address = models.TextField(blank=True, null=True)
	phone_number = models.CharField(max_length=20, blank=True, null=True)
	password = models.CharField(max_length=128)  # Store hashed password
	ROLE_CHOICES = (
		("admin", "Admin"),
		("client", "Client"),
		("technician", "Technician"),
	)
	role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="client")

	USERNAME_FIELD = 'email'  # Use email as the unique identifier
	REQUIRED_FIELDS = []  # No additional required fields
	objects = CustomUserManager()  # Use the custom user manager

	def is_admin(self):
		return self.role == "admin"

	def is_client(self):
		return self.role == "client"

	def is_technician(self):
		return self.role == "technician"

class ClientProfile(models.Model):
	user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
	bio = models.TextField(blank=True)
	profile_pic = CloudinaryField('image', blank=True, null=True)
	social_links = models.JSONField(default=dict, blank=True)

	def __str__(self):
		return f"Profile of {self.user.username}"
