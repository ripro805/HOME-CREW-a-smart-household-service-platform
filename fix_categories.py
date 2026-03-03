"""
Fix category-service mismatch:
- Add proper services to Appliance Repair, Moving Services, Laundry Services
"""
from services.models import Service, ServiceCategory, ServiceImage
from decimal import Decimal
import random

print("🔧 Fixing category-service mapping...\n")

# Services to add for missing categories
missing_services = {
    'Appliance Repair': [
        {'name': 'Refrigerator Repair',        'price': '700',  'desc': 'Expert refrigerator diagnosis and repair service.'},
        {'name': 'Washing Machine Repair',      'price': '600',  'desc': 'Fix washing machine issues including drum, motor, and electronics.'},
        {'name': 'Dryer Repair',                'price': '550',  'desc': 'Professional dryer repair and maintenance.'},
        {'name': 'Dishwasher Repair',           'price': '500',  'desc': 'Dishwasher troubleshooting and repair.'},
        {'name': 'Oven & Stove Repair',         'price': '650',  'desc': 'Oven, stove, and cooktop repair services.'},
        {'name': 'Microwave Repair',            'price': '350',  'desc': 'Microwave oven repair and part replacement.'},
        {'name': 'Water Dispenser Repair',      'price': '400',  'desc': 'Water dispenser cleaning, repair, and maintenance.'},
        {'name': 'TV & Electronics Repair',     'price': '800',  'desc': 'Television and home electronics repair.'},
        {'name': 'Air Purifier Service',        'price': '300',  'desc': 'Air purifier filter replacement and servicing.'},
        {'name': 'Water Heater Repair',         'price': '750',  'desc': 'Water heater diagnosis and repair.'},
        {'name': 'Small Appliance Repair',      'price': '250',  'desc': 'Repair for blenders, irons, fans and other small appliances.'},
        {'name': 'Generator Servicing',         'price': '900',  'desc': 'Generator maintenance, oil change, and repair.'},
    ],
    'Moving Services': [
        {'name': 'Local Moving',                'price': '2500', 'desc': 'Full local moving service with packing and transport.'},
        {'name': 'Home Shifting',               'price': '3500', 'desc': 'Complete home shifting with careful handling of belongings.'},
        {'name': 'Office Relocation',           'price': '5000', 'desc': 'Professional office moving and setup service.'},
        {'name': 'Furniture Moving',            'price': '1500', 'desc': 'Move heavy furniture safely within or between locations.'},
        {'name': 'Packing Service',             'price': '1200', 'desc': 'Professional packing of all household items with quality materials.'},
        {'name': 'Unpacking Service',           'price': '1000', 'desc': 'Careful unpacking and arrangement of items at destination.'},
        {'name': 'Piano & Heavy Item Moving',   'price': '2000', 'desc': 'Specialized moving for pianos and heavy items.'},
        {'name': 'Storage & Warehousing',       'price': '800',  'desc': 'Temporary storage solution during relocation.'},
        {'name': 'Vehicle Transport',           'price': '4000', 'desc': 'Safe vehicle transport during home relocation.'},
        {'name': 'Single Item Moving',          'price': '600',  'desc': 'Move a single item like a sofa, fridge, or wardrobe.'},
        {'name': 'Truck Rental with Driver',    'price': '1800', 'desc': 'Hire a truck with driver for moving needs.'},
        {'name': 'Express Moving',              'price': '4500', 'desc': 'Same-day express moving service for urgent relocations.'},
    ],
    'Laundry Services': [
        {'name': 'Wash & Fold',                 'price': '200',  'desc': 'Machine wash and neatly fold your clothes.'},
        {'name': 'Wash & Iron',                 'price': '300',  'desc': 'Wash and iron clothes for a crisp, clean look.'},
        {'name': 'Dry Cleaning',                'price': '500',  'desc': 'Professional dry cleaning for delicate garments.'},
        {'name': 'Ironing Only',                'price': '150',  'desc': 'Steam ironing for wrinkle-free clothes.'},
        {'name': 'Blanket & Comforter Cleaning','price': '600',  'desc': 'Deep cleaning for blankets, quilts, and comforters.'},
        {'name': 'Curtain Cleaning',            'price': '700',  'desc': 'Professional curtain wash, dry, and press.'},
        {'name': 'Suit & Formal Wear Cleaning', 'price': '450',  'desc': 'Specialized cleaning for suits and formal wear.'},
        {'name': 'Shoe Cleaning',               'price': '250',  'desc': 'Professional shoe cleaning and polishing service.'},
        {'name': 'Carpet Cleaning',             'price': '800',  'desc': 'Steam cleaning and stain removal for carpets.'},
        {'name': 'Express Laundry',             'price': '400',  'desc': 'Same-day express laundry service.'},
        {'name': 'Leather & Suede Cleaning',    'price': '900',  'desc': 'Expert cleaning for leather jackets, bags, and shoes.'},
        {'name': 'Subscription Laundry',        'price': '1500', 'desc': 'Weekly laundry subscription plan for regular customers.'},
    ],
}

# Images for each category
category_images = {
    'Appliance Repair': {
        'Refrigerator Repair':          'https://images.pexels.com/photos/4686961/pexels-photo-4686961.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Washing Machine Repair':       'https://images.pexels.com/photos/4686958/pexels-photo-4686958.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Dryer Repair':                 'https://images.pexels.com/photos/5591663/pexels-photo-5591663.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Dishwasher Repair':            'https://images.pexels.com/photos/4686958/pexels-photo-4686958.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Oven & Stove Repair':          'https://images.pexels.com/photos/4686961/pexels-photo-4686961.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Microwave Repair':             'https://images.pexels.com/photos/1599791/pexels-photo-1599791.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Water Dispenser Repair':       'https://images.pexels.com/photos/4686961/pexels-photo-4686961.jpeg?auto=compress&cs=tinysrgb&w=800',
        'TV & Electronics Repair':      'https://images.pexels.com/photos/1201996/pexels-photo-1201996.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Air Purifier Service':         'https://images.pexels.com/photos/4686958/pexels-photo-4686958.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Water Heater Repair':          'https://images.pexels.com/photos/4686961/pexels-photo-4686961.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Small Appliance Repair':       'https://images.pexels.com/photos/4686958/pexels-photo-4686958.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Generator Servicing':          'https://images.pexels.com/photos/4686961/pexels-photo-4686961.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    'Moving Services': {
        'Local Moving':                 'https://images.pexels.com/photos/7464205/pexels-photo-7464205.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Home Shifting':                'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Office Relocation':            'https://images.pexels.com/photos/7464205/pexels-photo-7464205.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Furniture Moving':             'https://images.pexels.com/photos/5974396/pexels-photo-5974396.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Packing Service':              'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Unpacking Service':            'https://images.pexels.com/photos/7464205/pexels-photo-7464205.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Piano & Heavy Item Moving':    'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Storage & Warehousing':        'https://images.pexels.com/photos/4246119/pexels-photo-4246119.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Vehicle Transport':            'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Single Item Moving':           'https://images.pexels.com/photos/7464205/pexels-photo-7464205.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Truck Rental with Driver':     'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Express Moving':               'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    'Laundry Services': {
        'Wash & Fold':                  'https://images.pexels.com/photos/5591663/pexels-photo-5591663.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Wash & Iron':                  'https://images.pexels.com/photos/5591581/pexels-photo-5591581.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Dry Cleaning':                 'https://images.pexels.com/photos/5591581/pexels-photo-5591581.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Ironing Only':                 'https://images.pexels.com/photos/5591663/pexels-photo-5591663.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Blanket & Comforter Cleaning': 'https://images.pexels.com/photos/5591581/pexels-photo-5591581.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Curtain Cleaning':             'https://images.pexels.com/photos/5591663/pexels-photo-5591663.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Suit & Formal Wear Cleaning':  'https://images.pexels.com/photos/5591581/pexels-photo-5591581.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Shoe Cleaning':                'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Carpet Cleaning':              'https://images.pexels.com/photos/5591663/pexels-photo-5591663.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Express Laundry':              'https://images.pexels.com/photos/5591581/pexels-photo-5591581.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Leather & Suede Cleaning':     'https://images.pexels.com/photos/5591581/pexels-photo-5591581.jpeg?auto=compress&cs=tinysrgb&w=800',
        'Subscription Laundry':         'https://images.pexels.com/photos/5591663/pexels-photo-5591663.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
}

total_added = 0

for cat_name, services_list in missing_services.items():
    try:
        category = ServiceCategory.objects.get(name=cat_name)
        count = 0
        for svc_data in services_list:
            service, created = Service.objects.get_or_create(
                name=svc_data['name'],
                category=category,
                defaults={
                    'description': svc_data['desc'],
                    'price': Decimal(svc_data['price']),
                }
            )
            if created:
                # Add image
                img_url = category_images.get(cat_name, {}).get(svc_data['name'])
                if img_url:
                    ServiceImage.objects.create(service=service, image=img_url)
                count += 1
                total_added += 1

        print(f'✅ {cat_name}: {count} services added')
    except ServiceCategory.DoesNotExist:
        print(f'❌ Category not found: {cat_name}')

print(f'\n📊 Final Summary:')
for cat in ServiceCategory.objects.all():
    count = Service.objects.filter(category=cat).count()
    status = '✅' if count > 0 else '❌'
    print(f'  {status} {cat.name}: {count} services')

print(f'\n✅ Total new services added: {total_added}')
print(f'📦 Total services in database: {Service.objects.count()}')
