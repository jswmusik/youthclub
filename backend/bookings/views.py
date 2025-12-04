from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.dateparse import parse_date
from datetime import date, timedelta

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
    """
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['YOUTH_MEMBER', 'GUARDIAN']:
            return Booking.objects.filter(user=user)
        # Admins see all
        return Booking.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateBookingSerializer
        return BookingSerializer