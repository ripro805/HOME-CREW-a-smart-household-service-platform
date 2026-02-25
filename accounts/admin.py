

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, ClientProfile

@admin.register(User)
class UserAdmin(BaseUserAdmin):
	model = User
	list_display = ('email', 'first_name', 'last_name', 'role', 'is_staff', 'is_superuser')
	list_filter = ('role', 'is_staff', 'is_superuser')
	search_fields = ('email', 'first_name', 'last_name')
	ordering = ('email',)
	fieldsets = (
		(None, {'fields': ('email', 'password', 'role')}),
		('Personal info', {'fields': ('first_name', 'last_name', 'address', 'phone_number')}),
		('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
		('Important dates', {'fields': ('last_login', 'date_joined')}),
	)
	add_fieldsets = (
		(None, {
			'classes': ('wide',),
			'fields': ('email', 'password1', 'password2', 'role', 'first_name', 'last_name', 'address', 'phone_number'),
		}),
	)


@admin.register(ClientProfile)
class ClientProfileAdmin(admin.ModelAdmin):
	list_display = ("user", "bio")
	search_fields = ("user__email", "user__first_name", "user__last_name")
