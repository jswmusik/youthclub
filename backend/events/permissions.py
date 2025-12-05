from rest_framework import permissions


class IsEventOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an event to edit/upload media.
    """
    def has_permission(self, request, view):
        # Allow read-only to authenticated users (or stick to your strict policy)
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return True

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner (via Organization scope)
        user = request.user
        event = obj if hasattr(obj, 'municipality') else obj.event # Handle both Event and EventImage/Doc

        if user.role == 'SUPER_ADMIN':
            return True
        
        if user.role == 'MUNICIPALITY_ADMIN':
            return event.municipality == user.assigned_municipality
            
        if user.role == 'CLUB_ADMIN':
            return event.club == user.assigned_club
            
        return False

