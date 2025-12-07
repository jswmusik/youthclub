from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as django_filters
from django.utils import timezone
from django.db.models import Q
from django.conf import settings

from .models import Event, EventRegistration, EventImage, EventDocument
from .serializers import EventSerializer, EventRegistrationSerializer, EventImageSerializer, EventDocumentSerializer
from .services import register_user_for_event, cancel_registration, generate_recurring_events, filter_events_by_targeting, is_user_eligible_for_event, admin_add_user_to_event
from .permissions import IsEventOwnerOrReadOnly


class EventFilter(django_filters.FilterSet):
    """Custom filter set for Event model with date range support"""
    start_date__gte = django_filters.DateTimeFilter(field_name='start_date', lookup_expr='gte')
    start_date__lte = django_filters.DateTimeFilter(field_name='start_date', lookup_expr='lte')
    end_date__gte = django_filters.DateTimeFilter(field_name='end_date', lookup_expr='gte')
    end_date__lte = django_filters.DateTimeFilter(field_name='end_date', lookup_expr='lte')
    
    class Meta:
        model = Event
        fields = ['municipality', 'club', 'status', 'target_audience']


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    filterset_class = EventFilter
    search_fields = ['title', 'description', 'location_name']
    ordering_fields = ['start_date', 'created_at']
    
    def create(self, request, *args, **kwargs):
        """Override create to provide better error handling and debugging"""
        import traceback
        import logging
        import sys
        logger = logging.getLogger(__name__)
        
        try:
            # Log the incoming request data for debugging
            logger.info(f"=== Creating event ===")
            logger.info(f"User: {request.user.email if request.user.is_authenticated else 'Anonymous'}")
            logger.info(f"Role: {request.user.role if request.user.is_authenticated else 'N/A'}")
            logger.info(f"Request data keys: {list(request.data.keys())}")
            
            # Log specific fields
            for key in ['title', 'status', 'municipality', 'club', 'slug', 'start_date', 'end_date']:
                if key in request.data:
                    logger.info(f"  {key}: {request.data[key]}")
            
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                logger.info("Serializer is valid")
                logger.info(f"Validated data keys: {list(serializer.validated_data.keys())}")
                
                # Log recurrence fields from request data
                print(f"\n{'='*60}", file=sys.stderr)
                print(f"REQUEST DATA - Recurrence fields:", file=sys.stderr)
                print(f"  is_recurring: {request.data.get('is_recurring')}", file=sys.stderr)
                print(f"  recurrence_pattern: {request.data.get('recurrence_pattern')}", file=sys.stderr)
                print(f"  recurrence_end_date: {request.data.get('recurrence_end_date')}", file=sys.stderr)
                print(f"{'='*60}\n", file=sys.stderr)
                
                # IMPORTANT: Call perform_create which handles recurrence generation
                # This is what DRF's CreateModelMixin.create() does
                self.perform_create(serializer)
                
                headers = self.get_success_headers(serializer.data)
                logger.info(f"Event created successfully: {serializer.instance.id if serializer.instance else 'N/A'}")
                return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
            else:
                logger.error(f"Serializer validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            error_traceback = traceback.format_exc()
            logger.error(f"=== ERROR creating event ===")
            logger.error(f"Error: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Traceback:\n{error_traceback}")
            logger.error(f"Request data: {dict(request.data)}")
            logger.error(f"User: {request.user.email if request.user.is_authenticated else 'Anonymous'}")
            logger.error(f"User role: {request.user.role if request.user.is_authenticated else 'N/A'}")
            if request.user.is_authenticated:
                logger.error(f"Assigned club: {getattr(request.user, 'assigned_club', None)}")
                logger.error(f"Assigned municipality: {getattr(request.user, 'assigned_municipality', None)}")
            
            # Return a detailed error response
            error_detail = {
                "error": str(e),
                "detail": "An error occurred while creating the event.",
                "type": type(e).__name__
            }
            # Include traceback in development
            if settings.DEBUG:
                error_detail["traceback"] = error_traceback.split('\n')[:20]  # First 20 lines
            
            return Response(
                error_detail,
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_queryset(self):
        # First, automatically publish any scheduled events that have passed their scheduled_publish_date
        # This ensures scheduled events are published even if the cron job hasn't run yet
        now = timezone.now()
        scheduled_events = Event.objects.filter(
            status=Event.Status.SCHEDULED,
            scheduled_publish_date__isnull=False,
            scheduled_publish_date__lte=now
        )
        if scheduled_events.exists():
            scheduled_events.update(
                status=Event.Status.PUBLISHED,
                scheduled_publish_date=None
            )
        
        user = self.request.user
        qs = Event.objects.all()

        # 1. Unauthenticated (Public)
        if not user.is_authenticated:
            qs = qs.filter(status=Event.Status.PUBLISHED, is_global=True)

        # 2. Super Admin (See All)
        elif user.role == 'SUPER_ADMIN':
            pass  # No filtering, see all

        # 3. Municipality Admin (See Own Muni + Own Clubs)
        elif user.role == 'MUNICIPALITY_ADMIN':
            if user.assigned_municipality:
                qs = qs.filter(municipality=user.assigned_municipality)
            else:
                return qs.none()

        # 4. Club Admin (See Own Club Only)
        elif user.role == 'CLUB_ADMIN':
            if user.assigned_club:
                qs = qs.filter(club=user.assigned_club)
            else:
                return qs.none()

        # 5. Youth / Guardian / Standard User (See Published & Targeted)
        else:
            qs = qs.filter(status=Event.Status.PUBLISHED)
            
            # Apply scope filtering first (municipality/club/global)
            scope_conditions = Q()
            
            # Global events are visible to everyone
            scope_conditions |= Q(is_global=True)
            
            # Municipality/Club scope targeting for youth members
            if user.role == 'YOUTH_MEMBER' and hasattr(user, 'preferred_club') and user.preferred_club:
                # Municipality scope (events for the municipality but not specific to a club)
                if user.preferred_club.municipality:
                    scope_conditions |= Q(municipality=user.preferred_club.municipality, club__isnull=True)
                # Club scope (events for the user's club)
                scope_conditions |= Q(club=user.preferred_club)
            
            # Apply scope conditions
            qs = qs.filter(scope_conditions).distinct()
            
            # Apply targeting criteria filtering for youth/guardian users
            # This ensures users only see events they can actually apply to
            # (based on gender, age, grade, interests, groups)
            matching_event_ids = filter_events_by_targeting(qs, user)
            qs = qs.filter(id__in=matching_event_ids)
        
        # IMPORTANT: Include both parent events AND recurring instances
        # Recurring instances have parent_event set, and we want to show them all
        # No filtering on parent_event - show all events
        
        # Apply date range filtering if provided (for calendar views)
        # DjangoFilterBackend will handle start_date__lte and end_date__gte automatically
        # But we can also add explicit support here if needed
        
        return qs.select_related('municipality', 'club', 'parent_event')

    def perform_create(self, serializer):
        import logging
        import sys
        logger = logging.getLogger(__name__)
        
        # Municipality and club are auto-assigned in the serializer's create method
        # based on the user's role. Here we just save and handle recurrence.
        event = serializer.save()
        
        # Print to stdout for immediate visibility
        print(f"\n{'='*60}", file=sys.stderr)
        print(f"Event created: ID={event.id}", file=sys.stderr)
        print(f"  is_recurring: {event.is_recurring}", file=sys.stderr)
        print(f"  recurrence_pattern: {event.recurrence_pattern}", file=sys.stderr)
        print(f"  recurrence_end_date: {event.recurrence_end_date}", file=sys.stderr)
        print(f"{'='*60}\n", file=sys.stderr)
        
        logger.info(f"Event created: ID={event.id}, is_recurring={event.is_recurring}, recurrence_pattern={event.recurrence_pattern}, recurrence_end_date={event.recurrence_end_date}")
        
        # TRIGGER RECURRENCE GENERATION
        if event.is_recurring:
            print(f"TRIGGERING RECURRENCE GENERATION...", file=sys.stderr)
            logger.info("Triggering recurrence generation...")
            try:
                generate_recurring_events(event)
                print(f"Recurrence generation completed successfully", file=sys.stderr)
                logger.info("Recurrence generation completed successfully")
            except Exception as e:
                print(f"ERROR generating recurring events: {str(e)}", file=sys.stderr)
                import traceback
                print(traceback.format_exc(), file=sys.stderr)
                logger.error(f"Error generating recurring events: {str(e)}")
                logger.error(traceback.format_exc())
                # Don't fail the entire creation if recurrence fails, but log it
                # In production, you might want to raise this or handle it differently
        else:
            print(f"Event is NOT recurring, skipping recurrence generation", file=sys.stderr)
            logger.info("Event is not recurring, skipping recurrence generation")

    def perform_update(self, serializer):
        """Override update to handle recurrence regeneration when recurrence settings change"""
        import logging
        import sys
        logger = logging.getLogger(__name__)
        
        instance = self.get_object()
        old_is_recurring = instance.is_recurring
        old_recurrence_pattern = instance.recurrence_pattern
        old_recurrence_end_date = instance.recurrence_end_date
        
        # Save the updated event
        event = serializer.save()
        
        # Check if recurrence settings changed
        recurrence_changed = (
            old_is_recurring != event.is_recurring or
            old_recurrence_pattern != event.recurrence_pattern or
            old_recurrence_end_date != event.recurrence_end_date
        )
        
        print(f"\n{'='*60}", file=sys.stderr)
        print(f"Event updated: ID={event.id}", file=sys.stderr)
        print(f"  Old: is_recurring={old_is_recurring}, pattern={old_recurrence_pattern}, end_date={old_recurrence_end_date}", file=sys.stderr)
        print(f"  New: is_recurring={event.is_recurring}, pattern={event.recurrence_pattern}, end_date={event.recurrence_end_date}", file=sys.stderr)
        print(f"  Recurrence changed: {recurrence_changed}", file=sys.stderr)
        print(f"{'='*60}\n", file=sys.stderr)
        
        logger.info(f"Event updated: ID={event.id}, recurrence_changed={recurrence_changed}")
        
        # If recurrence settings changed, regenerate instances
        if recurrence_changed:
            # Delete existing instances if any
            existing_instances = Event.objects.filter(parent_event=event)
            instance_count = existing_instances.count()
            if instance_count > 0:
                print(f"Deleting {instance_count} existing recurring instances...", file=sys.stderr)
                logger.info(f"Deleting {instance_count} existing recurring instances")
                existing_instances.delete()
            
            # Generate new instances if event is now recurring
            if event.is_recurring:
                print(f"TRIGGERING RECURRENCE GENERATION (UPDATE)...", file=sys.stderr)
                logger.info("Triggering recurrence generation on update...")
                try:
                    from .services import generate_recurring_events
                    generate_recurring_events(event)
                    print(f"Recurrence generation completed successfully", file=sys.stderr)
                    logger.info("Recurrence generation completed successfully")
                except Exception as e:
                    print(f"ERROR generating recurring events: {str(e)}", file=sys.stderr)
                    import traceback
                    print(traceback.format_exc(), file=sys.stderr)
                    logger.error(f"Error generating recurring events: {str(e)}")
                    logger.error(traceback.format_exc())

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def register(self, request, pk=None):
        event = self.get_object()
        try:
            registration = register_user_for_event(request.user, event)
            return Response(EventRegistrationSerializer(registration).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            error_message = str(e)
            if hasattr(e, 'message_dict'):
                error_message = ', '.join([f"{k}: {', '.join(v)}" for k, v in e.message_dict.items()])
            elif hasattr(e, 'messages'):
                error_message = ', '.join(e.messages)
            return Response({"error": error_message}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cancel(self, request, pk=None):
        event = self.get_object()
        registration = EventRegistration.objects.filter(event=event, user=request.user).first()
        if not registration:
            return Response({"error": "Not registered"}, status=400)
        cancel_registration(registration)
        return Response({"status": "Cancelled"}, status=200)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def eligible_members(self, request, pk=None):
        """
        Get list of members eligible for this event.
        Only accessible by admins.
        """
        from users.models import User
        from django.db.models import Q
        
        event = self.get_object()
        
        # Check if user is admin
        if request.user.role not in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        
        # Get all youth members
        queryset = User.objects.filter(role=User.Role.YOUTH_MEMBER)
        
        # Apply scope filtering based on admin role
        if request.user.role == 'CLUB_ADMIN' and request.user.assigned_club:
            queryset = queryset.filter(preferred_club=request.user.assigned_club)
        elif request.user.role == 'MUNICIPALITY_ADMIN' and request.user.assigned_municipality:
            queryset = queryset.filter(preferred_club__municipality=request.user.assigned_municipality)
        
        # Filter by eligibility
        eligible_users = []
        for user in queryset.select_related('preferred_club').prefetch_related('interests', 'groups'):
            is_eligible, reason = is_user_eligible_for_event(user, event)
            if is_eligible:
                # Check if already registered
                existing_reg = EventRegistration.objects.filter(
                    user=user, 
                    event=event
                ).exclude(status=EventRegistration.Status.CANCELLED).first()
                
                eligible_users.append({
                    'id': user.id,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'grade': user.grade,
                    'legal_gender': user.legal_gender,
                    'date_of_birth': user.date_of_birth.isoformat() if user.date_of_birth else None,
                    'is_registered': existing_reg is not None,
                    'registration_status': existing_reg.status if existing_reg else None,
                })
        
        return Response(eligible_users, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def add_member(self, request, pk=None):
        """
        Admin action to add a member to an event.
        Requires user_id in request body.
        """
        from users.models import User
        
        event = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user is admin
        if request.user.role not in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user = User.objects.get(id=user_id, role=User.Role.YOUTH_MEMBER)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Optional: Check eligibility (but allow admin override)
        is_eligible, reason = is_user_eligible_for_event(user, event)
        if not is_eligible and not request.data.get('force', False):
            return Response({
                "error": f"User is not eligible: {reason}",
                "reason": reason
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Optional status override
        status_override = request.data.get('status')
        
        try:
            registration = admin_add_user_to_event(user, event, request.user, status=status_override)
            return Response(EventRegistrationSerializer(registration).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """
        Override destroy to handle deletion of recurring event instances.
        Supports ?delete_future=true to delete this instance and all future instances.
        """
        import logging
        import sys
        logger = logging.getLogger(__name__)
        
        instance = self.get_object()
        delete_future = request.query_params.get('delete_future', 'false').lower() == 'true'
        
        print(f"\n{'='*60}", file=sys.stderr)
        print(f"Deleting event ID={instance.id}", file=sys.stderr)
        print(f"  Title: {instance.title}", file=sys.stderr)
        print(f"  is_recurring: {instance.is_recurring}", file=sys.stderr)
        print(f"  parent_event: {instance.parent_event}", file=sys.stderr)
        print(f"  delete_future: {delete_future}", file=sys.stderr)
        print(f"{'='*60}\n", file=sys.stderr)
        
        try:
            if delete_future and instance.parent_event:
                # Delete this instance and all future instances
                # Get all instances with the same parent that start on or after this instance
                future_instances = Event.objects.filter(
                    parent_event=instance.parent_event,
                    start_date__gte=instance.start_date
                )
                count = future_instances.count()
                print(f"Deleting {count} future instances (including this one)", file=sys.stderr)
                future_instances.delete()
                logger.info(f"Deleted {count} future instances of recurring event {instance.parent_event.id}")
            elif instance.is_recurring and not instance.parent_event:
                # Deleting parent event - delete all instances
                instances = Event.objects.filter(parent_event=instance)
                count = instances.count()
                print(f"Deleting parent event and {count} instances", file=sys.stderr)
                instances.delete()  # Delete instances first
                instance.delete()  # Then delete parent
                logger.info(f"Deleted parent event {instance.id} and {count} instances")
            else:
                # Regular delete - just this instance
                instance.delete()
                logger.info(f"Deleted event {instance.id}")
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"Error deleting event: {str(e)}")
            import traceback
            print(f"ERROR deleting event: {str(e)}", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            return Response(
                {"error": str(e), "detail": "An error occurred while deleting the event."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# --- Sub-ViewSets for managing media separately if needed ---
# This is often cleaner for "uploading 5 images" than nesting them in one big PUT
class EventImageViewSet(viewsets.ModelViewSet):
    queryset = EventImage.objects.all()
    serializer_class = EventImageSerializer
    permission_classes = [permissions.IsAuthenticated, IsEventOwnerOrReadOnly] # <--- SECURED

    def get_queryset(self):
        # Support both nested routes (event_pk in URL) and flat routes (event in query params)
        event_pk = self.kwargs.get('event_pk')
        if event_pk:
            return EventImage.objects.filter(event_id=event_pk)
        # For flat routes, filter by event from query params
        event_id = self.request.query_params.get('event')
        if event_id:
            return EventImage.objects.filter(event_id=event_id)
        # If no filter, return all (will be filtered by permissions)
        return EventImage.objects.all()

    def perform_create(self, serializer):
        from .models import Event
        # Support both nested routes and flat routes
        event_pk = self.kwargs.get('event_pk') or self.request.data.get('event')
        if not event_pk:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Event ID is required")
        event = Event.objects.get(pk=event_pk)
        # The Permission class will check if request.user owns this event
        self.check_object_permissions(self.request, event) 
        serializer.save(event=event)


class EventDocumentViewSet(viewsets.ModelViewSet):
    queryset = EventDocument.objects.all()
    serializer_class = EventDocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsEventOwnerOrReadOnly] # <--- SECURED

    def get_queryset(self):
        # Support both nested routes (event_pk in URL) and flat routes (event in query params)
        event_pk = self.kwargs.get('event_pk')
        if event_pk:
            return EventDocument.objects.filter(event_id=event_pk)
        # For flat routes, filter by event from query params
        event_id = self.request.query_params.get('event')
        if event_id:
            return EventDocument.objects.filter(event_id=event_id)
        # If no filter, return all (will be filtered by permissions)
        return EventDocument.objects.all()

    def perform_create(self, serializer):
        from .models import Event
        # Support both nested routes and flat routes
        event_pk = self.kwargs.get('event_pk') or self.request.data.get('event')
        if not event_pk:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Event ID is required")
        event = Event.objects.get(pk=event_pk)
        self.check_object_permissions(self.request, event)
        serializer.save(event=event)


class EventRegistrationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing event registrations.
    Admins can view and update registrations for events they manage.
    """
    queryset = EventRegistration.objects.all()
    serializer_class = EventRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'event', 'user']
    ordering_fields = ['created_at', 'event__start_date']

    def get_queryset(self):
        user = self.request.user
        qs = EventRegistration.objects.select_related('user', 'event').all()

        # Filter by event if provided in query params
        event_id = self.request.query_params.get('event')
        if event_id:
            qs = qs.filter(event_id=event_id)
        
        # Filter by user if provided in query params (for admins viewing specific user's registrations)
        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)

        # 1. Normal Users: Only see their own registrations
        if user.role not in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
            return qs.filter(user=user)

        # 2. Admins: Scoped visibility based on their role
        if user.role == 'SUPER_ADMIN':
            return qs  # See all

        if user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            # See registrations for events in their municipality
            return qs.filter(event__municipality=user.assigned_municipality)

        if user.role == 'CLUB_ADMIN' and user.assigned_club:
            # See registrations for events in their club
            return qs.filter(event__club=user.assigned_club)

        return qs.none()

    def perform_update(self, serializer):
        # When updating status to APPROVED, set approval fields and update counters
        user = self.request.user
        instance = self.get_object()
        old_status = instance.status
        new_status = serializer.validated_data.get('status', instance.status)
        
        if new_status == EventRegistration.Status.APPROVED and old_status != EventRegistration.Status.APPROVED:
            # Update counters when approving
            event = instance.event
            
            # If was on waitlist, decrement waitlist count
            if old_status == EventRegistration.Status.WAITLIST:
                event.waitlist_count = max(0, event.waitlist_count - 1)
            
            # Increment confirmed count if not already approved
            if old_status != EventRegistration.Status.APPROVED:
                event.confirmed_participants_count += 1
            
            # Save registration with approval fields
            serializer.save(
                approved_by=user,
                approval_date=timezone.now()
            )
            
            # Save event with updated counters
            event.save(update_fields=['confirmed_participants_count', 'waitlist_count'])
            
            # If someone was on waitlist and we approved them, we might need to promote next waitlist person
            # But since we're approving someone, we're not freeing up a seat, so no promotion needed
        elif new_status == EventRegistration.Status.REJECTED and old_status == EventRegistration.Status.APPROVED:
            # If rejecting an approved registration, decrement confirmed count
            event = instance.event
            event.confirmed_participants_count = max(0, event.confirmed_participants_count - 1)
            serializer.save()
            event.save(update_fields=['confirmed_participants_count'])
            # Could promote waitlist here if desired
        elif new_status == EventRegistration.Status.REJECTED and old_status == EventRegistration.Status.WAITLIST:
            # If rejecting a waitlist registration, decrement waitlist count
            event = instance.event
            event.waitlist_count = max(0, event.waitlist_count - 1)
            serializer.save()
            event.save(update_fields=['waitlist_count'])
        else:
            serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def check_in(self, request, pk=None):
        """
        Check in a user to an event.
        Only the user themselves can check in (or admins managing the event).
        """
        from .models import EventTicket
        
        registration = self.get_object()
        user = request.user
        
        # Check permissions: user must be the registration owner OR admin managing the event
        if registration.user != user:
            # Check if admin has permission to manage this event
            if user.role not in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
                return Response(
                    {"error": "You can only check in to your own events"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Admin permission check
            if user.role == 'CLUB_ADMIN' and user.assigned_club:
                if registration.event.club != user.assigned_club:
                    return Response(
                        {"error": "You don't have permission to check in users for this event"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            elif user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
                if registration.event.municipality != user.assigned_municipality:
                    return Response(
                        {"error": "You don't have permission to check in users for this event"},
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        # Check if already checked in
        if registration.status == EventRegistration.Status.ATTENDED:
            return Response(
                {"error": "Already checked in"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if registration is approved (has ticket)
        if registration.status != EventRegistration.Status.APPROVED:
            return Response(
                {"error": "Only approved registrations can check in"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create ticket
        ticket, created = EventTicket.objects.get_or_create(
            registration=registration,
            defaults={'is_active': True}
        )
        
        # Check if already checked in via ticket
        if ticket.checked_in_at:
            return Response(
                {"error": "Already checked in"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update ticket and registration
        ticket.checked_in_at = timezone.now()
        ticket.checked_in_by = user if user != registration.user else None  # Admin checking in user
        ticket.save()
        
        registration.status = EventRegistration.Status.ATTENDED
        registration.save(update_fields=['status'])
        
        return Response({
            "status": "checked_in",
            "checked_in_at": ticket.checked_in_at.isoformat(),
            "ticket_code": ticket.ticket_code
        }, status=status.HTTP_200_OK)