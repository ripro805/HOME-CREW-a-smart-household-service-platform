"""
Script to populate database with 100+ sample data
Run: python manage.py shell < populate_db.py
"""

import os
import django
import random
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'house_hold_service.settings')
django.setup()

from django.db import models
from accounts.models import User, ClientProfile
from services.models import Service, ServiceCategory, ServiceImage, Review
from orders.models import Cart, CartItem, Order, OrderItem

print("🚀 Starting database population...")

# Clear existing data (except admin)
print("Clearing existing data...")
Review.objects.all().delete()
ServiceImage.objects.all().delete()
Service.objects.all().delete()
ServiceCategory.objects.exclude(name__in=['Cleaning', 'Plumbing', 'Electrical']).delete()
User.objects.exclude(email='admin@homecrew.com').delete()

print("✅ Data cleared!")

# 1. Create Categories
print("\n📁 Creating categories...")
categories_data = [
    {'name': 'House Cleaning', 'description': 'Professional home cleaning services'},
    {'name': 'Deep Cleaning', 'description': 'Thorough deep cleaning for your home'},
    {'name': 'Plumbing', 'description': 'Expert plumbing services'},
    {'name': 'Electrical Work', 'description': 'Licensed electrician services'},
    {'name': 'Painting', 'description': 'Interior and exterior painting'},
    {'name': 'Carpentry', 'description': 'Furniture and wood work'},
    {'name': 'Gardening', 'description': 'Lawn care and gardening'},
    {'name': 'Pest Control', 'description': 'Remove pests from your home'},
    {'name': 'AC Repair', 'description': 'Air conditioning maintenance and repair'},
    {'name': 'Appliance Repair', 'description': 'Fix home appliances'},
    {'name': 'Moving Services', 'description': 'Professional moving and packing'},
    {'name': 'Laundry Services', 'description': 'Wash, dry, and fold services'},
]

categories = []
for cat_data in categories_data:
    cat, created = ServiceCategory.objects.get_or_create(**cat_data)
    categories.append(cat)
    if created:
        print(f"  ✓ Created: {cat.name}")

print(f"✅ Created {len(categories)} categories")

# 2. Create Users (50 clients)
print("\n👥 Creating users...")
first_names = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emily', 'James', 'Lisa', 'Robert', 'Maria',
               'William', 'Jennifer', 'Richard', 'Linda', 'Thomas', 'Patricia', 'Charles', 'Barbara',
               'Daniel', 'Elizabeth', 'Matthew', 'Susan', 'Anthony', 'Jessica', 'Mark', 'Karen',
               'Donald', 'Nancy', 'Steven', 'Betty', 'Paul', 'Helen', 'Andrew', 'Sandra', 'Joshua',
               'Donna', 'Kenneth', 'Carol', 'Kevin', 'Ruth', 'Brian', 'Sharon', 'George', 'Michelle',
               'Edward', 'Laura', 'Ronald', 'Sarah', 'Timothy', 'Kimberly']

last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
              'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
              'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
              'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker']

users = []
for i in range(50):
    fname = random.choice(first_names)
    lname = random.choice(last_names)
    email = f"{fname.lower()}.{lname.lower()}{i}@example.com"
    
    user = User.objects.create_user(
        email=email,
        password='password123',
        first_name=fname,
        last_name=lname,
        phone_number=f"+1-555-{random.randint(1000, 9999)}",
        address=f"{random.randint(100, 9999)} Main St, City, State {random.randint(10000, 99999)}",
        role='client'
    )
    users.append(user)
    
    if i % 10 == 0:
        print(f"  Created {i+1} users...")

print(f"✅ Created {len(users)} users")

# 3. Create Services (100 services)
print("\n🛠️ Creating services...")
service_templates = [
    {'base': 'House Cleaning', 'variants': ['Basic', 'Standard', 'Premium', 'Deluxe']},
    {'base': 'Deep Cleaning', 'variants': ['Kitchen', 'Bathroom', 'Bedroom', 'Full House']},
    {'base': 'Plumbing', 'variants': ['Leak Repair', 'Pipe Installation', 'Drain Cleaning', 'Faucet Repair']},
    {'base': 'Electrical', 'variants': ['Wiring', 'Light Installation', 'Socket Repair', 'Panel Upgrade']},
    {'base': 'Painting', 'variants': ['Interior', 'Exterior', 'Room', 'Full House']},
    {'base': 'Carpentry', 'variants': ['Furniture Assembly', 'Cabinet Installation', 'Door Repair', 'Custom Work']},
    {'base': 'Gardening', 'variants': ['Lawn Mowing', 'Tree Trimming', 'Weed Control', 'Landscaping']},
    {'base': 'Pest Control', 'variants': ['Termite', 'Rodent', 'Insect', 'General']},
    {'base': 'AC Repair', 'variants': ['Maintenance', 'Installation', 'Repair', 'Cleaning']},
    {'base': 'Appliance Repair', 'variants': ['Refrigerator', 'Washing Machine', 'Dishwasher', 'Oven']},
]

services = []
counter = 0
for template in service_templates:
    category = random.choice(categories)
    for variant in template['variants']:
        for quality in ['', ' - Express', ' - Standard']:
            if counter >= 100:
                break
            
            name = f"{template['base']} - {variant}{quality}"
            price = Decimal(random.randint(30, 300))
            
            service = Service.objects.create(
                name=name,
                description=f"Professional {template['base'].lower()} service. Get {variant.lower()} quality work done by experienced professionals. We guarantee satisfaction and quality workmanship.",
                price=price,
                category=category,
                avg_rating=round(random.uniform(3.5, 5.0), 1)
            )
            services.append(service)
            counter += 1
            
            if counter % 20 == 0:
                print(f"  Created {counter} services...")

print(f"✅ Created {len(services)} services")

# 4. Create Service Images (2-3 images per service)
print("\n🖼️ Creating service images...")
image_urls = [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
    'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800',
    'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800',
    'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=800',
    'https://images.unsplash.com/photo-1603712725038-eb8b44e2f0e1?w=800',
    'https://images.unsplash.com/photo-1581578017093-cd30ed95cd8f?w=800',
    'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800',
    'https://images.unsplash.com/photo-1581092918484-8313e1f7e8d6?w=800',
]

image_counter = 0
for service in services:
    num_images = random.randint(1, 3)
    for _ in range(num_images):
        ServiceImage.objects.create(
            service=service,
            image=random.choice(image_urls)
        )
        image_counter += 1

print(f"✅ Created {image_counter} service images")

# 5. Create Reviews (200+ reviews)
print("\n⭐ Creating reviews...")
review_comments = [
    "Excellent service! Very professional and thorough.",
    "Great work! Would definitely recommend.",
    "Good service, arrived on time and did a great job.",
    "Very satisfied with the quality of work.",
    "Professional and efficient service.",
    "Exceeded my expectations! Highly recommended.",
    "Good value for money. Will use again.",
    "Quick and reliable service.",
    "Very happy with the results!",
    "Professional team, great service.",
    "Fantastic experience from start to finish.",
    "Could not be happier with the service.",
    "Top-notch quality and professionalism.",
    "Amazing work! Worth every penny.",
    "Best service I've ever received!",
]

reviews = []
for service in services:
    # Each service gets 2-5 reviews
    num_reviews = random.randint(2, 5)
    for _ in range(num_reviews):
        reviewer = random.choice(users)
        rating = random.randint(3, 5)
        
        review = Review.objects.create(
            service=service,
            client=reviewer,
            rating=rating,
            comment=random.choice(review_comments)
        )
        reviews.append(review)

print(f"✅ Created {len(reviews)} reviews")

# Update service avg_rating based on reviews
print("\n📊 Updating service ratings...")
for service in services:
    service_reviews = Review.objects.filter(service=service)
    if service_reviews.exists():
        avg = service_reviews.aggregate(models.Avg('rating'))['rating__avg']
        service.avg_rating = round(avg, 1)
        service.save()

# 6. Create some sample carts and orders
print("\n🛒 Creating sample carts and orders...")
for i in range(20):
    user = random.choice(users)
    
    # Create cart
    cart, _ = Cart.objects.get_or_create(client=user)
    
    # Add 1-3 items to cart
    for _ in range(random.randint(1, 3)):
        service = random.choice(services)
        CartItem.objects.get_or_create(
            cart=cart,
            service=service,
            defaults={'quantity': random.randint(1, 3)}
        )
    
    # Create order
    order = Order.objects.create(
        client=user,
        status=random.choice(['NOT_PAID', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED']),
        total_price=Decimal(random.randint(50, 500))
    )
    
    # Add order items
    for _ in range(random.randint(1, 4)):
        service = random.choice(services)
        OrderItem.objects.create(
            order=order,
            service=service,
            quantity=random.randint(1, 2),
            price=service.price
        )

print(f"✅ Created sample carts and orders")

# 7. Summary
print("\n" + "="*60)
print("🎉 DATABASE POPULATION COMPLETE!")
print("="*60)
print(f"📁 Categories: {ServiceCategory.objects.count()}")
print(f"👥 Users: {User.objects.count()}")
print(f"🛠️ Services: {Service.objects.count()}")
print(f"🖼️ Service Images: {ServiceImage.objects.count()}")
print(f"⭐ Reviews: {Review.objects.count()}")
print(f"🛒 Carts: {Cart.objects.count()}")
print(f"📦 Orders: {Order.objects.count()}")
print("="*60)
print("\n✅ You can now test the application with rich sample data!")
print("\n📝 Sample Login Credentials:")
print("   Email: john.smith0@example.com")
print("   Password: password123")
print("\n   Admin: admin@homecrew.com / admin123")
