from rest_framework import serializers
from .models import Reward, RewardUsage
from organization.serializers import InterestSerializer, ClubSerializer
from groups.serializers import GroupSerializer
import json

class RewardUsageSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)
    user_gender = serializers.CharField(source='user.legal_gender', read_only=True)
    user_birth_date = serializers.DateField(source='user.date_of_birth', read_only=True)
    user_club_name = serializers.CharField(source='user.preferred_club.name', read_only=True)
    user_avatar = serializers.SerializerMethodField()

    def get_user_name(self, obj):
        """Return full name: first_name last_name"""
        if obj.user:
            return f"{obj.user.first_name or ''} {obj.user.last_name or ''}".strip() or 'Unknown User'
        return 'Unknown User'
    
    def get_user_avatar(self, obj):
        """Return avatar URL if available"""
        if obj.user and obj.user.avatar:
            try:
                return obj.user.avatar.url
            except (ValueError, AttributeError):
                return None
        return None

    class Meta:
        model = RewardUsage
        # Include created_at as fallback if redeemed_at is null
        fields = [
            'id', 'user_name', 'user_first_name', 'user_last_name', 'user_email', 
            'user_gender', 'user_birth_date', 'user_club_name', 'user_avatar',
            'redeemed_at', 'created_at'
        ]

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
        Enforce single trigger selection.
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
        
        # Parse and validate active_triggers - only ONE trigger allowed
        if 'active_triggers' in data:
            if isinstance(data['active_triggers'], str):
                try:
                    data['active_triggers'] = json.loads(data['active_triggers'])
                except (json.JSONDecodeError, ValueError):
                    raise serializers.ValidationError({"active_triggers": "Invalid JSON format."})
            if not isinstance(data['active_triggers'], list):
                raise serializers.ValidationError({"active_triggers": "Must be a list."})
            
            # Enforce single trigger selection
            if len(data['active_triggers']) > 1:
                raise serializers.ValidationError({
                    "active_triggers": "Only one trigger can be selected per reward."
                })
            
            # Validate trigger values against allowed choices
            valid_triggers = [choice[0] for choice in Reward.TriggerType.choices]
            for trigger in data['active_triggers']:
                if trigger not in valid_triggers:
                    raise serializers.ValidationError({
                        "active_triggers": f"Invalid trigger type: {trigger}"
                    })
        
        return data