from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.dateparse import parse_date
from datetime import date, timedelta
from django.db.models import Q, F

from .models import BookingResource, Booking, BookingSchedule
from .serializers import BookingResourceSerializer, BookingSerializer, CreateBookingSerializer, BookingScheduleSerializer
from .services import get_available_slots
from groups.models import GroupMembership

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
            # Youth Logic: Active + Scope check
            queryset = queryset.filter(is_active=True)
            
            # Filter by scope (club vs municipality) if provided
            scope_param = self.request.query_params.get('scope')
            
            if scope_param == 'club':
                # Show only resources from user's preferred club
                if user.preferred_club:
                    queryset = queryset.filter(club=user.preferred_club)
                    # Only show CLUB-scoped or GROUP-scoped resources from their club
                    queryset = queryset.filter(
                        Q(allowed_user_scope=BookingResource.UserScope.CLUB) |
                        Q(allowed_user_scope=BookingResource.UserScope.GROUP)
                    )
                else:
                    # User has no preferred club, return empty queryset
                    queryset = queryset.none()
            elif scope_param == 'municipality':
                # Show municipality-wide or global resources from user's municipality
                if user.preferred_club and user.preferred_club.municipality:
                    queryset = queryset.filter(club__municipality=user.preferred_club.municipality)
                    # Only show MUNICIPALITY or GLOBAL scoped resources
                    queryset = queryset.filter(
                        Q(allowed_user_scope=BookingResource.UserScope.MUNICIPALITY) |
                        Q(allowed_user_scope=BookingResource.UserScope.GLOBAL)
                    )
                else:
                    # User has no preferred club/municipality, return empty queryset
                    queryset = queryset.none()
            # If no scope param, show all (for backward compatibility)
            
            # Filter out group-restricted resources where user is not a member
            # Get all group IDs the user is an approved member of
            user_group_ids = list(GroupMembership.objects.filter(
                user=user,
                status=GroupMembership.Status.APPROVED
            ).values_list('group_id', flat=True))
            
            # Exclude resources that are group-restricted and user is not a member
            # Resources with allowed_user_scope != 'GROUP' are always visible
            # Resources with allowed_user_scope == 'GROUP' but no allowed_group are visible
            # Resources with allowed_user_scope == 'GROUP' and allowed_group must check membership
            queryset = queryset.filter(
                ~Q(allowed_user_scope=BookingResource.UserScope.GROUP) |
                Q(allowed_user_scope=BookingResource.UserScope.GROUP, allowed_group__isnull=True) |
                Q(allowed_user_scope=BookingResource.UserScope.GROUP, allowed_group__id__in=user_group_ids)
            )
            
            # Filter out resources that require qualification if user is not in the qualification group
            # Resources without requires_training are always visible
            # Resources with requires_training but no qualification_group are visible (edge case)
            # Resources with requires_training and qualification_group must check membership
            queryset = queryset.filter(
                ~Q(requires_training=True) |
                Q(requires_training=True, qualification_group__isnull=True) |
                Q(requires_training=True, qualification_group__id__in=user_group_ids)
            )
            
            return queryset
            
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
        # Slots are already converted to ISO format strings in get_available_slots
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
            # Parse dates explicitly to ensure proper comparison
            try:
                start_date = parse_date(start_str)
                end_date = parse_date(end_str)
                # Filter bookings that overlap with this range
                queryset = queryset.filter(
                    start_time__date__lte=end_date,
                    end_time__date__gte=start_date
                )
            except (ValueError, TypeError) as e:
                # If date parsing fails, log but don't break the query
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Invalid date range: {start_str} to {end_str}: {e}")
            
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

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        # Only allow canceling APPROVED or PENDING bookings
        if booking.status not in [Booking.Status.APPROVED, Booking.Status.PENDING]:
            return Response({'error': 'Only approved or pending bookings can be cancelled'}, status=400)
        
        cancel_series = request.data.get('cancel_series', False)
        notes = request.data.get('notes', '')
        
        # Check if this is a recurring booking
        is_recurring_instance = booking.parent_booking is not None
        is_parent_recurring = booking.is_recurring
        
        if cancel_series and (is_recurring_instance or is_parent_recurring):
            # Cancel the entire series
            if is_recurring_instance:
                # This is a recurring instance - cancel from this instance onwards
                parent = booking.parent_booking
                # Cancel all future instances (including this one)
                future_instances = Booking.objects.filter(
                    parent_booking=parent,
                    start_time__gte=booking.start_time,
                    status__in=[Booking.Status.APPROVED, Booking.Status.PENDING]
                )
                # Cancel all instances (this booking is included in the filter)
                cancelled_count = future_instances.update(
                    status=Booking.Status.CANCELLED,
                    internal_notes=notes if notes else F('internal_notes')
                )
            else:
                # This is the parent booking - cancel all instances including parent
                parent = booking
                # Cancel all child instances
                child_instances = Booking.objects.filter(
                    parent_booking=parent,
                    status__in=[Booking.Status.APPROVED, Booking.Status.PENDING]
                )
                cancelled_count = child_instances.update(
                    status=Booking.Status.CANCELLED,
                    internal_notes=notes if notes else F('internal_notes')
                )
                # Cancel the parent booking itself
                parent.status = Booking.Status.CANCELLED
                parent.recurring_end_date = booking.start_time
                if notes:
                    parent.internal_notes = notes
                parent.save()
                cancelled_count += 1  # Include parent in count
            
            # Refresh booking object to get updated status
            booking.refresh_from_db()
            
            # TODO: Trigger Notification here
            
            return Response({
                'message': f'Cancelled booking and {cancelled_count} future instance(s)',
                'booking': BookingSerializer(booking).data
            })
        else:
            # Cancel only this instance
            booking.status = Booking.Status.CANCELLED
            if notes:
                booking.internal_notes = notes
            booking.save()
            
            # TODO: Trigger Notification here
            
            return Response(BookingSerializer(booking).data)