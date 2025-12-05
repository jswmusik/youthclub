from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from .models import Event, EventRegistration
from .serializers import EventSerializer, EventRegistrationSerializer
from .services import register_user_for_event, cancel_registration

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # Basic filters for Admin/Frontend
    filterset_fields = ['municipality', 'club', 'status', 'target_audience']
    search_fields = ['title', 'description']
    ordering_fields = ['start_date', 'created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        
        # Basic filtering: Admins see all, Youth see Published
        if self.action == 'list' and not user.is_staff:
            return qs.filter(status=Event.Status.PUBLISHED, start_date__gte=timezone.now())
        return qs

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def register(self, request, pk=None):
        """
        Register the current user for the event using the Service Logic.
        """
        event = self.get_object()
        try:
            registration = register_user_for_event(request.user, event)
            return Response(
                EventRegistrationSerializer(registration).data, 
                status=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": "Registration failed"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cancel(self, request, pk=None):
        """
        Allow user to cancel their own registration.
        """
        event = self.get_object()
        registration = EventRegistration.objects.filter(event=event, user=request.user).first()
        
        if not registration:
            return Response({"error": "Not registered"}, status=400)
            
        cancel_registration(registration)
        return Response({"status": "Cancelled"}, status=200)

class EventRegistrationViewSet(viewsets.ModelViewSet):
    queryset = EventRegistration.objects.all()
    serializer_class = EventRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # Enable filtering by status, event, and date
    filterset_fields = ['status', 'event', 'event__municipality', 'event__club']
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'event__title']
    ordering_fields = ['created_at', 'event__start_date']

    def get_queryset(self):
        user = self.request.user
        qs = EventRegistration.objects.all()

        # 1. Normal Users: Only see their own history
        if not user.is_staff:
            return qs.filter(user=user)

        # 2. Admins: Scoped visibility
        # Super Admin sees all (no filter needed)
        
        # Municipality Admin
        if user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            qs = qs.filter(event__municipality=user.assigned_municipality)
            
        # Club Admin
        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            qs = qs.filter(event__club=user.assigned_club)

        return qs