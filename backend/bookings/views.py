from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.dateparse import parse_date
from datetime import date, timedelta
from django.db.models import Q

from .models import BookingResource, Booking, BookingSchedule
from .serializers import BookingResourceSerializer, BookingSerializer, CreateBookingSerializer, BookingScheduleSerializer
from .services import get_available_slots

class BookingResourceViewSet(viewsets.ModelViewSet):
    """
    Manage Resources (Rooms/Equipment).
    """
    queryset = BookingResource.objects.all()
    serializer_class = BookingResourceSerializer
    permission_classes = [permissions.IsAuthenticated] # Adjust based on your role needs

    def get_queryset(self):
        user = self.request.user
        queryset = BookingResource.objects.all()

        # 1. Filter by specific Club/Muni if passed in URL params (useful for Super Admin filters)
        club_id = self.request.query_params.get('club')
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        # 2. Role-based restrictions
        if user.role in ['YOUTH_MEMBER', 'GUARDIAN']:
            # Youth Logic: Active + Scope check would go here
            return queryset.filter(is_active=True)
            
        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            return queryset.filter(club=user.assigned_club)
            
        elif user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            return queryset.filter(club__municipality=user.assigned_municipality)
            
        # SUPER_ADMIN sees all (filtered by the optional params above)
        return queryset

    @action(detail=True, methods=['get'], url_path='availability')
    def availability(self, request, pk=None):
        """
        GET /api/bookings/resources/{id}/availability/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
        """
        resource = self.get_object()
        
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        if not start_date_str:
            start_date = date.today()
        else:
            start_date = parse_date(start_date_str)
            
        if not end_date_str:
            # Default to showing 7 days
            end_date = start_date + timedelta(days=6)
        else:
            end_date = parse_date(end_date_str)
            
        slots = get_available_slots(resource, start_date, end_date)
        return Response(slots)

class BookingScheduleViewSet(viewsets.ModelViewSet):
    """
    Manage Time Slots for Resources.
    """
    queryset = BookingSchedule.objects.all()
    serializer_class = BookingScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Optional: Filter by resource if passed in query params
        queryset = BookingSchedule.objects.all()
        resource_id = self.request.query_params.get('resource')
        if resource_id:
            queryset = queryset.filter(resource_id=resource_id)
        return queryset

class BookingViewSet(viewsets.ModelViewSet):
    """
    Manage Bookings. 
    Supports filtering by date range for calendars and status for dashboards.
    """
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['start_time', 'created_at']
    ordering = ['start_time']

    def get_queryset(self):
        user = self.request.user
        queryset = Booking.objects.all()

        # --- Role Based Access ---
        if user.role in ['YOUTH_MEMBER', 'GUARDIAN']:
            queryset = queryset.filter(user=user)
        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            queryset = queryset.filter(resource__club=user.assigned_club)
        elif user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            queryset = queryset.filter(resource__club__municipality=user.assigned_municipality)
        # Super Admin sees all
        
        # --- NEW: Filter by Club (for Super/Muni admins) ---
        club_id = self.request.query_params.get('club')
        if club_id:
            queryset = queryset.filter(resource__club_id=club_id)
        # ---------------------------------------------------
        
        # --- Filters ---
        
        # 1. By Status (e.g. ?status=PENDING)
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # 2. By Date Range (e.g. ?start_date=2023-01-01&end_date=2023-01-31)
        start_str = self.request.query_params.get('start_date')
        end_str = self.request.query_params.get('end_date')
        
        if start_str and end_str:
            # Filter bookings that overlap with this range
            queryset = queryset.filter(
                start_time__date__lte=end_str,
                end_time__date__gte=start_str
            )
            
        # 3. By Resource (e.g. ?resource=5)
        resource_id = self.request.query_params.get('resource')
        if resource_id:
            queryset = queryset.filter(resource_id=resource_id)

        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateBookingSerializer
        return BookingSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        booking = self.get_object()
        if booking.status != Booking.Status.PENDING:
            return Response({'error': 'Booking is not pending'}, status=400)
        
        booking.status = Booking.Status.APPROVED
        booking.internal_notes = request.data.get('notes', '')
        booking.save()
        
        # TODO: Trigger Notification here
        
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        booking = self.get_object()
        booking.status = Booking.Status.REJECTED
        booking.internal_notes = request.data.get('notes', '')
        booking.save()
        
        # TODO: Trigger Notification here
        
        return Response(BookingSerializer(booking).data)