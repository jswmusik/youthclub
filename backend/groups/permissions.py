from rest_framework import permissions

class IsGroupAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to ensure:
    - Super Admins can do anything.
    - Muni Admins can edit groups in their municipality.
    - Club Admins can edit groups in their club.
    - Others can only read (SAFE_METHODS).
    """
    def has_permission(self, request, view):
        # Allow anyone logged in to view the list (filtering happens in get_queryset)
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Only Admins can create/edit/delete
        return request.user.role in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True

        user = request.user
        if user.role == 'SUPER_ADMIN':
            return True
        
        # Muni Admin can edit if group belongs to their muni OR a club in their muni
        if user.role == 'MUNICIPALITY_ADMIN':
            if obj.municipality == user.assigned_municipality:
                return True
            if obj.club and obj.club.municipality == user.assigned_municipality:
                return True
                
        # Club Admin can edit if group belongs to their club
        if user.role == 'CLUB_ADMIN':
            if obj.club == user.assigned_club:
                return True

        return False

class IsGroupMembershipAdmin(permissions.BasePermission):
    """
    Permission for managing Group Memberships (Approving/Rejecting).
    """
    def has_permission(self, request, view):
        # Only admins can access this endpoint
        return request.user.is_authenticated and request.user.role in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']

    def has_object_permission(self, request, view, obj):
        # obj is a GroupMembership instance
        user = request.user
        group = obj.group
        
        if user.role == 'SUPER_ADMIN':
            return True
        
        # Muni Admin: Owns the group directly OR owns the club the group belongs to
        if user.role == 'MUNICIPALITY_ADMIN':
            return (group.municipality == user.assigned_municipality) or \
                   (group.club and group.club.municipality == user.assigned_municipality)
                
        # Club Admin: Owns the club the group belongs to
        if user.role == 'CLUB_ADMIN':
            return group.club == user.assigned_club

        return False