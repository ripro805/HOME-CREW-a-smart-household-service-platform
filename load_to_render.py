import os, json, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'house_hold_service.settings')
django.setup()
from decouple import config
db_url = config('DATABASE_URL', default=None)
print(f"Connected to: {db_url[:50] if db_url else 'SQLite'}...")
from accounts.models import User
from services.models import ServiceCategory, Service, ServiceImage, Review
from orders.models import Order

print("=== Loading data to Render PostgreSQL ===")

with open('categories_data.json', 'r', encoding='utf-8') as f:
    cats_json = json.load(f)
existing = set(ServiceCategory.objects.values_list('id', flat=True))
to_create = [ServiceCategory(id=i['pk'], name=i['fields']['name'], description=i['fields'].get('description','')) for i in cats_json if i['model']=='services.servicecategory' and i['pk'] not in existing]
ServiceCategory.objects.bulk_create(to_create, ignore_conflicts=True)
print(f"[1/6] Categories: {ServiceCategory.objects.count()} total")

with open('services_main_data.json', 'r', encoding='utf-8') as f:
    svcs_json = json.load(f)
cat_map = {c.id: c for c in ServiceCategory.objects.all()}
existing = set(Service.objects.values_list('id', flat=True))
to_create = [Service(id=i['pk'], name=i['fields']['name'], description=i['fields'].get('description',''), price=i['fields'].get('price',0), category=cat_map.get(i['fields'].get('category'))) for i in svcs_json if i['model']=='services.service' and i['pk'] not in existing]
Service.objects.bulk_create(to_create, ignore_conflicts=True)
print(f"[2/6] Services: {Service.objects.count()} total")

with open('serviceimages_data.json', 'r', encoding='utf-8') as f:
    imgs_json = json.load(f)
svc_map = {s.id: s for s in Service.objects.all()}
existing = set(ServiceImage.objects.values_list('id', flat=True))
to_create = [ServiceImage(id=i['pk'], service=svc_map.get(i['fields'].get('service')), image_url=i['fields'].get('image_url','') or '', image_file=i['fields'].get('image_file','') or '') for i in imgs_json if i['model']=='services.serviceimage' and i['pk'] not in existing and svc_map.get(i['fields'].get('service'))]
ServiceImage.objects.bulk_create(to_create, ignore_conflicts=True)
print(f"[3/6] ServiceImages: {ServiceImage.objects.count()} total")

with open('accounts_data.json', 'r', encoding='utf-8') as f:
    acc_json = json.load(f)
existing = set(User.objects.values_list('id', flat=True))
to_create = [User(id=i['pk'], email=i['fields']['email'], password=i['fields']['password'], first_name=i['fields'].get('first_name',''), last_name=i['fields'].get('last_name',''), is_staff=i['fields'].get('is_staff',False), is_superuser=i['fields'].get('is_superuser',False), is_active=i['fields'].get('is_active',True), date_joined=i['fields'].get('date_joined'), phone_number=i['fields'].get('phone_number',''), address=i['fields'].get('address',''), role=i['fields'].get('role','client')) for i in acc_json if i['model']=='accounts.user' and i['pk'] not in existing]
User.objects.bulk_create(to_create, ignore_conflicts=True)
print(f"[4/6] Users: {User.objects.count()} total")

with open('reviews_data.json', 'r', encoding='utf-8') as f:
    revs_json = json.load(f)
user_map = {u.id: u for u in User.objects.all()}
svc_map = {s.id: s for s in Service.objects.all()}
existing = set(Review.objects.values_list('id', flat=True))
to_create = [Review(id=i['pk'], service=svc_map.get(i['fields'].get('service')), client=user_map.get(i['fields'].get('client')), rating=i['fields'].get('rating',5), comment=i['fields'].get('comment',''), created_at=i['fields'].get('created_at')) for i in revs_json if i['model']=='services.review' and i['pk'] not in existing and svc_map.get(i['fields'].get('service')) and user_map.get(i['fields'].get('client'))]
Review.objects.bulk_create(to_create, ignore_conflicts=True)
print(f"[5/6] Reviews: {Review.objects.count()} total")

with open('orders_data.json', 'r', encoding='utf-8') as f:
    ords_json = json.load(f)
existing = set(Order.objects.values_list('id', flat=True))
to_create = [Order(id=i['pk'], client=user_map.get(i['fields'].get('client')), status=i['fields'].get('status','pending'), total_price=i['fields'].get('total_price',0), created_at=i['fields'].get('created_at')) for i in ords_json if i['model']=='orders.order' and i['pk'] not in existing and user_map.get(i['fields'].get('client'))]
Order.objects.bulk_create(to_create, ignore_conflicts=True)
print(f"[6/6] Orders: {Order.objects.count()} total")

print("=== DONE === Categories:{} Services:{} Images:{} Users:{} Reviews:{} Orders:{}".format(ServiceCategory.objects.count(), Service.objects.count(), ServiceImage.objects.count(), User.objects.count(), Review.objects.count(), Order.objects.count()))