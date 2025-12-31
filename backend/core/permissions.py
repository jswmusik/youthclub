from rest_framework import permissions


class IsSuperUser(permissions.BasePermission):
    """
    Permission that only allows super admins access.
    Checks both is_superuser flag and SUPER_ADMIN role.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if getattr(request.user, 'role', None) == 'SUPER_ADMIN':
            return True
        return False


class HasLicenseFeature:
    """
    Factory to create a permission class for a specific feature slug.
    Usage: permission_classes = [HasLicenseFeature('events')]
    """
    def __init__(self, feature_slug):
        self.feature_slug = feature_slug

    def __call__(self):
        slug = self.feature_slug
        
        class FeaturePermission(permissions.BasePermission):
            def has_permission(self, request, view):
                # 1. Super Admins always have access (check both is_superuser and role)
                if request.user.is_superuser:
                    return True
                if getattr(request.user, 'role', None) == 'SUPER_ADMIN':
                    return True
                
                # 2. Check authentication
                if not request.user.is_authenticated:
                    return False

                # 3. Get Municipality (handle different user types)
                municipality = getattr(request.user, 'assigned_municipality', None)
                
                # If user is a Club Admin, get municipality from their club
                if not municipality and hasattr(request.user, 'assigned_club'):
                    if request.user.assigned_club:
                        municipality = request.user.assigned_club.municipality
                
                # If user is a Youth Member, get municipality from their preferred club
                if not municipality and getattr(request.user, 'role', None) == 'YOUTH_MEMBER':
                    preferred_club = getattr(request.user, 'preferred_club', None)
                    if preferred_club:
                        municipality = preferred_club.municipality
                
                # If user is a Guardian, get municipality from first linked youth
                if not municipality and getattr(request.user, 'role', None) == 'GUARDIAN':
                    first_link = request.user.youth_links.first() if hasattr(request.user, 'youth_links') else None
                    if first_link and first_link.youth.preferred_club:
                        municipality = first_link.youth.preferred_club.municipality

                if not municipality:
                    return False

                # 4. Check License
                if not hasattr(municipality, 'license'):
                    return False
                
                license = municipality.license
                
                if not license.is_active:
                    return False

                # 5. Check specific feature
                # We use the method we created in the License model
                allowed_slugs = license.get_active_features_slugs()
                return slug in allowed_slugs

        return FeaturePermission