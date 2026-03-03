from services.models import Service, ServiceImage, ServiceCategory

# Define comprehensive specific images for all categories
service_images = {
    # Carpentry
    'Custom Furniture': 'https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Door Installation': 'https://images.pexels.com/photos/277559/pexels-photo-277559.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Cabinet': 'https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Deck Building': 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Trim': 'https://images.pexels.com/photos/5974396/pexels-photo-5974396.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Shelving': 'https://images.pexels.com/photos/667838/pexels-photo-667838.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Furniture Repair': 'https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Wood Flooring': 'https://images.pexels.com/photos/534151/pexels-photo-534151.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Furniture Assembly': 'https://images.pexels.com/photos/5974396/pexels-photo-5974396.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Door Repair': 'https://images.pexels.com/photos/277559/pexels-photo-277559.jpeg?auto=compress&cs=tinysrgb&w=800',
    
    # Gardening
    'Lawn Mowing': 'https://images.pexels.com/photos/1301856/pexels-photo-1301856.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Garden Design': 'https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Tree Trimming': 'https://images.pexels.com/photos/1072824/pexels-photo-1072824.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Hedge': 'https://images.pexels.com/photos/209112/pexels-photo-209112.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Garden Maintenance': 'https://images.pexels.com/photos/1484767/pexels-photo-1484767.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Planting': 'https://images.pexels.com/photos/1301856/pexels-photo-1301856.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Irrigation': 'https://images.pexels.com/photos/105234/pexels-photo-105234.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Fertilization': 'https://images.pexels.com/photos/209112/pexels-photo-209112.jpeg?auto=compress&cs=tinysrgb&w=800',
    
    # Pest Control
    'General Pest': 'https://images.pexels.com/photos/6474471/pexels-photo-6474471.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Termite': 'https://images.pexels.com/photos/12214388/pexels-photo-12214388.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Rodent': 'https://images.pexels.com/photos/6474479/pexels-photo-6474479.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Bed Bug': 'https://images.pexels.com/photos/6474471/pexels-photo-6474471.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Mosquito': 'https://images.pexels.com/photos/14654115/pexels-photo-14654115.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Ant': 'https://images.pexels.com/photos/6474471/pexels-photo-6474471.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Cockroach': 'https://images.pexels.com/photos/12214388/pexels-photo-12214388.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Commercial Pest': 'https://images.pexels.com/photos/6474479/pexels-photo-6474479.jpeg?auto=compress&cs=tinysrgb&w=800',
    
    # AC Repair - add Installation keyword
    'Installation': 'https://images.pexels.com/photos/7031703/pexels-photo-7031703.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Maintenance': 'https://images.pexels.com/photos/8774459/pexels-photo-8774459.jpeg?auto=compress&cs=tinysrgb&w=800',
    
    # Appliance Repair
    'Refrigerator': 'https://images.pexels.com/photos/4686961/pexels-photo-4686961.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Washing Machine': 'https://images.pexels.com/photos/4686958/pexels-photo-4686958.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Dryer': 'https://images.pexels.com/photos/5591663/pexels-photo-5591663.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Dishwasher': 'https://images.pexels.com/photos/4686958/pexels-photo-4686958.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Oven': 'https://images.pexels.com/photos/4686961/pexels-photo-4686961.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Microwave': 'https://images.pexels.com/photos/4686958/pexels-photo-4686958.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Water Dispenser': 'https://images.pexels.com/photos/4686961/pexels-photo-4686961.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Small Appliance': 'https://images.pexels.com/photos/4686958/pexels-photo-4686958.jpeg?auto=compress&cs=tinysrgb&w=800',
    
    # Moving Services
    'Local Moving': 'https://images.pexels.com/photos/7464205/pexels-photo-7464205.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Long Distance': 'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Packing': 'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Unpacking': 'https://images.pexels.com/photos/7464205/pexels-photo-7464205.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Disassembly': 'https://images.pexels.com/photos/5974396/pexels-photo-5974396.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Assembly': 'https://images.pexels.com/photos/5974396/pexels-photo-5974396.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Storage': 'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Office Relocation': 'https://images.pexels.com/photos/7464205/pexels-photo-7464205.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Heavy Item': 'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Truck Rental': 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800',
    
    # Laundry Services
    'Wash and Fold': 'https://images.pexels.com/photos/5591663/pexels-photo-5591663.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Dry Cleaning': 'https://images.pexels.com/photos/5591581/pexels-photo-5591581.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Ironing': 'https://images.pexels.com/photos/5591663/pexels-photo-5591663.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Wash and Iron': 'https://images.pexels.com/photos/5591581/pexels-photo-5591581.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Suit': 'https://images.pexels.com/photos/5591581/pexels-photo-5591581.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Curtain': 'https://images.pexels.com/photos/5591663/pexels-photo-5591663.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Blanket': 'https://images.pexels.com/photos/5591581/pexels-photo-5591581.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Shoe': 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Leather': 'https://images.pexels.com/photos/5591581/pexels-photo-5591581.jpeg?auto=compress&cs=tinysrgb&w=800',
    'Express': 'https://images.pexels.com/photos/5591663/pexels-photo-5591663.jpeg?auto=compress&cs=tinysrgb&w=800',
}

print('Updating all services with more specific images...\n')
updated = 0
categories_updated = {}

# Get all categories to process by category
for category in ServiceCategory.objects.all():
    services = Service.objects.filter(category=category)
    cat_count = 0
    
    for service in services:
        # Find matching image based on service name keywords
        selected_image = None
        service_name = service.name
        
        # Check each keyword
        for keyword, image_url in service_images.items():
            if keyword.lower() in service_name.lower():
                selected_image = image_url
                print(f'{category.name} - {service.name}: Matched "{keyword}"')
                break
        
        if selected_image:
            # Delete existing images and add new one
            service.images.all().delete()
            ServiceImage.objects.create(service=service, image=selected_image)
            updated += 1
            cat_count += 1
    
    if cat_count > 0:
        categories_updated[category.name] = cat_count

print(f'\n--- Summary ---')
for cat, count in categories_updated.items():
    print(f'{cat}: {count} services updated')
    
print(f'\nTotal updated: {updated} services')
print(f'Total services in database: {Service.objects.count()}')
print('\nAll services now have specific, service-matched images!')
