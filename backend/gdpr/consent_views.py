"""
API views for consent management.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings

from .consent_models import ConsentType, UserConsent
from .consent_serializers import (
    ConsentTypeSerializer,
    UserConsentSerializer,
    ConsentLogSerializer,
    GiveConsentSerializer,
    WithdrawConsentSerializer,
    BulkConsentSerializer
)
from .consent_service import ConsentService
from audit.services import get_client_ip


class ConsentTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing available consent types.
    
    - List all active consent types
    - View details of specific consent type
    - Separate endpoints for required vs optional consents
    """
    
    serializer_class = ConsentTypeSerializer
    permission_classes = [permissions.AllowAny]  # Public - needed for registration
    
    def get_queryset(self):
        """Only show active consent types"""
        return ConsentType.objects.filter(is_active=True)
    
    @action(detail=False, methods=['get'])
    def required(self, request):
        """
        Get all required consent types.
        
        These must be accepted during registration.
        """
        required_consents = ConsentService.get_required_consents()
        serializer = self.get_serializer(required_consents, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def optional(self, request):
        """
        Get all optional consent types.
        
        Users can choose to accept these.
        """
        optional_consents = ConsentService.get_optional_consents()
        serializer = self.get_serializer(optional_consents, many=True)
        return Response(serializer.data)


class UserConsentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for managing user consents.
    
    - View user's consents
    - Give new consents
    - Withdraw consents
    - Check consent status
    """
    
    serializer_class = UserConsentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Users can see their own consents.
        Admins can view any user's consents by providing ?user=<user_id>
        """
        user = self.request.user
        
        # If admin and user parameter provided, show that user's consents
        if user.is_staff or user.role in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
            user_id = self.request.query_params.get('user')
            if user_id:
                return UserConsent.objects.filter(
                    user_id=user_id
                ).select_related('consent_type', 'user').prefetch_related('logs')
        
        # Otherwise show only own consents
        return UserConsent.objects.filter(
            user=user
        ).select_related('consent_type').prefetch_related('logs')
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get all active consents for the user.
        """
        active_consents = ConsentService.get_user_consents(
            user=request.user,
            active_only=True
        )
        serializer = self.get_serializer(active_consents, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """
        Get full consent history including withdrawn consents.
        """
        all_consents = ConsentService.get_user_consents(
            user=request.user,
            active_only=False
        )
        serializer = self.get_serializer(all_consents, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def outdated(self, request):
        """
        Get consents that need to be updated due to version changes.
        """
        outdated = ConsentService.get_consents_needing_update(request.user)
        serializer = self.get_serializer(outdated, many=True)
        return Response({
            'count': len(outdated),
            'consents': serializer.data
        })
    
    @action(detail=False, methods=['post'])
    def give(self, request):
        """
        Give consent for a specific purpose.
        
        Request body:
        {
            "consent_code": "marketing_emails"
        }
        """
        # Check if feature is enabled
        if not getattr(settings, 'ENABLE_CONSENT_TRACKING', False):
            return Response(
                {'error': 'Consent tracking is not enabled'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        serializer = GiveConsentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        consent_code = serializer.validated_data['consent_code']
        
        # Record consent
        user_consent = ConsentService.record_consent(
            user=request.user,
            consent_code=consent_code,
            consent_method='SETTINGS',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        if user_consent:
            response_serializer = UserConsentSerializer(user_consent)
            return Response({
                'message': 'Consent recorded successfully',
                'consent': response_serializer.data
            }, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {'error': 'Failed to record consent'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def give_bulk(self, request):
        """
        Give multiple consents at once.
        
        Request body:
        {
            "consent_codes": ["terms_of_service", "privacy_policy", "marketing_emails"]
        }
        """
        # Check if feature is enabled
        if not getattr(settings, 'ENABLE_CONSENT_TRACKING', False):
            return Response(
                {'error': 'Consent tracking is not enabled'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        serializer = BulkConsentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        consent_codes = serializer.validated_data['consent_codes']
        
        # Record all consents
        results = ConsentService.record_bulk_consents(
            user=request.user,
            consent_codes=consent_codes,
            consent_method='SETTINGS',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        success_count = sum(1 for v in results.values() if v)
        
        return Response({
            'message': f'Recorded {success_count} of {len(consent_codes)} consents',
            'results': results,
            'success_count': success_count,
            'total_count': len(consent_codes)
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def withdraw(self, request):
        """
        Withdraw consent for a specific purpose.
        
        Request body:
        {
            "consent_code": "marketing_emails",
            "reason": "No longer interested"
        }
        """
        # Check if feature is enabled
        if not getattr(settings, 'ENABLE_CONSENT_TRACKING', False):
            return Response(
                {'error': 'Consent tracking is not enabled'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        serializer = WithdrawConsentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        consent_code = serializer.validated_data['consent_code']
        reason = serializer.validated_data.get('reason', '')
        
        # Withdraw consent
        success = ConsentService.withdraw_consent(
            user=request.user,
            consent_code=consent_code,
            reason=reason,
            ip_address=get_client_ip(request)
        )
        
        if success:
            return Response({
                'message': 'Consent withdrawn successfully',
                'consent_code': consent_code
            })
        else:
            return Response(
                {'error': 'Failed to withdraw consent. You may not have given this consent.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def check(self, request):
        """
        Check consent status for specific codes.
        
        Query params: ?codes=terms_of_service,privacy_policy,marketing_emails
        """
        codes = request.query_params.get('codes', '')
        
        if not codes:
            return Response(
                {'error': 'Please provide consent codes as query parameter'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        consent_codes = [c.strip() for c in codes.split(',')]
        
        results = {}
        for code in consent_codes:
            results[code] = ConsentService.has_consent(request.user, code)
        
        return Response({
            'consents': results,
            'all_given': all(results.values())
        })
    
    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """
        Get detailed logs for a specific consent.
        """
        user_consent = self.get_object()
        logs = user_consent.logs.all()
        
        serializer = ConsentLogSerializer(logs, many=True)
        return Response({
            'consent_id': user_consent.id,
            'consent_type': user_consent.consent_type.name,
            'logs': serializer.data
        })

