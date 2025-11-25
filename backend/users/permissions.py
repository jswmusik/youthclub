from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    """
    Allows access only to Super Admins.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'SUPER_ADMIN')

class IsMunicipalityAdmin(permissions.BasePermission):
    """
    Allows access to Super Admins OR Municipality Admins.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN']