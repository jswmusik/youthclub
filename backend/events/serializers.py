from rest_framework import serializers
from .models import Event, EventRegistration, EventTicket
from users.serializers import UserListSerializer
from organization.serializers import MunicipalitySerializer, ClubSerializer # Assuming these exist

class EventTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventTicket
        fields = ['id', 'ticket_code', 'is_active', 'checked_in_at']
        read_only_fields = ['ticket_code', 'checked_in_at']

class EventRegistrationSerializer(serializers.ModelSerializer):
    ticket = EventTicketSerializer(read_only=True)
    user_detail = UserListSerializer(source='user', read_only=True)
    event_detail = serializers.SerializerMethodField()

    class Meta:
        model = EventRegistration
        fields = [
            'id', 'event', 'user', 'user_detail', 'status', 
            'created_at', 'ticket', 'event_detail'
        ]
        read_only_fields = ['status', 'approved_by', 'approval_date', 'ticket']

    def get_event_detail(self, obj):
        """Return basic event info for list views"""
        return {
            'id': obj.event.id,
            'title': obj.event.title,
            'start_date': obj.event.start_date,
            'location_name': obj.event.location_name,
        }

    def validate(self, data):
        # We will add complex validation (duplicate checks, age checks) here or in Views
        return data

class EventSerializer(serializers.ModelSerializer):
    municipality_detail = MunicipalitySerializer(source='municipality', read_only=True)
    club_detail = ClubSerializer(source='club', read_only=True)
    
    # Field to check if current user is registered (calculated in View)
    user_registration_status = serializers.SerializerMethodField()
    is_full = serializers.BooleanField(read_only=True)

    class Meta:
        model = Event
        fields = '__all__'
        read_only_fields = ['confirmed_participants_count', 'waitlist_count']

    def get_user_registration_status(self, obj):
        # We'll inject this context from the ViewSet
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            # Optimization: This query can be pre-fetched in the view
            reg = obj.registrations.filter(user=user).first()
            return reg.status if reg else None
        return None

    def validate(self, data):
        if data.get('end_date') and data.get('start_date'):
            if data['end_date'] < data['start_date']:
                raise serializers.ValidationError("End date cannot be before start date.")
        return data