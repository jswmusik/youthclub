from rest_framework import serializers
from .models import Group, GroupMembership
from organization.serializers import InterestSerializer
from users.models import User  # Import User

class GroupMembershipSerializer(serializers.ModelSerializer):
    """
    Shows which user is in a group and their status (Pending/Approved).
    """
    user_name = serializers.SerializerMethodField()
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_avatar = serializers.ImageField(source='user.avatar', read_only=True)
    # NEW: Group Name for the requests list
    group_name = serializers.CharField(source='group.name', read_only=True)
    # NEW: Municipality and Club info for filtering
    group_municipality = serializers.IntegerField(source='group.municipality.id', read_only=True, allow_null=True)
    group_municipality_name = serializers.CharField(source='group.municipality.name', read_only=True, allow_null=True)
    group_club = serializers.IntegerField(source='group.club.id', read_only=True, allow_null=True)
    group_club_name = serializers.CharField(source='group.club.name', read_only=True, allow_null=True)

    class Meta:
        model = GroupMembership
        fields = ['id', 'user', 'user_name', 'user_first_name', 'user_last_name', 'user_email', 'user_avatar', 'group', 'group_name', 
                  'group_municipality', 'group_municipality_name', 'group_club', 'group_club_name',
                  'status', 'role', 'joined_at']

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"

class GroupSerializer(serializers.ModelSerializer):
    interests_details = InterestSerializer(source='interests', many=True, read_only=True)
    municipality_name = serializers.CharField(source='municipality.name', read_only=True)
    club_name = serializers.CharField(source='club.name', read_only=True)
    
    member_count = serializers.SerializerMethodField()
    pending_request_count = serializers.SerializerMethodField()

    # NEW: Write-only field to accept a list of User IDs to add immediately
    members_to_add = serializers.ListField(
        child=serializers.IntegerField(), 
        write_only=True, 
        required=False
    )

    class Meta:
        model = Group
        fields = [
            'id', 'name', 'description', 'avatar',
            'municipality', 'municipality_name',
            'club', 'club_name',
            'group_type', 'target_member_type',
            'is_system_group', 'system_group_type',
            'min_age', 'max_age', 'grades', 'genders',
            'interests', 'interests_details',
            'custom_field_rules',
            'member_count', 'pending_request_count', 'created_at',
            'members_to_add'  # Add to fields
        ]

    def get_member_count(self, obj):
        return obj.memberships.filter(status='APPROVED').count()

    def get_pending_request_count(self, obj):
        return obj.memberships.filter(status='PENDING').count()

    def create(self, validated_data):
        # Extract members data
        members_ids = validated_data.pop('members_to_add', [])
        interests = validated_data.pop('interests', [])
        
        # Create group
        group = Group.objects.create(**validated_data)
        group.interests.set(interests)
        
        # Add members
        for user_id in members_ids:
            # We use get_or_create to allow "updating" lists safely
            GroupMembership.objects.get_or_create(
                group=group, 
                user_id=user_id, 
                defaults={'status': 'APPROVED', 'role': 'MEMBER'}
            )
            
        return group

    def update(self, instance, validated_data):
        members_ids = validated_data.pop('members_to_add', [])
        interests = validated_data.pop('interests', None)
        
        # Update standard fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update interests if provided
        if interests is not None:
            instance.interests.set(interests)
        
        # Add NEW members (we do not remove existing ones here to be safe)
        for user_id in members_ids:
            GroupMembership.objects.get_or_create(
                group=instance, 
                user_id=user_id, 
                defaults={'status': 'APPROVED', 'role': 'MEMBER'}
            )
            
        return instance