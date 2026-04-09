from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from api.permissions import IsAdminOrSelfOrReadOnly
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from .models import User, ClientProfile
from .serializers import UserSerializer
from rest_framework.decorators import api_view
from drf_yasg.utils import swagger_auto_schema

class UserViewSet(viewsets.ModelViewSet):

	@swagger_auto_schema(operation_description="""
	User Management Endpoint
	Features:
	1. Admins can list all users.
	2. Users can access and update their own profile.
	3. Supports GET, POST, PATCH, DELETE for user objects.
	4. Enforces role-based permissions.
	5. Returns user details including email, name, role, address, phone.
	""")
	def list(self, request, *args, **kwargs):
		return super().list(request, *args, **kwargs)

	@swagger_auto_schema(operation_description="""
	Retrieve a single user by ID.
	Features:
	1. Returns all details for a specific user.
	2. Includes email, name, role, address, phone.
	""")
	def retrieve(self, request, *args, **kwargs):
		return super().retrieve(request, *args, **kwargs)

	@swagger_auto_schema(operation_description="""
	Create a new user (admin only).
	Features:
	1. Accepts user details in request body.
	2. Returns created user object.
	""")
	def create(self, request, *args, **kwargs):
		return super().create(request, *args, **kwargs)

	@swagger_auto_schema(operation_description="""
	Update an existing user (admin only).
	Features:
	1. Accepts updated fields in request body.
	2. Returns updated user object.
	""")
	def update(self, request, *args, **kwargs):
		return super().update(request, *args, **kwargs)

	@swagger_auto_schema(operation_description="""
	Delete a user (admin only).
	Features:
	1. Removes user from system.
	2. Returns status 204 on success.
	""")
	def destroy(self, request, *args, **kwargs):
		return super().destroy(request, *args, **kwargs)

	queryset = User.objects.select_related('profile').all()
	serializer_class = UserSerializer

	def get_queryset(self):
		"""
		Avoid N+1 query when serializing profile_pic from related ClientProfile.
		Keeps admin user-list and technician panels responsive with large user counts.
		"""
		if getattr(self, 'swagger_fake_view', False):
			return User.objects.none()
		return User.objects.select_related('profile').all()

	def get_permissions(self):
		# Only admins can list all users, others can only access their own info
		if getattr(self, 'swagger_fake_view', False):
			return [AllowAny()]
		if self.action == 'list':
			return [IsAdminUser()]
		return [IsAdminOrSelfOrReadOnly()]

class RegisterView(APIView):
	"""
	User Registration Endpoint
	Features:
	1. Accepts email, password, first_name, last_name, and optional fields.
	2. Validates uniqueness of email.
	3. Creates new user with 'client' role.
	4. Returns registration success or error message.
	"""
	permission_classes = [AllowAny]

	def post(self, request):
		email = request.data.get('email')
		password = request.data.get('password')
		first_name = request.data.get('first_name', '')
		last_name = request.data.get('last_name', '')
		phone_number = request.data.get('phone_number', '')
		address = request.data.get('address', '')
		
		if not email or not password:
			return Response({'error': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)
		
		if User.objects.filter(email=email).exists():
			return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)
		
		user = User.objects.create_user(
			email=email, 
			password=password, 
			first_name=first_name,
			last_name=last_name,
			phone_number=phone_number,
			address=address,
			role='client'
		)
		
		return Response({
			'message': 'User registered successfully',
			'user': {
				'id': user.id,
				'email': user.email,
				'first_name': user.first_name,
				'last_name': user.last_name
			}
		}, status=status.HTTP_201_CREATED)

class UserLoginView(APIView):
	"""
	User Login Endpoint
	Features:
	1. Accepts email and password.
	2. Authenticates user and returns token.
	3. Returns user ID and role on success.
	4. Returns error message on failure.
	"""
	permission_classes = [AllowAny]

	def post(self, request):
		email = request.data.get('email')
		password = request.data.get('password')
		
		if not email or not password:
			return Response({'error': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)
		
		# Authenticate using email (USERNAME_FIELD)
		user = authenticate(request, username=email, password=password)
		
		if user is not None:
			token, created = Token.objects.get_or_create(user=user)
			return Response({
				'token': token.key, 
				'user_id': user.id, 
				'role': user.role,
				'email': user.email
			})
		else:
			return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

	permission_classes = [IsAdminOrSelfOrReadOnly]
	def get(self, request):
		try:
			profile = request.user.profile
		except ClientProfile.DoesNotExist:
			profile = ClientProfile.objects.create(user=request.user)
		# No serializer, return model fields directly
		data = {
			'user': profile.user.id,
			'bio': profile.bio,
			'profile_pic': profile.profile_pic.url if profile.profile_pic else None,
			'social_links': profile.social_links,
		}
		return Response(data)
	def put(self, request):
		try:
			profile = request.user.profile
		except ClientProfile.DoesNotExist:
			profile = ClientProfile.objects.create(user=request.user)
		# Update fields manually
		profile.bio = request.data.get('bio', profile.bio)
		profile.profile_pic = request.data.get('profile_pic', profile.profile_pic)
		profile.social_links = request.data.get('social_links', profile.social_links)
		profile.save()
		data = {
			'user': profile.user.id,
			'bio': profile.bio,
			'profile_pic': profile.profile_pic.url if profile.profile_pic else None,
			'social_links': profile.social_links,
		}
		return Response(data)

	permission_classes = [IsAdminOrSelfOrReadOnly]
	def get(self, request):
		orders = request.user.orders.all().prefetch_related('services')
		history = []
		for order in orders:
			for service in order.services.all():
				history.append({
					'order_id': order.id,
					'service_id': service.id,
					'service_name': service.name,
					'status': order.status,
					'ordered_at': order.created_at
				})
		return Response(history)

	permission_classes = [IsAuthenticated, IsAdminOrSelfOrReadOnly]
	def post(self, request):
		user_id = request.data.get('user_id')
		try:
			user = User.objects.get(pk=user_id)
			user.role = 'admin'
			user.save()
			return Response({'message': f'{user.username} promoted to admin'})
		except User.DoesNotExist:
			return Response({'error': 'User not found'}, status=404)


# User Registration
from rest_framework import status
from django.contrib.auth import authenticate, login
from rest_framework.authtoken.models import Token
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
	username = request.data.get('username')
	password = request.data.get('password')
	email = request.data.get('email')
	if not username or not password:
		return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)
	if User.objects.filter(username=username).exists():
		return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
	user = User.objects.create_user(username=username, password=password, email=email)
	Token.objects.create(user=user)
	return Response({'message': 'User registered successfully'}, status=status.HTTP_201_CREATED)

# User Login
@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
	username = request.data.get('username')
	password = request.data.get('password')
	user = authenticate(request, username=username, password=password)
	if user is not None:
		token, created = Token.objects.get_or_create(user=user)
		return Response({'token': token.key, 'user_id': user.id, 'role': user.role})
	else:
		return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

# Profile Management
@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAdminOrSelfOrReadOnly])
def profile(request):
		"""
		User Profile Endpoint
		Features:
		1. GET: Retrieve complete profile info (User + ClientProfile data).
		2. PUT/PATCH: Update profile fields (User and ClientProfile).
		3. Auto-creates profile if missing.
		4. Returns updated profile data.
		"""
		try:
			profile = request.user.profile
		except ClientProfile.DoesNotExist:
			profile = ClientProfile.objects.create(user=request.user)
		
		if request.method == 'GET':
			data = {
				'id': request.user.id,
				'email': request.user.email,
				'first_name': request.user.first_name,
				'last_name': request.user.last_name,
				'phone_number': request.user.phone_number,
				'address': request.user.address,
				'role': request.user.role,
				'date_joined': request.user.date_joined,
				'bio': profile.bio,
				'profile_pic': profile.profile_pic.url if profile.profile_pic else None,
				'social_links': profile.social_links,
			}
			return Response(data)
		
		elif request.method in ['PUT', 'PATCH']:
			# Update User fields
			user = request.user
			if 'first_name' in request.data:
				user.first_name = request.data['first_name']
			if 'last_name' in request.data:
				user.last_name = request.data['last_name']
			if 'phone_number' in request.data:
				user.phone_number = request.data['phone_number']
			if 'address' in request.data:
				user.address = request.data['address']
			user.save()
			
			# Update ClientProfile fields
			if 'bio' in request.data:
				profile.bio = request.data['bio']
			if 'profile_pic' in request.FILES:
				profile.profile_pic = request.FILES['profile_pic']
			elif 'profile_pic' in request.data and request.data['profile_pic'] is None:
				profile.profile_pic = None
			if 'social_links' in request.data:
				profile.social_links = request.data['social_links']
			profile.save()
			
			data = {
				'id': user.id,
				'email': user.email,
				'first_name': user.first_name,
				'last_name': user.last_name,
				'phone_number': user.phone_number,
				'address': user.address,
				'role': user.role,
				'date_joined': user.date_joined,
				'bio': profile.bio,
				'profile_pic': profile.profile_pic.url if profile.profile_pic else None,
				'social_links': profile.social_links,
			}
			return Response(data)

# Client service history
@api_view(['GET'])
@permission_classes([IsAdminOrSelfOrReadOnly])
def service_history(request):
		"""
		Service History Endpoint
		Features:
		1. GET: Retrieve all services ordered by the user.
		2. Returns order ID, service ID, name, status, and date.
		3. Useful for client dashboards and history tracking.
		"""
		orders = request.user.orders.prefetch_related('items__service').all()
		history = []
		for order in orders:
			for item in order.items.all():
				service = item.service
				if not service:
					continue
				history.append({
					'order_id': order.id,
					'service_id': service.id,
					'service_name': service.name,
					'status': order.status,
					'ordered_at': order.created_at
				})
		return Response(history)

@api_view(['GET', 'PUT', 'DELETE'])
def account_detail(request, pk):
	try:
		user = User.objects.get(pk=pk)
	except User.DoesNotExist:
		return Response({'error': 'User not found'}, status=404)
	if request.method == 'GET':
		data = {
			'id': user.id,
			'email': user.email,
			'first_name': user.first_name,
			'last_name': user.last_name,
			'role': user.role,
		}
		return Response(data)
	elif request.method == 'PUT':
		user.first_name = request.data.get('first_name', user.first_name)
		user.last_name = request.data.get('last_name', user.last_name)
		user.role = request.data.get('role', user.role)
		user.save()
		data = {
			'id': user.id,
			'email': user.email,
			'first_name': user.first_name,
			'last_name': user.last_name,
			'role': user.role,
		}
		return Response(data)
	elif request.method == 'DELETE':
		user.delete()
		return Response({'message': 'User deleted'})

# Admin promotion (admin only)
from rest_framework.permissions import IsAdminUser

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminOrSelfOrReadOnly])
def promote_to_admin(request):
	user_id = request.data.get('user_id')
	try:
		user = User.objects.get(pk=user_id)
		user.role = 'admin'
		user.save()
		return Response({'message': f'{user.username} promoted to admin'})
	except User.DoesNotExist:
		return Response({'error': 'User not found'}, status=404)
