from rest_framework import viewsets, status, permissions, views
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
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
        # Base Query
        if user.role == User.Role.YOUTH_MEMBER:
            queryset = CheckInSession.objects.filter(user=user)
        elif user.role in [User.Role.CLUB_ADMIN, User.Role.SUPER_ADMIN] and user.assigned_club:
            queryset = CheckInSession.objects.filter(club=user.assigned_club)
        else:
            # Fallback or Super Admin without club
            queryset = CheckInSession.objects.all()
        
        # Filter by active status if requested
        active_filter = self.request.query_params.get('active', '').lower()
        if active_filter == 'true':
            # Only show sessions that haven't been checked out
            queryset = queryset.filter(check_out_at__isnull=True)
            # Get the most recent check-in per user using a subquery
            from django.db.models import OuterRef, Subquery
            latest_checkins = CheckInSession.objects.filter(
                user=OuterRef('user'),
                check_out_at__isnull=True
            ).order_by('-check_in_at').values('id')[:1]
            queryset = queryset.filter(id__in=Subquery(latest_checkins))
        
        # --- Filters for History Log ---
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        search = self.request.query_params.get('search')
        
        if start_date:
            try:
                from datetime import datetime
                # Parse the date string and create a timezone-aware datetime for the start of the day
                start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                start_dt = timezone.make_aware(start_dt)
                queryset = queryset.filter(check_in_at__gte=start_dt)
            except (ValueError, TypeError):
                # If date parsing fails, skip the filter
                pass
        
        if end_date:
            try:
                from datetime import datetime, timedelta
                # Parse the date string and create a timezone-aware datetime for the end of the day
                end_dt = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                end_dt = timezone.make_aware(end_dt)
                queryset = queryset.filter(check_in_at__lt=end_dt)
            except (ValueError, TypeError):
                # If date parsing fails, skip the filter
                pass
        
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search) | 
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search)
            )
        
        # Optimize query with select_related
        queryset = queryset.select_related('user', 'club')
        
        return queryset.order_by('-check_in_at')

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
            return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

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