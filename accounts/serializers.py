
from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer, UserSerializer as BaseUserSerializer
from rest_framework import serializers
from .models import User

# Djoser custom user create serializer matching your User model
class UserCreateSerializer(BaseUserCreateSerializer):
    class Meta(BaseUserCreateSerializer.Meta):
        model = User
        fields = ['id', 'email', 'password', 'first_name', 'last_name', 'role', 'address', 'phone_number']
        read_only_fields = ['role']
        ref_name = 'CustomUserCreate'

    def create(self, validated_data):
        # Always set role to 'client' on registration
        validated_data['role'] = 'client'
        user = super().create(validated_data)
        return user
class UserSerializer(BaseUserSerializer):
    profile_pic = serializers.SerializerMethodField()

    def get_profile_pic(self, obj):
        profile = getattr(obj, 'profile', None)
        if not profile or not profile.profile_pic:
            return None
        try:
            return profile.profile_pic.url
        except Exception:
            return str(profile.profile_pic)

    class Meta(BaseUserSerializer.Meta):
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'address', 'phone_number', 'is_active', 'date_joined', 'profile_pic']
        ref_name = 'CustomUser'