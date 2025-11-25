from rest_framework import serializers
from .models import User, GuardianYouthLink
from django.http import QueryDict

class CustomUserSerializer(serializers.ModelSerializer):
    """
    Standard serializer for reading user data.
    """
    guardians = serializers.SerializerMethodField()
    # Add youth_members for Guardians viewing their profile
    youth_members = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 
            'role', 'phone_number', 'profession', 
            'assigned_municipality', 'assigned_club',
            'grade', 'preferred_club', 'nickname',
            'legal_gender', 'preferred_gender', 'date_of_birth',
            'avatar', 'preferred_language', 'is_active',
            'date_joined', 'last_login', 'hide_contact_info', 'interests',
            'verification_status', 'guardians', 'youth_members'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']

    def get_guardians(self, obj):
        # If obj is a Youth, return their guardians
        return list(obj.guardian_links.values_list('guardian_id', flat=True))

    def get_youth_members(self, obj):
        # If obj is a Guardian, return their youth
        return list(obj.youth_links.values_list('youth_id', flat=True))


class UserManagementSerializer(serializers.ModelSerializer):
    """
    Used by Super Admins to create AND update users.
    """
    password = serializers.CharField(write_only=True, required=False)
    
    # For Youth: List of Guardian IDs
    guardians = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    
    # For Guardians: List of Youth IDs (New)
    youth_members = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'password', 'first_name', 'last_name',
            'role', 'phone_number', 'profession',
            'assigned_municipality', 'assigned_club',
            'grade', 'preferred_club', 'interests',
            'nickname', 'legal_gender', 'preferred_gender',
            'date_of_birth', 'hide_contact_info', 'avatar',
            'verification_status', 'guardians', 'youth_members',
            'preferred_language'
        ]

    def _filter_youth_ids_by_scope(self, youth_ids):
        if not youth_ids:
            return youth_ids
        request = self.context.get('request')
        if not request:
            return youth_ids

        requester = request.user
        if getattr(requester, 'role', None) == 'MUNICIPALITY_ADMIN' and requester.assigned_municipality:
            allowed_ids = set(
                User.objects.filter(
                    role='YOUTH_MEMBER',
                    preferred_club__municipality=requester.assigned_municipality
                ).values_list('id', flat=True)
            )
            return [yid for yid in youth_ids if yid in allowed_ids]
        elif getattr(requester, 'role', None) == 'CLUB_ADMIN' and requester.assigned_club:
            allowed_ids = set(
                User.objects.filter(
                    role='YOUTH_MEMBER',
                    preferred_club=requester.assigned_club
                ).values_list('id', flat=True)
            )
            return [yid for yid in youth_ids if yid in allowed_ids]
        return youth_ids

    def create(self, validated_data):
        password = validated_data.pop('password')
        email = validated_data.pop('email')
        interests = validated_data.pop('interests', [])
        guardian_ids = validated_data.pop('guardians', [])
        youth_ids = validated_data.pop('youth_members', [])

        youth_ids = self._filter_youth_ids_by_scope(youth_ids)
        
        user = User.objects.create_user(email, password=password, **validated_data)
        
        if interests:
            user.interests.set(interests)
            
        # Case 1: Creating a Youth (Link to Guardians)
        if guardian_ids:
            for gid in guardian_ids:
                GuardianYouthLink.objects.create(
                    youth=user, guardian_id=gid, relationship_type='GUARDIAN', status='ACTIVE'
                )

        # Case 2: Creating a Guardian (Link to Youth)
        if youth_ids:
            for yid in youth_ids:
                GuardianYouthLink.objects.create(
                    guardian=user, youth_id=yid, relationship_type='GUARDIAN', status='ACTIVE'
                )
            
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        interests = validated_data.pop('interests', None)
        guardian_ids = validated_data.pop('guardians', None)
        youth_ids = validated_data.pop('youth_members', None)
        
        # --- Handle Data Extraction from FormData (QueryDict) ---
        if hasattr(self, 'initial_data'):
            request_data = self.initial_data
            if isinstance(request_data, QueryDict):
                # Handle Interests
                if interests is None:
                    raw = request_data.getlist('interests')
                    if raw: interests = [int(i) for i in raw if i.strip()]
                
                # Handle Guardians
                if guardian_ids is None:
                    raw = request_data.getlist('guardians')
                    if raw: guardian_ids = [int(i) for i in raw if i.strip()]

                # Handle Youth Members (New)
                if youth_ids is None:
                    raw = request_data.getlist('youth_members')
                    if raw: youth_ids = [int(i) for i in raw if i.strip()]

        youth_ids = self._filter_youth_ids_by_scope(youth_ids)

        if password:
            instance.set_password(password)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        if interests is not None:
            instance.interests.set(interests)
            
        # Sync Guardians (If User is Youth)
        if guardian_ids is not None:
            instance.guardian_links.all().delete()
            for gid in guardian_ids:
                GuardianYouthLink.objects.create(
                    youth=instance, guardian_id=gid, relationship_type='GUARDIAN', status='ACTIVE'
                )

        # Sync Youth (If User is Guardian)
        if youth_ids is not None:
            instance.youth_links.all().delete()
            for yid in youth_ids:
                GuardianYouthLink.objects.create(
                    guardian=instance, youth_id=yid, relationship_type='GUARDIAN', status='ACTIVE'
                )
            
        return instance
