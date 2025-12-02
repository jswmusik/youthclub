from rest_framework import serializers
from .models import CheckInSession
from users.serializers import UserListSerializer # Assuming you have this, or use UserSerializer

class CheckInSessionSerializer(serializers.ModelSerializer):
    user_details = UserListSerializer(source='user', read_only=True)
    club_name = serializers.CharField(source='club.name', read_only=True)
    club_avatar = serializers.SerializerMethodField()
    is_guest = serializers.SerializerMethodField()
    
    class Meta:
        model = CheckInSession
        fields = ['id', 'user', 'user_details', 'club', 'club_name', 'club_avatar', 'check_in_at', 'check_out_at', 'method', 'is_guest']
        read_only_fields = ['check_in_at', 'check_out_at', 'method', 'is_guest']
    
    def get_is_guest(self, obj):
        """Returns True if the user's preferred_club is different from the visit club"""
        if not obj.user.preferred_club:
            return False  # No preferred club means not a guest
        preferred_club_id = obj.user.preferred_club.id if hasattr(obj.user.preferred_club, 'id') else obj.user.preferred_club
        return preferred_club_id != obj.club.id
    
    def get_club_avatar(self, obj):
        if obj.club and obj.club.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.club.avatar.url)
            # Fallback: return relative URL (frontend will handle with getMediaUrl)
            return obj.club.avatar.url
        return None

class QRCodeScanSerializer(serializers.Serializer):
    token = serializers.CharField()
    latitude = serializers.FloatField(required=False)
    longitude = serializers.FloatField(required=False)

class ManualCheckInSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()