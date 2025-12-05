from rest_framework import serializers
from .models import Event, EventRegistration, EventTicket, EventImage, EventDocument
from users.serializers import UserListSerializer
from organization.serializers import MunicipalitySerializer, ClubSerializer

class EventImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventImage
        fields = ['id', 'image', 'caption', 'order']

class EventDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventDocument
        fields = ['id', 'file', 'title', 'description']

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
        fields = ['id', 'event', 'user', 'user_detail', 'status', 'created_at', 'ticket', 'event_detail']
        read_only_fields = ['approved_by', 'approval_date', 'ticket']

    def get_event_detail(self, obj):
        return {
            'id': obj.event.id,
            'title': obj.event.title,
            'start_date': obj.event.start_date,
            'location_name': obj.event.location_name,
        }

class EventSerializer(serializers.ModelSerializer):
    municipality_detail = MunicipalitySerializer(source='municipality', read_only=True)
    club_detail = ClubSerializer(source='club', read_only=True)
    
    # Nested Media
    images = EventImageSerializer(many=True, read_only=True)
    documents = EventDocumentSerializer(many=True, read_only=True)
    
    # Write-only fields for media upload (handled in create/update if needed, or separate endpoints)
    # Typically in React we upload files to separate endpoints or use FormData with nested naming
    # For simplicity, we usually keep them read-only here and manage them via nested ViewSet or separate calls
    
    user_registration_status = serializers.SerializerMethodField()
    is_full = serializers.BooleanField(read_only=True)

    class Meta:
        model = Event
        fields = '__all__'
        read_only_fields = ['confirmed_participants_count', 'waitlist_count']

    def get_user_registration_status(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            reg = obj.registrations.filter(user=user).first()
            return reg.status if reg else None
        return None

    def validate(self, data):
        if data.get('end_date') and data.get('start_date'):
            if data['end_date'] < data['start_date']:
                raise serializers.ValidationError("End date cannot be before start date.")
        return data