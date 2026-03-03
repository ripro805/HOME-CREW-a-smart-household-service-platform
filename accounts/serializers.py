
from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer, UserSerializer as BaseUserSerializer
from .models import User

# Djoser custom user create serializer matching your User model
class UserCreateSerializer(BaseUserCreateSerializer):
    class Meta(BaseUserCreateSerializer.Meta):
        model = User
        fields = ['id', 'email', 'password', 'first_name', 'last_name', 'role', 'address', 'phone_number']
        read_only_fields = ['role']

    def create(self, validated_data):
        # Always set role to 'client' on registration
        validated_data['role'] = 'client'
        user = super().create(validated_data)
        return user
class UserSerializer(BaseUserSerializer):
    class Meta(BaseUserSerializer.Meta):
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'address', 'phone_number']