# -*- coding: utf-8 -*-
"""
Premium image assignment for ALL services
"""
from services.models import Service, ServiceImage, ServiceCategory

# Complete map: exact service name -> premium Pexels image URL
SERVICE_IMAGES = {

    # ── House Cleaning ─────────────────────────────────────────────────────────
    'House Cleaning - Basic':               'https://images.pexels.com/photos/4107112/pexels-photo-4107112.jpeg?auto=compress&cs=tinysrgb&w=900',
    'House Cleaning - Basic - Express':     'https://images.pexels.com/photos/4107112/pexels-photo-4107112.jpeg?auto=compress&cs=tinysrgb&w=900',
    'House Cleaning - Basic - Standard':    'https://images.pexels.com/photos/4107112/pexels-photo-4107112.jpeg?auto=compress&cs=tinysrgb&w=900',
    'House Cleaning - Standard':            'https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg?auto=compress&cs=tinysrgb&w=900',
    'House Cleaning - Standard - Express':  'https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg?auto=compress&cs=tinysrgb&w=900',
    'House Cleaning - Standard - Standard': 'https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg?auto=compress&cs=tinysrgb&w=900',
    'House Cleaning - Premium':             'https://images.pexels.com/photos/3768914/pexels-photo-3768914.jpeg?auto=compress&cs=tinysrgb&w=900',
    'House Cleaning - Premium - Express':   'https://images.pexels.com/photos/3768914/pexels-photo-3768914.jpeg?auto=compress&cs=tinysrgb&w=900',
    'House Cleaning - Premium - Standard':  'https://images.pexels.com/photos/3768914/pexels-photo-3768914.jpeg?auto=compress&cs=tinysrgb&w=900',
    'House Cleaning - Deluxe':              'https://images.pexels.com/photos/5591664/pexels-photo-5591664.jpeg?auto=compress&cs=tinysrgb&w=900',
    'House Cleaning - Deluxe - Express':    'https://images.pexels.com/photos/5591664/pexels-photo-5591664.jpeg?auto=compress&cs=tinysrgb&w=900',
    'House Cleaning - Deluxe - Standard':   'https://images.pexels.com/photos/5591664/pexels-photo-5591664.jpeg?auto=compress&cs=tinysrgb&w=900',

    # ── Deep Cleaning ──────────────────────────────────────────────────────────
    'Deep Cleaning - Kitchen':              'https://images.pexels.com/photos/6197117/pexels-photo-6197117.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Deep Cleaning - Kitchen - Express':    'https://images.pexels.com/photos/6197117/pexels-photo-6197117.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Deep Cleaning - Kitchen - Standard':   'https://images.pexels.com/photos/6197117/pexels-photo-6197117.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Deep Cleaning - Bathroom':             'https://images.pexels.com/photos/4239031/pexels-photo-4239031.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Deep Cleaning - Bathroom - Express':   'https://images.pexels.com/photos/4239031/pexels-photo-4239031.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Deep Cleaning - Bathroom - Standard':  'https://images.pexels.com/photos/4239031/pexels-photo-4239031.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Deep Cleaning - Bedroom':              'https://images.pexels.com/photos/6028596/pexels-photo-6028596.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Deep Cleaning - Bedroom - Express':    'https://images.pexels.com/photos/6028596/pexels-photo-6028596.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Deep Cleaning - Bedroom - Standard':   'https://images.pexels.com/photos/6028596/pexels-photo-6028596.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Deep Cleaning - Full House':           'https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Deep Cleaning - Full House - Express': 'https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Deep Cleaning - Full House - Standard':'https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&w=900',

    # ── Plumbing ───────────────────────────────────────────────────────────────
    'Plumbing - Leak Repair':               'https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Plumbing - Leak Repair - Express':     'https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Plumbing - Leak Repair - Standard':    'https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Plumbing - Pipe Installation':         'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Plumbing - Pipe Installation - Express':'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Plumbing - Pipe Installation - Standard':'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Plumbing - Drain Cleaning':            'https://images.pexels.com/photos/6419148/pexels-photo-6419148.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Plumbing - Drain Cleaning - Express':  'https://images.pexels.com/photos/6419148/pexels-photo-6419148.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Plumbing - Drain Cleaning - Standard': 'https://images.pexels.com/photos/6419148/pexels-photo-6419148.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Plumbing - Faucet Repair':             'https://images.pexels.com/photos/7641853/pexels-photo-7641853.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Plumbing - Faucet Repair - Express':   'https://images.pexels.com/photos/7641853/pexels-photo-7641853.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Plumbing - Faucet Repair - Standard':  'https://images.pexels.com/photos/7641853/pexels-photo-7641853.jpeg?auto=compress&cs=tinysrgb&w=900',

    # ── Electrical Work ────────────────────────────────────────────────────────
    'Electrical - Wiring':                  'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Electrical - Wiring - Express':        'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Electrical - Wiring - Standard':       'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Electrical - Light Installation':      'https://images.pexels.com/photos/1123262/pexels-photo-1123262.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Electrical - Light Installation - Express': 'https://images.pexels.com/photos/1123262/pexels-photo-1123262.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Electrical - Light Installation - Standard':'https://images.pexels.com/photos/1123262/pexels-photo-1123262.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Electrical - Socket Repair':           'https://images.pexels.com/photos/8005397/pexels-photo-8005397.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Electrical - Socket Repair - Express': 'https://images.pexels.com/photos/8005397/pexels-photo-8005397.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Electrical - Socket Repair - Standard':'https://images.pexels.com/photos/8005397/pexels-photo-8005397.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Electrical - Panel Upgrade':           'https://images.pexels.com/photos/5691659/pexels-photo-5691659.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Electrical - Panel Upgrade - Express': 'https://images.pexels.com/photos/5691659/pexels-photo-5691659.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Electrical - Panel Upgrade - Standard':'https://images.pexels.com/photos/5691659/pexels-photo-5691659.jpeg?auto=compress&cs=tinysrgb&w=900',

    # ── Painting ───────────────────────────────────────────────────────────────
    'Painting - Interior':                  'https://images.pexels.com/photos/6474471/pexels-photo-6474471.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Painting - Interior - Express':        'https://images.pexels.com/photos/6474471/pexels-photo-6474471.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Painting - Interior - Standard':       'https://images.pexels.com/photos/6474471/pexels-photo-6474471.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Painting - Exterior':                  'https://images.pexels.com/photos/7641840/pexels-photo-7641840.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Painting - Exterior - Express':        'https://images.pexels.com/photos/7641840/pexels-photo-7641840.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Painting - Exterior - Standard':       'https://images.pexels.com/photos/7641840/pexels-photo-7641840.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Painting - Room':                      'https://images.pexels.com/photos/6474474/pexels-photo-6474474.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Painting - Room - Express':            'https://images.pexels.com/photos/6474474/pexels-photo-6474474.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Painting - Room - Standard':           'https://images.pexels.com/photos/6474474/pexels-photo-6474474.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Painting - Full House':                'https://images.pexels.com/photos/6474473/pexels-photo-6474473.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Painting - Full House - Express':      'https://images.pexels.com/photos/6474473/pexels-photo-6474473.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Painting - Full House - Standard':     'https://images.pexels.com/photos/6474473/pexels-photo-6474473.jpeg?auto=compress&cs=tinysrgb&w=900',

    # ── Carpentry ──────────────────────────────────────────────────────────────
    'Carpentry - Furniture Assembly':           'https://images.pexels.com/photos/5974396/pexels-photo-5974396.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Carpentry - Furniture Assembly - Express': 'https://images.pexels.com/photos/5974396/pexels-photo-5974396.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Carpentry - Furniture Assembly - Standard':'https://images.pexels.com/photos/5974396/pexels-photo-5974396.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Carpentry - Cabinet Installation':         'https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Carpentry - Cabinet Installation - Express':'https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Carpentry - Cabinet Installation - Standard':'https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Carpentry - Door Repair':                  'https://images.pexels.com/photos/7691073/pexels-photo-7691073.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Carpentry - Door Repair - Express':        'https://images.pexels.com/photos/7691073/pexels-photo-7691073.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Carpentry - Door Repair - Standard':       'https://images.pexels.com/photos/7691073/pexels-photo-7691073.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Carpentry - Custom Work':                  'https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Carpentry - Custom Work - Express':        'https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Carpentry - Custom Work - Standard':       'https://images.pexels.com/photos/1249611/pexels-photo-1249611.jpeg?auto=compress&cs=tinysrgb&w=900',

    # ── Gardening ──────────────────────────────────────────────────────────────
    'Gardening - Lawn Mowing':              'https://images.pexels.com/photos/1301856/pexels-photo-1301856.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Gardening - Lawn Mowing - Express':    'https://images.pexels.com/photos/1301856/pexels-photo-1301856.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Gardening - Lawn Mowing - Standard':   'https://images.pexels.com/photos/1301856/pexels-photo-1301856.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Gardening - Tree Trimming':            'https://images.pexels.com/photos/1072824/pexels-photo-1072824.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Gardening - Tree Trimming - Express':  'https://images.pexels.com/photos/1072824/pexels-photo-1072824.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Gardening - Tree Trimming - Standard': 'https://images.pexels.com/photos/1072824/pexels-photo-1072824.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Gardening - Weed Control':             'https://images.pexels.com/photos/1484767/pexels-photo-1484767.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Gardening - Weed Control - Express':   'https://images.pexels.com/photos/1484767/pexels-photo-1484767.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Gardening - Weed Control - Standard':  'https://images.pexels.com/photos/1484767/pexels-photo-1484767.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Gardening - Landscaping':              'https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Gardening - Landscaping - Express':    'https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Gardening - Landscaping - Standard':   'https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=900',

    # ── Pest Control ───────────────────────────────────────────────────────────
    'Pest Control - Termite':               'https://images.pexels.com/photos/4259140/pexels-photo-4259140.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Pest Control - Termite - Express':     'https://images.pexels.com/photos/4259140/pexels-photo-4259140.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Pest Control - Termite - Standard':    'https://images.pexels.com/photos/4259140/pexels-photo-4259140.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Pest Control - Rodent':                'https://images.pexels.com/photos/8134840/pexels-photo-8134840.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Pest Control - Rodent - Express':      'https://images.pexels.com/photos/8134840/pexels-photo-8134840.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Pest Control - Rodent - Standard':     'https://images.pexels.com/photos/8134840/pexels-photo-8134840.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Pest Control - Insect':                'https://images.pexels.com/photos/7725960/pexels-photo-7725960.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Pest Control - Insect - Express':      'https://images.pexels.com/photos/7725960/pexels-photo-7725960.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Pest Control - Insect - Standard':     'https://images.pexels.com/photos/7725960/pexels-photo-7725960.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Pest Control - General':               'https://images.pexels.com/photos/4259140/pexels-photo-4259140.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Pest Control - General - Express':     'https://images.pexels.com/photos/4259140/pexels-photo-4259140.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Pest Control - General - Standard':    'https://images.pexels.com/photos/4259140/pexels-photo-4259140.jpeg?auto=compress&cs=tinysrgb&w=900',

    # ── AC Repair ──────────────────────────────────────────────────────────────
    'AC Repair - Maintenance':              'https://images.pexels.com/photos/8774459/pexels-photo-8774459.jpeg?auto=compress&cs=tinysrgb&w=900',
    'AC Repair - Maintenance - Express':    'https://images.pexels.com/photos/8774459/pexels-photo-8774459.jpeg?auto=compress&cs=tinysrgb&w=900',
    'AC Repair - Maintenance - Standard':   'https://images.pexels.com/photos/8774459/pexels-photo-8774459.jpeg?auto=compress&cs=tinysrgb&w=900',
    'AC Repair - Installation':             'https://images.pexels.com/photos/7031703/pexels-photo-7031703.jpeg?auto=compress&cs=tinysrgb&w=900',

    # ── Appliance Repair ───────────────────────────────────────────────────────
    'Refrigerator Repair':                  'https://images.pexels.com/photos/4686961/pexels-photo-4686961.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Washing Machine Repair':               'https://images.pexels.com/photos/4686958/pexels-photo-4686958.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Dryer Repair':                         'https://images.pexels.com/photos/5591663/pexels-photo-5591663.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Dishwasher Repair':                    'https://images.pexels.com/photos/4108793/pexels-photo-4108793.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Oven & Stove Repair':                  'https://images.pexels.com/photos/4686961/pexels-photo-4686961.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Microwave Repair':                     'https://images.pexels.com/photos/1599791/pexels-photo-1599791.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Water Dispenser Repair':               'https://images.pexels.com/photos/3943882/pexels-photo-3943882.jpeg?auto=compress&cs=tinysrgb&w=900',
    'TV & Electronics Repair':              'https://images.pexels.com/photos/1201996/pexels-photo-1201996.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Air Purifier Service':                 'https://images.pexels.com/photos/7031703/pexels-photo-7031703.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Water Heater Repair':                  'https://images.pexels.com/photos/8486944/pexels-photo-8486944.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Small Appliance Repair':               'https://images.pexels.com/photos/4108793/pexels-photo-4108793.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Generator Servicing':                  'https://images.pexels.com/photos/5691659/pexels-photo-5691659.jpeg?auto=compress&cs=tinysrgb&w=900',

    # ── Moving Services ────────────────────────────────────────────────────────
    'Local Moving':                         'https://images.pexels.com/photos/7464205/pexels-photo-7464205.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Home Shifting':                        'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Office Relocation':                    'https://images.pexels.com/photos/7464215/pexels-photo-7464215.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Furniture Moving':                     'https://images.pexels.com/photos/5974396/pexels-photo-5974396.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Packing Service':                      'https://images.pexels.com/photos/4246119/pexels-photo-4246119.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Unpacking Service':                    'https://images.pexels.com/photos/7464205/pexels-photo-7464205.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Piano & Heavy Item Moving':            'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Storage & Warehousing':                'https://images.pexels.com/photos/4246119/pexels-photo-4246119.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Vehicle Transport':                    'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Single Item Moving':                   'https://images.pexels.com/photos/7464205/pexels-photo-7464205.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Truck Rental with Driver':             'https://images.pexels.com/photos/1121796/pexels-photo-1121796.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Express Moving':                       'https://images.pexels.com/photos/7464215/pexels-photo-7464215.jpeg?auto=compress&cs=tinysrgb&w=900',

    # ── Laundry Services ───────────────────────────────────────────────────────
    'Wash & Fold':                          'https://images.pexels.com/photos/5591663/pexels-photo-5591663.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Wash & Iron':                          'https://images.pexels.com/photos/5591581/pexels-photo-5591581.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Dry Cleaning':                         'https://images.pexels.com/photos/6068967/pexels-photo-6068967.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Ironing Only':                         'https://images.pexels.com/photos/5591581/pexels-photo-5591581.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Blanket & Comforter Cleaning':         'https://images.pexels.com/photos/4963842/pexels-photo-4963842.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Curtain Cleaning':                     'https://images.pexels.com/photos/6489083/pexels-photo-6489083.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Suit & Formal Wear Cleaning':          'https://images.pexels.com/photos/6068967/pexels-photo-6068967.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Shoe Cleaning':                        'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Carpet Cleaning':                      'https://images.pexels.com/photos/6195949/pexels-photo-6195949.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Express Laundry':                      'https://images.pexels.com/photos/5591663/pexels-photo-5591663.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Leather & Suede Cleaning':             'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=900',
    'Subscription Laundry':                 'https://images.pexels.com/photos/5591581/pexels-photo-5591581.jpeg?auto=compress&cs=tinysrgb&w=900',
}

print('Updating all service images with premium quality photos...\n')

updated = 0
not_found = []

for service in Service.objects.all():
    img_url = SERVICE_IMAGES.get(service.name)
    if img_url:
        service.images.all().delete()
        ServiceImage.objects.create(service=service, image=img_url)
        updated += 1
    else:
        not_found.append(service.name)

print(f'✅ Successfully updated: {updated} services')

if not_found:
    print(f'\n⚠️  No image mapping found for {len(not_found)} services:')
    for name in not_found:
        print(f'  - {name}')

print(f'\n📊 Total services in DB: {Service.objects.count()}')
print('✅ All images updated with premium quality!')
