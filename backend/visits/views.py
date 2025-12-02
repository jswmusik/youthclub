from rest_framework import viewsets, status, permissions, views
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q, Avg, F, ExpressionWrapper, fields
from django.db.models.functions import TruncDate

from .models import CheckInSession
from .serializers import CheckInSessionSerializer, QRCodeScanSerializer, ManualCheckInSerializer
from .services import CheckInService
from organization.models import Club
from users.models import User

class KioskTokenView(views.APIView):
    """
    Endpoint for the Club Admin Kiosk to get a fresh QR token every 30s.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Ensure the user is actually an admin of a club
        user = request.user
        
        # Check if user is an admin
        if user.role not in [User.Role.CLUB_ADMIN, User.Role.SUPER_ADMIN, User.Role.MUNICIPALITY_ADMIN]:
            return Response({"error": "Only club admins can access the kiosk"}, status=status.HTTP_403_FORBIDDEN)
        
        club_id = request.query_params.get('club_id')
        if not club_id:
            return Response({"error": "Club ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            club_id_int = int(club_id)
        except (ValueError, TypeError):
            return Response({"error": "Invalid club ID"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify club exists
        club = get_object_or_404(Club, id=club_id_int)
        
        # For CLUB_ADMIN, verify they own this club
        if user.role == User.Role.CLUB_ADMIN:
            if not user.assigned_club or user.assigned_club.id != club_id_int:
                return Response({"error": "You can only generate tokens for your assigned club"}, status=status.HTTP_403_FORBIDDEN)
        
        # For MUNICIPALITY_ADMIN, verify the club is in their municipality
        elif user.role == User.Role.MUNICIPALITY_ADMIN:
            if not user.assigned_municipality or club.municipality != user.assigned_municipality:
                return Response({"error": "You can only generate tokens for clubs in your municipality"}, status=status.HTTP_403_FORBIDDEN)
        
        # SUPER_ADMIN can access any club
             
        token = CheckInService.generate_kiosk_token(club_id_int)
        return Response({'token': token})

class VisitViewSet(viewsets.ModelViewSet):
    queryset = CheckInSession.objects.all()
    serializer_class = CheckInSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = CheckInSession.objects.all()

        # --- 1. Role-Based Scoping ---
        if user.role == User.Role.YOUTH_MEMBER:
            # Youth can only see their own history
            queryset = queryset.filter(user=user)
            
        elif user.role == User.Role.CLUB_ADMIN:
            # Club Admins can ONLY see visits to their assigned club
            if user.assigned_club:
                queryset = queryset.filter(club=user.assigned_club)
            else:
                return CheckInSession.objects.none()

        elif user.role == User.Role.MUNICIPALITY_ADMIN:
            # Municipality Admins can see visits to ALL clubs in their municipality
            if user.assigned_municipality:
                queryset = queryset.filter(club__municipality=user.assigned_municipality)
            else:
                return CheckInSession.objects.none()

        elif user.role == User.Role.SUPER_ADMIN:
            # Super Admin sees all. 
            # Note: If a Super Admin is "masquerading" as a club admin (assigned_club is set),
            # you might want to restrict them, but usually SA sees all.
            pass

        # --- 2. Drill-Down Filter (View specific user's history) ---
        # This allows the frontend to say "Show me history for User 98"
        target_user_id = self.request.query_params.get('user_id')
        if target_user_id:
            queryset = queryset.filter(user_id=target_user_id)

        # --- 2b. Club Filter (for further filtering within allowed scope) ---
        club_id = self.request.query_params.get('club')
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        # --- 3. Date Filters ---
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(check_in_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(check_in_at__date__lte=end_date)
        
        # --- 4. Search Filter (User name) ---
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search) | 
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search)
            )
        
        # --- 5. "Active Only" Filter (for Dashboard) ---
        active_filter = self.request.query_params.get('active', '').lower()
        if active_filter == 'true':
            queryset = queryset.filter(check_out_at__isnull=True)
            # Get the most recent check-in per user using a subquery
            from django.db.models import OuterRef, Subquery
            latest_checkins = CheckInSession.objects.filter(
                user=OuterRef('user'),
                check_out_at__isnull=True
            ).order_by('-check_in_at').values('id')[:1]
            queryset = queryset.filter(id__in=Subquery(latest_checkins))

        return queryset.select_related('user', 'club').order_by('-check_in_at')

    @action(detail=False, methods=['post'], url_path='scan')
    def scan_qr(self, request):
        """
        User scans a QR code.
        Logic: Auto-checkout from ANY previous club before checking in here.
        """
        serializer = QRCodeScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['token']

        try:
            club_id = CheckInService.validate_token(token)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        club = get_object_or_404(Club, id=club_id)
        user = request.user

        # 1. Check Age/Restrictions
        allowed, reason = CheckInService.can_user_enter(user, club)
        if not allowed:
            response_data = {"error": reason}
            
            # If the specific reason is that the club is closed, fetch when it opens
            if reason == "CLOSED":
                next_opening = CheckInService.get_next_opening(club)
                response_data["error"] = "Club is currently closed"
                response_data["code"] = "CLUB_CLOSED"  # Error code for frontend
                response_data["next_opening"] = next_opening
                
            # Log for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Check-in denied for user {user.id} at club {club.id}: {response_data}")
            
            return Response(response_data, status=status.HTTP_403_FORBIDDEN)

        # 2. Check for ANY active session (Global Check)
        active_session = CheckInSession.objects.filter(
            user=user, 
            check_out_at__isnull=True
        ).first()
        
        if active_session:
            # Case A: Already at THIS club
            if active_session.club.id == club.id:
                 return Response({"message": "Already checked in!", "id": active_session.id})
            
            # Case B: At ANOTHER club -> Auto-checkout the old one
            active_session.check_out_at = timezone.now()
            active_session.save()
            # (Optional: You could log that this was a 'ROAMING_SWAP' if you want deep analytics)

        # 3. Create Session
        session = CheckInSession.objects.create(
            user=user,
            club=club,
            method='QR_KIOSK'
        )

        return Response(CheckInSessionSerializer(session, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='manual-entry')
    def manual_entry(self, request):
        """
        Admin manually adds a user.
        Logic: Auto-checkout from ANY previous club first.
        """
        if not request.user.role in [User.Role.CLUB_ADMIN, User.Role.SUPER_ADMIN]:
             return Response({"error": "Unauthorized"}, status=403)

        serializer = ManualCheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        target_user = get_object_or_404(User, id=serializer.validated_data['user_id'])
        
        # Use the admin's club or a passed club_id
        # Ideally, passed via URL or body, but strictly using assigned_club for now
        club = request.user.assigned_club 
        if not club:
             return Response({"error": "Admin has no assigned club"}, status=400)

        # 1. Check restrictions (Optional: Admins can usually override, but good to warn)
        # allowed, reason = CheckInService.can_user_enter(target_user, club)
        # if not allowed: return Response({"error": reason}, status=400)

        # 2. Global Active Session Check
        active_session = CheckInSession.objects.filter(
            user=target_user, 
            check_out_at__isnull=True
        ).first()

        if active_session:
            if active_session.club.id == club.id:
                 return Response({"message": "User is already here!", "id": active_session.id})
            
            # Auto-checkout from other club
            active_session.check_out_at = timezone.now()
            active_session.save()

        # 3. Create Session
        session = CheckInSession.objects.create(
            user=target_user,
            club=club,
            method='MANUAL_ADMIN',
            created_by=request.user
        )
        return Response(CheckInSessionSerializer(session, context={'request': request}).data)

    @action(detail=False, methods=['get'], url_path='active_status')
    def active_status(self, request):
        """
        Returns the current active check-in for the requesting user (if any).
        """
        active_session = CheckInSession.objects.filter(
            user=request.user, 
            check_out_at__isnull=True
        ).select_related('club').first()
        
        if active_session:
            return Response({
                "is_checked_in": True,
                "id": active_session.id,
                "club_name": active_session.club.name,
                "check_in_at": active_session.check_in_at
            })
        return Response({"is_checked_in": False})

    @action(detail=False, methods=['get'])
    def user_stats(self, request):
        """
        Returns analytics for a specific user (target_user_id).
        Uses the scoped queryset, so Admins only see stats based on permissions.
        """
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({"error": "user_id is required"}, status=400)

        # Get the filtered queryset (Applies Club/Municipality permissions automatically)
        queryset = self.get_queryset()

        # 1. Total Check-ins
        total_checkins = queryset.count()

        if total_checkins == 0:
             return Response({
                "total_checkins": 0,
                "avg_weekly_visits": 0,
                "avg_duration_minutes": 0,
                "clubs_visited_count": 0
            })

        # 2. Unique Clubs Visited
        clubs_visited = queryset.values('club').distinct().count()

        # 3. Average Duration
        # Calculate duration for finished visits
        duration_expr = ExpressionWrapper(
            F('check_out_at') - F('check_in_at'),
            output_field=fields.DurationField()
        )
        
        avg_duration = queryset.filter(check_out_at__isnull=False).annotate(
            duration=duration_expr
        ).aggregate(avg=Avg('duration'))['avg']
        
        avg_minutes = int(avg_duration.total_seconds() / 60) if avg_duration else 0

        # 4. Average Visits Per Week
        # We find the span of time (first visit to last visit) and divide count by weeks
        first_visit = queryset.last() # Ordered by -check_in_at, so last is oldest
        last_visit = queryset.first()
        
        if first_visit and last_visit:
            days_diff = (last_visit.check_in_at - first_visit.check_in_at).days
            weeks = max(days_diff / 7, 1) # Avoid division by zero, min 1 week
            avg_weekly = round(total_checkins / weeks, 1)
        else:
            avg_weekly = total_checkins

        return Response({
            "total_checkins": total_checkins,
            "avg_weekly_visits": avg_weekly,
            "avg_duration_minutes": avg_minutes,
            "clubs_visited_count": clubs_visited
        })

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """
        Returns aggregated stats for the dashboard.
        Corrects for multiple check-ins: Counts unique (user, date) pairs.
        Query Params: start_date, end_date
        """
        queryset = self.get_queryset()  # Re-use the filtering logic above
        
        # 1. Total Visits (Unique Daily Visits)
        # This counts how many "User+Date" combinations exist. 
        # If Alice comes 3 times today, she is only counted once here.
        total_visits = (
            queryset
            .annotate(visit_date=TruncDate('check_in_at'))
            .values('user', 'visit_date')
            .distinct()
            .count()
        )
        
        # 2. Unique Visitors (Total unique humans in the period)
        # If Alice comes Monday AND Tuesday, she is 1 Unique Visitor, but contributes 2 to Total Visits.
        unique_visitors = queryset.values('user').distinct().count()
        
        # 3. Visits Over Time (Graph Data)
        # Groups by Day, counting UNIQUE users per day
        visits_over_time = (
            queryset
            .annotate(date=TruncDate('check_in_at'))
            .values('date')
            .annotate(count=Count('user', distinct=True))  # Distinct User Count per day
            .order_by('date')
        )
        
        # 4. Gender Distribution (remains distinct users)
        gender_dist = (
            queryset.values('user__legal_gender')
            .annotate(count=Count('user', distinct=True))
            .order_by('-count')
        )
        
        return Response({
            "summary": {
                "total_visits": total_visits,
                "unique_visitors": unique_visitors,
            },
            "timeline": list(visits_over_time),
            "demographics": list(gender_dist)
        })

    @action(detail=True, methods=['post'], url_path='checkout')
    def checkout(self, request, pk=None):
        session = self.get_object()
        
        # Validation: Can only checkout own session or admin can checkout anyone
        if request.user != session.user and request.user.role not in ['CLUB_ADMIN', 'SUPER_ADMIN']:
             return Response({"error": "Unauthorized"}, status=403)
             
        session.check_out_at = timezone.now()
        session.save()
        
        return Response({"status": "checked_out"})