from rest_framework import serializers
from .models import BookingResource, Booking, BookingParticipant, BookingSchedule
from users.serializers import UserListSerializer

class BookingScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingSchedule
        fields = '__all__'

class BookingResourceSerializer(serializers.ModelSerializer):
    club_name = serializers.CharField(source='club.name', read_only=True)
    group_name = serializers.CharField(source='allowed_group.name', read_only=True)
    # We can optionally include schedules here if we want to load them with the resource
    schedules = BookingScheduleSerializer(many=True, read_only=True)
    
    class Meta:
        model = BookingResource
        fields = '__all__'

class BookingParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingParticipant
        fields = ['id', 'name', 'user']

class BookingSerializer(serializers.ModelSerializer):
    participants = BookingParticipantSerializer(many=True, read_only=True)
    resource_name = serializers.CharField(source='resource.name', read_only=True)
    club_name = serializers.CharField(source='resource.club.name', read_only=True)
    user_detail = UserListSerializer(source='user', read_only=True)
    
    class Meta:
        model = Booking
        fields = [
            'id', 'user', 'user_detail', 'resource', 'resource_name', 'club_name',
            'start_time', 'end_time', 'status', 
            'internal_notes', 'participants', 'created_at'
        ]
        read_only_fields = ['user', 'status', 'created_at']

class CreateBookingSerializer(serializers.ModelSerializer):
    participants = serializers.ListField(
        child=serializers.CharField(max_length=100), required=False
    )

    class Meta:
        model = Booking
        fields = ['resource', 'start_time', 'end_time', 'participants']

    def create(self, validated_data):
        participants_data = validated_data.pop('participants', [])
        user = self.context['request'].user
        resource = validated_data['resource']
        
        # Determine initial status based on resource auto_approve setting
        initial_status = Booking.Status.APPROVED if resource.auto_approve else Booking.Status.PENDING
        
        # Logic to ensure no double booking happens in the split second between check and save
        # (Optional: Add atomic transaction or select_for_update here for production safety)
        
        booking = Booking.objects.create(user=user, status=initial_status, **validated_data)
        
        # Create participants
        for name in participants_data:
            BookingParticipant.objects.create(booking=booking, name=name)
            
        return booking