from services.models import Service, ServiceCategory

print("=== Image Verification by Category ===\n")

categories_to_check = ['Carpentry', 'Gardening', 'Pest Control', 'AC Repair', 
                       'Appliance Repair', 'Moving Services', 'Laundry Services']

for cat_name in categories_to_check:
    try:
        category = ServiceCategory.objects.get(name=cat_name)
        services = Service.objects.filter(category=category)
        
        print(f"\n{cat_name} ({services.count()} services):")
        print("-" * 60)
        
        # Show first 3 services
        for service in services[:3]:
            if service.images.exists():
                image_url = service.images.first().image
                # Show just the photo ID for brevity
                if 'pexels' in str(image_url):
                    photo_id = str(image_url).split('/')[-2]
                    print(f"  ✓ {service.name}: pexels-{photo_id}")
                else:
                    print(f"  ✓ {service.name}: {image_url}")
            else:
                print(f"  ✗ {service.name}: NO IMAGE")
                
    except ServiceCategory.DoesNotExist:
        print(f"\n{cat_name}: Category not found")

print("\n" + "=" * 60)
print(f"Total services: {Service.objects.count()}")
print(f"Services with images: {Service.objects.filter(images__isnull=False).distinct().count()}")
print(f"Services without images: {Service.objects.filter(images__isnull=True).count()}")
