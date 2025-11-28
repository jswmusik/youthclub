from rest_framework import serializers
from .models import Reward, RewardUsage
from organization.serializers import InterestSerializer, ClubSerializer
from groups.serializers import GroupSerializer
import json

class RewardUsageSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.first_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = RewardUsage
        fields = ['id', 'user_name', 'user_email', 'used_at']

class RewardSerializer(serializers.ModelSerializer):
    # Read-only fields to show details nicely in the frontend
    municipality_name = serializers.CharField(source='municipality.name', read_only=True)
    club_name = serializers.CharField(source='club.name', read_only=True)
    
    # Nested serializers for reading (shows full object details)
    target_groups_details = GroupSerializer(source='target_groups', many=True, read_only=True)
    target_interests_details = InterestSerializer(source='target_interests', many=True, read_only=True)

    # Write-only fields for saving data (accepts lists of IDs)
    target_groups = serializers.PrimaryKeyRelatedField(
        many=True, read_only=False, queryset=Reward.target_groups.rel.model.objects.all()
    )
    target_interests = serializers.PrimaryKeyRelatedField(
        many=True, read_only=False, queryset=Reward.target_interests.rel.model.objects.all()
    )

    class Meta:
        model = Reward
        fields = [
            'id', 'name', 'description', 'image', 
            'sponsor_name', 'sponsor_link',
            'owner_role', 'municipality', 'municipality_name', 'club', 'club_name',
            'target_groups', 'target_groups_details',
            'target_interests', 'target_interests_details',
            'target_genders', 'target_grades', 
            'min_age', 'max_age', 'target_member_type',
            'expiration_date', 'usage_limit',
            'active_triggers', 'trigger_config',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'owner_role', 'municipality', 'club']

    def validate(self, data):
        """
        Validate that JSON fields are lists.
        Handle both JSON strings (from FormData) and lists (from JSON API).
        """
        # Parse JSON strings if they come from FormData
        if 'target_genders' in data:
            if isinstance(data['target_genders'], str):
                try:
                    data['target_genders'] = json.loads(data['target_genders'])
                except (json.JSONDecodeError, ValueError):
                    raise serializers.ValidationError({"target_genders": "Invalid JSON format."})
            if not isinstance(data['target_genders'], list):
                raise serializers.ValidationError({"target_genders": "Must be a list."})
        
        if 'target_grades' in data:
            if isinstance(data['target_grades'], str):
                try:
                    data['target_grades'] = json.loads(data['target_grades'])
                except (json.JSONDecodeError, ValueError):
                    raise serializers.ValidationError({"target_grades": "Invalid JSON format."})
            if not isinstance(data['target_grades'], list):
                raise serializers.ValidationError({"target_grades": "Must be a list."})
        
        return data