from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Feature, Plan, License, LicenseRequest, GlobalPricing
from .serializers import (
    FeatureSerializer, PlanSerializer, LicenseSerializer, 
    LicenseRequestSerializer, GlobalPricingSerializer
)


class IsSuperUser(permissions.BasePermission):
    """
    Permission class that only allows superusers.
    Checks both is_superuser flag and SUPER_ADMIN role.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Check both is_superuser flag and SUPER_ADMIN role
        return (
            request.user.is_superuser or 
            getattr(request.user, 'role', None) == 'SUPER_ADMIN'
        )


class FeatureViewSet(viewsets.ModelViewSet):
    """
    Super Admin: Full Access to manage features.
    Others: Read Only.
    """
    queryset = Feature.objects.all()
    serializer_class = FeatureSerializer
    pagination_class = None  # Disable pagination - we want all features at once

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsSuperUser()]


class PlanViewSet(viewsets.ModelViewSet):
    """
    Super Admin: Full Access to manage plans.
    Others: Read Only (if public).
    """
    queryset = Plan.objects.filter(is_active=True)
    serializer_class = PlanSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsSuperUser()]

    def get_queryset(self):
        user = self.request.user
        # Super Admin sees all plans (including inactive)
        if user.is_superuser or getattr(user, 'role', None) == 'SUPER_ADMIN':
            return Plan.objects.all()
        # Others see only public, active plans
        return Plan.objects.filter(is_active=True, is_public=True)

    def destroy(self, request, *args, **kwargs):
        """
        Prevent deletion of plans that have active licenses.
        """
        plan = self.get_object()
        active_license_count = License.objects.filter(plan=plan, is_active=True).count()
        
        if active_license_count > 0:
            return Response(
                {
                    'detail': f'Cannot delete this plan. It has {active_license_count} active license(s). '
                              'Please reassign or deactivate those licenses first.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().destroy(request, *args, **kwargs)


class LicenseViewSet(viewsets.ModelViewSet):
    """
    Super Admin: Manage all licenses.
    Municipality Admin: Read own license.
    """
    serializer_class = LicenseSerializer

    def get_queryset(self):
        user = self.request.user
        # Super Admin sees all licenses
        if user.is_superuser or getattr(user, 'role', None) == 'SUPER_ADMIN':
            return License.objects.all().select_related('municipality', 'plan')
        # Municipality Admin can see their own license
        if hasattr(user, 'assigned_municipality') and user.assigned_municipality:
            return License.objects.filter(municipality=user.assigned_municipality).select_related('municipality', 'plan')
        return License.objects.none()

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsSuperUser()]


class LicenseRequestViewSet(viewsets.ModelViewSet):
    """
    Municipality Admin: Create requests for upgrades/changes.
    Super Admin: Approve/Reject requests.
    """
    serializer_class = LicenseRequestSerializer

    def get_queryset(self):
        user = self.request.user
        # Super Admin sees all requests
        if user.is_superuser or getattr(user, 'role', None) == 'SUPER_ADMIN':
            return LicenseRequest.objects.all().select_related(
                'municipality', 'requested_plan', 'requested_feature'
            ).order_by('-created_at')
        if hasattr(user, 'assigned_municipality') and user.assigned_municipality:
            return LicenseRequest.objects.filter(
                municipality=user.assigned_municipality
            ).select_related(
                'municipality', 'requested_plan', 'requested_feature'
            ).order_by('-created_at')
        return LicenseRequest.objects.none()

    def perform_create(self, serializer):
        # Automatically attach the user's municipality if not a superuser
        user = self.request.user
        is_super = user.is_superuser or getattr(user, 'role', None) == 'SUPER_ADMIN'
        if not is_super:
            serializer.save(municipality=user.assigned_municipality)
        else:
            serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[IsSuperUser])
    def approve(self, request, pk=None):
        """
        Super Admin Action: Approve request and apply changes to License.
        """
        req = self.get_object()
        if req.status != 'PENDING':
            return Response({'error': 'Request is not pending'}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create license for the municipality
        try:
            license = req.municipality.license
        except License.DoesNotExist:
            return Response(
                {'error': 'Municipality does not have a license. Create one first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Apply Logic based on Request Type
        if req.request_type == 'UPGRADE_PLAN' and req.requested_plan:
            license.plan = req.requested_plan
        elif req.request_type == 'NEW_CLUB':
            if req.requested_club_count:
                license.max_clubs = req.requested_club_count
            else:
                # Default: Add one more club slot
                license.max_clubs += 1
        elif req.request_type == 'ADD_FEATURE' and req.requested_feature:
            license.extra_features.add(req.requested_feature)
        elif req.request_type == 'ADD_ANALYTICS':
            license.has_analytics = True
        elif req.request_type == 'RENEWAL':
            # Extend license by requested years (default 1 year)
            from datetime import timedelta
            years = req.renewal_years or 1
            days_to_add = 365 * years
            if license.end_date:
                license.end_date = license.end_date + timedelta(days=days_to_add)
            else:
                license.end_date = timezone.now().date() + timedelta(days=days_to_add)
            license.is_active = True
        
        license.save()
        
        req.status = 'APPROVED'
        req.admin_notes = request.data.get('notes', '')  # Optional invoice ID
        req.save()
        
        return Response({
            'status': 'approved',
            'message': f'Request approved. License updated for {req.municipality.name}.'
        })

    @action(detail=True, methods=['post'], permission_classes=[IsSuperUser])
    def reject(self, request, pk=None):
        """
        Super Admin Action: Reject a pending request.
        """
        req = self.get_object()
        if req.status != 'PENDING':
            return Response({'error': 'Request is not pending'}, status=status.HTTP_400_BAD_REQUEST)
        
        req.status = 'REJECTED'
        req.admin_notes = request.data.get('notes', '')
        req.save()
        
        return Response({
            'status': 'rejected',
            'message': f'Request rejected for {req.municipality.name}.'
        })


class GlobalPricingViewSet(viewsets.ViewSet):
    """
    Singleton ViewSet for managing global pricing configuration.
    Read: Authenticated users
    Write: Super Admin only
    """

    def get_permissions(self):
        if self.action == 'list':
            return [permissions.IsAuthenticated()]
        return [IsSuperUser()]

    def list(self, request):
        """Get the current global pricing configuration."""
        pricing, created = GlobalPricing.objects.get_or_create(pk=1)
        serializer = GlobalPricingSerializer(pricing)
        return Response(serializer.data)

    def create(self, request):
        """Update the global pricing configuration."""
        pricing, created = GlobalPricing.objects.get_or_create(pk=1)
        serializer = GlobalPricingSerializer(pricing, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
