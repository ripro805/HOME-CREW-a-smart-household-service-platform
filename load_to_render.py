"""
Script to load local data directly to Render PostgreSQL
"""
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'house_hold_service.settings')
django.setup()

from django.db import connection, transaction

# Force Render DB
from decouple import config
db_url = config('DATABASE_URL', default=None)
print(f"Connected to: {db_url[:40] if db_url else 'SQLite'}...")

from accounts.models import User
from services.models import ServiceCategory, Service, ServiceImage, Review
from orders.models import Order

print("\n========================================")
print("Loading data to Render PostgreSQL...")
print("========================================")

# === STEP 1: ServiceCategories ===
print("\n📦 Loading ServiceCategories...")
with open('categories_data.json', 'r', encoding='utf-8') as f:
    categories = json.load(f)

cat_count = 0
for item in categories:
    if item['model'] == 'services.servicecategory':
        fields = item['fields']
        try:
            obj, created = ServiceCategory.objects.get_or_create(
                id=item['pk'],
                defaults={
                    'name': fields['name'],
                    'description': fields.get('description', ''),
                }
            )
            if not created:
                obj.name = fields['name']
                obj.description = fields.get('description', '')
                obj.save()
            cat_count += 1
        except Exception as e:
            print(f"  ⚠️ Category {item['pk']} error: {e}")

print(f"✅ Loaded {cat_count} categories")

# === STEP 2: Services ===
print("\n📦 Loading Services...")
with open('services_main_data.json', 'r', encoding='utf-8') as f:
    services = json.load(f)

svc_count = 0
for item in services:
    if item['model'] == 'services.service':
        fields = item['fields']
        try:
            category = ServiceCategory.objects.filter(id=fields['category']).first() if fields.get('category') else None
            obj, created = Service.objects.get_or_create(
                id=item['pk'],
                defaults={
                    'name': fields['name'],
                    'description': fields.get('description', ''),
                    'price': fields.get('price', 0),
                    'category': category,
                }
            )
            if not created:
                obj.name = fields['name']
                obj.description = fields.get('description', '')
                obj.price = fields.get('price', 0)
                obj.category = category
                obj.save()
            svc_count += 1
        except Exception as e:
            print(f"  ⚠️ Service {item['pk']} error: {e}")

print(f"✅ Loaded {svc_count} services")

# === STEP 3: ServiceImages ===
print("\n📦 Loading ServiceImages...")
with open('serviceimages_data.json', 'r', encoding='utf-8') as f:
    images = json.load(f)

img_count = 0
for item in images:
    if item['model'] == 'services.serviceimage':
        fields = item['fields']
        try:
            service = Service.objects.filter(id=fields['service']).first()
            if service:
                obj, created = ServiceImage.objects.get_or_create(
                    id=item['pk'],
                    defaults={
                        'service': service,
                        'image_url': fields.get('image_url', '') or '',
                        'image_file': fields.get('image_file', '') or '',
                    }
                )
                if not created:
                    obj.image_url = fields.get('image_url', '') or ''
                    obj.save()
                img_count += 1
        except Exception as e:
            print(f"  ⚠️ Image {item['pk']} error: {e}")

print(f"✅ Loaded {img_count} service images")

# === STEP 4: Users ===
print("\n📦 Loading Users...")
with open('accounts_data.json', 'r', encoding='utf-8') as f:
    accounts = json.load(f)

user_count = 0
for item in accounts:
    if item['model'] == 'accounts.user':
        fields = item['fields']
        try:
            obj, created = User.objects.get_or_create(
                id=item['pk'],
                defaults={
                    'email': fields['email'],
                    'password': fields['password'],
                    'first_name': fields.get('first_name', ''),
                    'last_name': fields.get('last_name', ''),
                    'is_staff': fields.get('is_staff', False),
                    'is_superuser': fields.get('is_superuser', False),
                    'is_active': fields.get('is_active', True),
                    'date_joined': fields.get('date_joined'),
                    'phone_number': fields.get('phone_number', ''),
                    'address': fields.get('address', ''),
                    'role': fields.get('role', 'client'),
                }
            )
            user_count += 1
        except Exception as e:
            print(f"  ⚠️ User {item['pk']} ({fields.get('email')}) error: {e}")

print(f"✅ Loaded {user_count} users")

# === STEP 5: Reviews ===
print("\n📦 Loading Reviews...")
with open('reviews_data.json', 'r', encoding='utf-8') as f:
    reviews = json.load(f)

review_count = 0
for item in reviews:
    if item['model'] == 'services.review':
        fields = item['fields']
        try:
            service = Service.objects.filter(id=fields['service']).first()
            client = User.objects.filter(id=fields['client']).first()
            if service and client:
                obj, created = Review.objects.get_or_create(
                    id=item['pk'],
                    defaults={
                        'service': service,
                        'client': client,
                        'rating': fields.get('rating', 5),
                        'comment': fields.get('comment', ''),
                        'created_at': fields.get('created_at'),
                    }
                )
                review_count += 1
        except Exception as e:
            print(f"  ⚠️ Review {item['pk']} error: {e}")

print(f"✅ Loaded {review_count} reviews")

# === STEP 6: Orders ===
print("\n📦 Loading Orders...")
with open('orders_data.json', 'r', encoding='utf-8') as f:
    orders_data = json.load(f)

order_count = 0
for item in orders_data:
    if item['model'] == 'orders.order':
        fields = item['fields']
        try:
            service = Service.objects.filter(id=fields['service']).first() if fields.get('service') else None
            client = User.objects.filter(id=fields['client']).first()
            if client:
                obj, created = Order.objects.get_or_create(
                    id=item['pk'],
                    defaults={
                        'service': service,
                        'client': client,
                        'status': fields.get('status', 'pending'),
                        'total_price': fields.get('total_price', 0),
                        'created_at': fields.get('created_at'),
                    }
                )
                order_count += 1
        except Exception as e:
            print(f"  ⚠️ Order {item['pk']} error: {e}")

print(f"✅ Loaded {order_count} orders")

# === Final Summary ===
print("\n========================================")
print("📊 FINAL DATABASE COUNTS (Render):")
print("========================================")
print(f"  ServiceCategory: {ServiceCategory.objects.count()}")
print(f"  Service:         {Service.objects.count()}")
print(f"  ServiceImage:    {ServiceImage.objects.count()}")
print(f"  Review:          {Review.objects.count()}")
print(f"  User:            {User.objects.count()}")
print(f"  Order:           {Order.objects.count()}")
print("\n✅ Data migration to Render PostgreSQL COMPLETE!")
