from rest_framework import permissions


class IsReviewOwnerOrAdmin(permissions.BasePermission):
    """
    - Anyone authenticated can POST (create) a review.
    - Only the review owner or admin can edit/delete.
    - All authenticated users can read.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user and request.user.is_authenticated and request.user.role == 'admin':
            return True
        return obj.client == request.user


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
