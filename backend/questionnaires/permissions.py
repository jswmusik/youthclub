from rest_framework import permissions

class IsQuestionnaireOwnerOrHigher(permissions.BasePermission):
    """
    Custom permission to only allow owners (or higher level admins) to edit a questionnaire.
    - Super Admin: Can edit everything.
    - Municipality Admin: Can edit questionnaires in their municipality.
    - Club Admin: Can edit questionnaires in their club.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any authenticated admin user 
        # (Filtering is done in the ViewSet queryset, not here)
        if request.method in permissions.SAFE_METHODS:
            return True

        user = request.user
        
        # 1. Super Admin
        if user.role == 'SUPER_ADMIN':
            return True

        # 2. Municipality Admin
        if user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            # Can edit if it belongs to their municipality (and isn't a global one)
            return obj.municipality == user.assigned_municipality

        # 3. Club Admin
        if user.role == 'CLUB_ADMIN' and user.assigned_club:
            # Can edit if it belongs to their club
            return obj.club == user.assigned_club

        return False