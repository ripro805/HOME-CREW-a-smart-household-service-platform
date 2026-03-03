from services.models import Service, ServiceImage

category_images = {
    'House Cleaning': 'https://images.pexels.com/photos/4107112/pexels-photo-4107112.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Deep Cleaning': 'https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Plumbing': 'https://images.pexels.com/photos/8915002/pexels-photo-8915002.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Electrical Work': 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Painting': 'https://images.pexels.com/photos/1669754/pexels-photo-1669754.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Carpentry': 'https://images.pexels.com/photos/5974396/pexels-photo-5974396.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Gardening': 'https://images.pexels.com/photos/1301856/pexels-photo-1301856.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Pest Control': 'https://images.pexels.com/photos/6474471/pexels-photo-6474471.jpeg?auto=compress&cs=tinysrgb&w=800',
    'AC Repair': 'https://images.pexels.com/photos/8774459/pexels-photo-8774459.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Appliance Repair': 'https://images.pexels.com/photos/4686961/pexels-photo-4686961.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Moving Services': 'https://images.pexels.com/photos/7464205/pexels-photo-7464205.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Laundry Services': 'https://images.pexels.com/photos/5591663/pexels-photo-5591663.jpeg?auto=compress&cs=tinysrgb&w=800',
}

print('Fixing ALL service images...')

for service in Service.objects.all():
    category_name = service.category.name if service.category else 'House Cleaning'
    image_url = category_images.get(category_name, category_images['House Cleaning'])
    
    service.images.all().delete()
    ServiceImage.objects.create(service=service, image=image_url)

total = ServiceImage.objects.count()
print(f'✅ Fixed {total} service images!')

# Verify
sample = ServiceImage.objects.first()
print(f'\nVerification:')
print(f'Sample URL: {sample.image}')
print(f'URL length: {len(sample.image)} characters')
print(f'Has .jpeg extension: {".jpeg" in sample.image}')
