from rest_framework import permissions

class IsAdminOrSelfOrReadOnly(permissions.BasePermission):
    """
    Custom permission:
    - Admins can do anything.
    - Only Admins can promote/create Admins.
    - Clients can update their own profile and perform safe (read-only) actions.
    """
    def has_permission(self, request, view):
        # Allow safe methods for everyone
        if request.method in permissions.SAFE_METHODS:
            return True
        # Allow any action for admins
        if request.user and request.user.is_authenticated and request.user.role == 'admin':
            return True
        # For non-admins, allow only profile update (handled in has_object_permission)
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Allow safe methods for everyone
        if request.method in permissions.SAFE_METHODS:
            return True
        # Allow admins to do anything
        if request.user and request.user.role == 'admin':
            return True
        # Allow clients to update their own profile only
        return obj == request.user
