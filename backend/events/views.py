from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q

from .models import Event, EventRegistration, EventImage, EventDocument
from .serializers import EventSerializer, EventRegistrationSerializer, EventImageSerializer, EventDocumentSerializer
from .services import register_user_for_event, cancel_registration
from .permissions import IsEventOwnerOrReadOnly
from django.utils import timezone

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    filterset_fields = ['municipality', 'club', 'status', 'target_audience']
    search_fields = ['title', 'description', 'location_name']
    ordering_fields = ['start_date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        qs = Event.objects.all()

        # 1. Unauthenticated (Public)
        if not user.is_authenticated:
            return qs.filter(status=Event.Status.PUBLISHED, is_global=True)

        # 2. Super Admin (See All)
        if user.role == 'SUPER_ADMIN':
            return qs

        # 3. Municipality Admin (See Own Muni + Own Clubs)
        if user.role == 'MUNICIPALITY_ADMIN':
            if user.assigned_municipality:
                return qs.filter(municipality=user.assigned_municipality)
            return qs.none()

        # 4. Club Admin (See Own Club Only)
        if user.role == 'CLUB_ADMIN':
            if user.assigned_club:
                return qs.filter(club=user.assigned_club)
            return qs.none()

        # 5. Youth / Guardian / Standard User (See Published & Targeted)
        # (Simplified for now - in Phase 4 we add the strict targeting filter engine)
        return qs.filter(status=Event.Status.PUBLISHED)

    def perform_create(self, serializer):
        # Auto-assign organization based on admin role
        user = self.request.user
        if user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            serializer.save(municipality=user.assigned_municipality)
        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            # Club admins belong to a club, which belongs to a muni
            serializer.save(
                club=user.assigned_club, 
                municipality=user.assigned_club.municipality
            )
        else:
            serializer.save()

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
    filterset_fields = ['status', 'event']
    ordering_fields = ['created_at', 'event__start_date']

    def get_queryset(self):
        user = self.request.user
        qs = EventRegistration.objects.select_related('user', 'event').all()

        # Filter by event if provided in query params
        event_id = self.request.query_params.get('event')
        if event_id:
            qs = qs.filter(event_id=event_id)

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