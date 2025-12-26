import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, viewsets
from django.db.models import Q
from .services import AnalyticsService
from .serializers import AnalyticsFilterSerializer, AnalyticsReportSerializer, AIReportRequestSerializer, AnalyticsPreferenceSerializer
from .models import AnalyticsReport, AnalyticsPreference
from organization.models import Club
from groups.models import Group
from custom_fields.models import CustomFieldDefinition

logger = logging.getLogger(__name__)


class AnalyticsFilterOptionsView(APIView):
    """
    GET /api/analytics/filter-options/
    Returns available filter options (groups, clubs, custom_fields) scoped to the user's permissions.
    
    Query params:
    - club_id: Optional. If provided, returns groups/custom_fields specific to that club.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        clubs = []
        groups = []
        custom_fields = []
        municipality_id = None
        
        # Check if a specific club is selected (for filtering groups/custom fields)
        selected_club_id = request.query_params.get('club_id')

        if user.role == 'CLUB_ADMIN':
            # Club admin can only see their own club
            if user.assigned_club:
                municipality_id = user.assigned_club.municipality_id
                clubs = [{'id': user.assigned_club.id, 'name': user.assigned_club.name}]
                
                # Groups: ONLY club-specific groups (not municipality-wide)
                # Club admins should only filter by groups that belong to their club
                groups = Group.objects.filter(
                    club=user.assigned_club  # Only groups belonging to their club
                ).values('id', 'name', 'group_type', 'club_id')
                
                # Custom Fields: Club-specific + Municipality-wide that apply to this club
                custom_fields = CustomFieldDefinition.objects.filter(
                    Q(club=user.assigned_club) |  # Club's own fields
                    Q(municipality_id=municipality_id, club__isnull=True) |  # Municipality-wide fields
                    Q(municipality_id=municipality_id, specific_clubs=user.assigned_club)  # Municipality fields targeting this club
                ).filter(
                    field_type__in=['SINGLE_SELECT', 'MULTI_SELECT'],
                    context='USER_PROFILE',
                    is_published=True
                ).distinct().values('id', 'name', 'field_type', 'options')
                
        elif user.role == 'MUNICIPALITY_ADMIN':
            if user.assigned_municipality:
                municipality_id = user.assigned_municipality.id
                
                # All clubs in their municipality
                clubs = Club.objects.filter(
                    municipality_id=municipality_id
                ).values('id', 'name')
                
                # Groups depend on whether a specific club is selected
                if selected_club_id:
                    # Validate club belongs to municipality
                    club = Club.objects.filter(id=selected_club_id, municipality_id=municipality_id).first()
                    if club:
                        # Show ONLY groups for that specific club (not municipality-wide when viewing a club)
                        groups = Group.objects.filter(
                            club_id=selected_club_id  # Only club-specific groups
                        ).values('id', 'name', 'group_type', 'club_id', 'club__name')
                        
                        # Custom fields for that specific club
                        custom_fields = CustomFieldDefinition.objects.filter(
                            Q(club_id=selected_club_id) |  # Club's own fields
                            Q(municipality_id=municipality_id, club__isnull=True) |  # Municipality-wide fields
                            Q(municipality_id=municipality_id, specific_clubs=club)  # Municipality fields targeting this club
                        ).filter(
                            field_type__in=['SINGLE_SELECT', 'MULTI_SELECT'],
                            context='USER_PROFILE',
                            is_published=True
                        ).distinct().values('id', 'name', 'field_type', 'options')
                    else:
                        groups = []
                        custom_fields = []
                else:
                    # No club selected: Show ALL groups in municipality
                    # This includes: municipality-wide groups + all club-specific groups
                    groups = Group.objects.filter(
                        municipality_id=municipality_id
                    ).values('id', 'name', 'group_type', 'club_id', 'club__name')
                    
                    # All custom fields in municipality
                    custom_fields = CustomFieldDefinition.objects.filter(
                        Q(municipality_id=municipality_id) |  # Municipality-level fields
                        Q(club__municipality_id=municipality_id)  # Club-level fields in this municipality
                    ).filter(
                        field_type__in=['SINGLE_SELECT', 'MULTI_SELECT'],
                        context='USER_PROFILE',
                        is_published=True
                    ).distinct().values('id', 'name', 'field_type', 'options', 'club_id', 'club__name')
                
        elif user.role == 'SUPER_ADMIN':
            # Super admin sees everything
            clubs = Club.objects.all().values('id', 'name', 'municipality__name')
            groups = Group.objects.all().values('id', 'name', 'group_type', 'municipality__name', 'club_id', 'club__name')
            custom_fields = CustomFieldDefinition.objects.filter(
                field_type__in=['SINGLE_SELECT', 'MULTI_SELECT'],
                context='USER_PROFILE',
                is_published=True
            ).values('id', 'name', 'field_type', 'options', 'municipality__name', 'club__name')

        return Response({
            'clubs': list(clubs),
            'groups': list(groups),
            'custom_fields': list(custom_fields),
            'municipality_id': municipality_id,
        })


class DashboardMetricsView(APIView):
    """
    POST /api/analytics/dashboard/
    Calculates live metrics based on complex filters.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AnalyticsFilterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        municipality_id = None
        
        # Security Check: Scope data based on user's role
        if request.user.role == 'CLUB_ADMIN':
            # Force the club_id to their assigned club
            if not request.user.assigned_club:
                return Response({"error": "No club assigned to admin"}, status=403)
            data['club_id'] = request.user.assigned_club.id
            municipality_id = request.user.assigned_club.municipality_id
            
        elif request.user.role == 'MUNICIPALITY_ADMIN':
            # Force municipality scope - admin can only see their municipality's data
            if not request.user.assigned_municipality:
                return Response({"error": "No municipality assigned to admin"}, status=403)
            municipality_id = request.user.assigned_municipality.id
            # Validate club_id if provided - must be within their municipality
            if data.get('club_id'):
                from organization.models import Club
                club = Club.objects.filter(id=data['club_id'], municipality_id=municipality_id).first()
                if not club:
                    return Response({"error": "Club not found in your municipality"}, status=403)
                    
        elif request.user.role == 'SUPER_ADMIN':
            # Super admin can see everything, use provided municipality_id if any
            municipality_id = data.get('municipality_id')
        
        # Initialize Service
        service = AnalyticsService(
            start_date=data['start_date'],
            end_date=data['end_date'],
            club_id=data.get('club_id'),
            municipality_id=municipality_id,
            filters=data
        )

        metrics = service.get_dashboard_metrics()
        return Response(metrics)

class AnalyticsReportViewSet(viewsets.ModelViewSet):
    """
    CRUD for saved reports.
    """
    serializer_class = AnalyticsReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN']:
            return AnalyticsReport.objects.filter(created_by__assigned_municipality=user.assigned_municipality)
        elif user.role == 'CLUB_ADMIN':
            return AnalyticsReport.objects.filter(club=user.assigned_club)
        return AnalyticsReport.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AIReportGeneratorView(APIView):
    """
    POST /api/analytics/ai-report/
    
    Generates an AI-powered analytics report based on current dashboard data
    and the admin's specific request.
    
    Request body:
    {
        "user_request": "Write a monthly summary focusing on member retention",
        "report_type": "monthly",  // summary, monthly, board, trend
        "language": "en",  // en, sv, no
        "provider": "anthropic",  // optional: anthropic, openai
        "filters": {
            "start_date": "2024-01-01T00:00:00Z",
            "end_date": "2024-01-31T23:59:59Z",
            "club_id": null,
            "group_id": null,
            ...
        }
    }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Validate request
        serializer = AIReportRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        filters = data['filters']
        municipality_id = None
        
        # Security Check: Scope data based on user's role (same as DashboardMetricsView)
        if request.user.role == 'CLUB_ADMIN':
            if not request.user.assigned_club:
                return Response({"error": "No club assigned to admin"}, status=403)
            filters['club_id'] = request.user.assigned_club.id
            municipality_id = request.user.assigned_club.municipality_id
            
        elif request.user.role == 'MUNICIPALITY_ADMIN':
            if not request.user.assigned_municipality:
                return Response({"error": "No municipality assigned to admin"}, status=403)
            municipality_id = request.user.assigned_municipality.id
            if filters.get('club_id'):
                club = Club.objects.filter(id=filters['club_id'], municipality_id=municipality_id).first()
                if not club:
                    return Response({"error": "Club not found in your municipality"}, status=403)
                    
        elif request.user.role == 'SUPER_ADMIN':
            municipality_id = filters.get('municipality_id')
        else:
            return Response({"error": "Insufficient permissions"}, status=403)
        
        # Check if AI is available
        try:
            from .ai_service import get_available_providers, AIReportGenerator
            
            available_providers = get_available_providers()
            if not available_providers:
                return Response({
                    "error": "No AI providers configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable."
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            # Use requested provider or first available
            provider = data.get('provider')
            if provider and provider not in available_providers:
                return Response({
                    "error": f"Requested provider '{provider}' is not available. Available: {available_providers}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            provider = provider or available_providers[0]
            
        except ImportError as e:
            logger.error(f"AI service import error: {e}")
            return Response({
                "error": "AI service not properly configured"
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # Get analytics data
        try:
            service = AnalyticsService(
                start_date=filters['start_date'],
                end_date=filters['end_date'],
                club_id=filters.get('club_id'),
                municipality_id=municipality_id,
                filters=filters
            )
            analytics_data = service.get_dashboard_metrics()
            
        except Exception as e:
            logger.error(f"Analytics service error: {e}")
            return Response({
                "error": "Failed to fetch analytics data"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Generate AI report
        try:
            generator = AIReportGenerator(provider_name=provider)
            
            # Get visible sections from request (defaults to all visible if not provided)
            visible_sections = data.get('visible_sections')
            
            result = generator.generate_report(
                analytics_data=analytics_data,
                user_request=data['user_request'],
                report_type=data.get('report_type', 'summary'),
                filters_context=filters,
                language=data.get('language', 'en'),
                visible_sections=visible_sections
            )
            
            return Response({
                "success": True,
                "report": result['report'],
                "metadata": result['metadata']
            })
            
        except Exception as e:
            logger.error(f"AI report generation error: {e}")
            return Response({
                "error": f"Failed to generate report: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIProvidersView(APIView):
    """
    GET /api/analytics/ai-providers/
    
    Returns list of available AI providers (those with configured API keys).
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            from .ai_service import get_available_providers
            
            providers = get_available_providers()
            return Response({
                "available_providers": providers,
                "default_provider": providers[0] if providers else None,
                "is_configured": len(providers) > 0
            })
            
        except Exception as e:
            logger.error(f"Error checking AI providers: {e}")
            return Response({
                "available_providers": [],
                "default_provider": None,
                "is_configured": False,
                "error": str(e)
            })


class AnalyticsPreferencesView(APIView):
    """
    GET /api/analytics/preferences/
    Returns the user's analytics visibility preferences.
    
    PUT /api/analytics/preferences/
    Updates the user's analytics visibility preferences.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get or create preferences for the user
        preference, created = AnalyticsPreference.objects.get_or_create(
            user=request.user,
            defaults={'preferences': AnalyticsPreference.get_default_preferences()}
        )
        
        serializer = AnalyticsPreferenceSerializer(preference)
        return Response(serializer.data)
    
    def put(self, request):
        # Get or create preferences for the user
        preference, created = AnalyticsPreference.objects.get_or_create(
            user=request.user,
            defaults={'preferences': AnalyticsPreference.get_default_preferences()}
        )
        
        serializer = AnalyticsPreferenceSerializer(preference, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request):
        """
        PATCH /api/analytics/preferences/
        Partially update preferences (merge with existing).
        Useful for toggling a single section.
        """
        preference, created = AnalyticsPreference.objects.get_or_create(
            user=request.user,
            defaults={'preferences': AnalyticsPreference.get_default_preferences()}
        )
        
        # Merge incoming preferences with existing
        new_prefs = request.data.get('preferences', {})
        if not isinstance(new_prefs, dict):
            return Response(
                {"error": "preferences must be a dictionary"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate keys and values
        valid_keys = set(AnalyticsPreference.get_default_preferences().keys())
        for key, val in new_prefs.items():
            if key not in valid_keys:
                return Response(
                    {"error": f"Invalid preference key: {key}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not isinstance(val, bool):
                return Response(
                    {"error": f"Preference value for '{key}' must be a boolean"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Merge and save
        current_prefs = preference.get_preferences()
        current_prefs.update(new_prefs)
        preference.preferences = current_prefs
        preference.save()
        
        serializer = AnalyticsPreferenceSerializer(preference)
        return Response(serializer.data)