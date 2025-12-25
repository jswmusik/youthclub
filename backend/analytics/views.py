from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, viewsets
from .services import AnalyticsService
from .serializers import AnalyticsFilterSerializer, AnalyticsReportSerializer
from .models import AnalyticsReport

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
        
        # Security Check: Club Admin cannot query other clubs
        if request.user.role == 'CLUB_ADMIN':
            # Force the club_id to their assigned club
            if not request.user.assigned_club:
                return Response({"error": "No club assigned to admin"}, status=403)
            data['club_id'] = request.user.assigned_club.id
        
        # Initialize Service
        service = AnalyticsService(
            start_date=data['start_date'],
            end_date=data['end_date'],
            club_id=data.get('club_id'), # Null for Municipality Admin looking at all
            filters=data # Pass the rest (age, gender, group) as filters
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