from rest_framework import serializers
from .models import Group, GroupMembership
from datetime import date
import json

class GroupMembershipSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)
    user_avatar = serializers.SerializerMethodField()
    group_name = serializers.CharField(source='group.name', read_only=True)

    class Meta:
        model = GroupMembership
        fields = ['id', 'group', 'group_name', 'user', 'user_name', 'user_email', 'user_first_name', 'user_last_name', 'user_avatar', 'status', 'role', 'joined_at']
        read_only_fields = ['status', 'role', 'joined_at']

    def get_user_name(self, obj):
        # Django's AbstractUser has get_full_name, but we'll use a safe fallback
        if hasattr(obj.user, 'get_full_name'):
            full_name = obj.user.get_full_name()
            if full_name:
                return full_name
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
    
    def get_user_avatar(self, obj):
        if hasattr(obj.user, 'avatar') and obj.user.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.avatar.url)
            return obj.user.avatar.url
        return None

class GroupSerializer(serializers.ModelSerializer):
    eligibility = serializers.SerializerMethodField()
    membership_status = serializers.SerializerMethodField()
    club_name = serializers.CharField(source='club.name', read_only=True)
    municipality_name = serializers.CharField(source='municipality.name', read_only=True)

    class Meta:
        model = Group
        fields = [
            'id', 'name', 'description', 'avatar', 'background_image', 'group_type',
            'target_member_type', 'min_age', 'max_age', 'grades', 'genders', 'interests',
            'custom_field_rules', 'eligibility', 'membership_status', 'created_at', 
            'municipality', 'club', 'club_name', 'municipality_name',
            'is_system_group'
        ]
        depth = 1

    def validate(self, data):
        """
        Validate that JSON fields are dicts/lists.
        Handle both JSON strings (from FormData) and native types (from JSON API).
        """
        # Parse JSON strings if they come from FormData
        if 'custom_field_rules' in data:
            if isinstance(data['custom_field_rules'], str):
                try:
                    data['custom_field_rules'] = json.loads(data['custom_field_rules'])
                except (json.JSONDecodeError, ValueError):
                    raise serializers.ValidationError({"custom_field_rules": "Invalid JSON format."})
            if not isinstance(data['custom_field_rules'], dict):
                raise serializers.ValidationError({"custom_field_rules": "Must be a dictionary."})
        
        if 'grades' in data:
            if isinstance(data['grades'], str):
                try:
                    data['grades'] = json.loads(data['grades'])
                except (json.JSONDecodeError, ValueError):
                    raise serializers.ValidationError({"grades": "Invalid JSON format."})
            if not isinstance(data['grades'], list):
                raise serializers.ValidationError({"grades": "Must be a list."})
        
        if 'genders' in data:
            if isinstance(data['genders'], str):
                try:
                    data['genders'] = json.loads(data['genders'])
                except (json.JSONDecodeError, ValueError):
                    raise serializers.ValidationError({"genders": "Invalid JSON format."})
            if not isinstance(data['genders'], list):
                raise serializers.ValidationError({"genders": "Must be a list."})
        
        return data

    def get_membership_status(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        
        # Check if user has a membership
        # Optimization: In a real production app, you'd want to prefetch this in the view
        membership = obj.memberships.filter(user=request.user).first()
        if membership:
            return membership.status  # 'PENDING', 'APPROVED', etc.
        return None

    def get_eligibility(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'role'):
            return {"is_eligible": False, "reasons": ["Not authenticated"]}
            
        user = request.user
        reasons = []

        # 0. Check basic role (Youth only)
        if obj.target_member_type == 'YOUTH' and user.role != 'YOUTH_MEMBER':
             reasons.append("Only for youth members")
        elif obj.target_member_type == 'GUARDIAN' and user.role != 'GUARDIAN':
             reasons.append("Only for guardians")

        # 1. Check Age
        if user.date_of_birth:
            today = date.today()
            age = today.year - user.date_of_birth.year - ((today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day))
            
            if obj.min_age and age < obj.min_age:
                reasons.append(f"Minimum age is {obj.min_age} (You are {age})")
            if obj.max_age and age > obj.max_age:
                reasons.append(f"Maximum age is {obj.max_age} (You are {age})")

        # 2. Check Grade
        if obj.grades and len(obj.grades) > 0:
            if user.grade not in obj.grades:
                reasons.append(f"Open to grades: {', '.join(map(str, obj.grades))}")

        # 3. Check Gender
        if obj.genders and len(obj.genders) > 0:
            if user.legal_gender not in obj.genders:
                reasons.append(f"Restricted to specific genders")

        # 4. Check Interests (If group has interests, user must match at least one)
        if obj.interests.exists():
            group_interest_ids = set(obj.interests.values_list('id', flat=True))
            user_interest_ids = set(user.interests.values_list('id', flat=True))
            
            if not group_interest_ids.intersection(user_interest_ids):
                reasons.append("Does not match your interests")

        return {
            "is_eligible": len(reasons) == 0,
            "reasons": reasons
        }