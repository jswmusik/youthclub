from rest_framework import serializers
from .models import User, GuardianYouthLink
from django.http import QueryDict
from django.db import transaction
from django.utils.crypto import get_random_string
from organization.models import Club
from custom_fields.models import CustomFieldDefinition, CustomFieldValue
import re

class CustomUserSerializer(serializers.ModelSerializer):
    """
    Standard serializer for reading user data.
    """
    guardians = serializers.SerializerMethodField()
    # Add youth_members for Guardians viewing their profile
    youth_members = serializers.SerializerMethodField()
    custom_field_values = serializers.SerializerMethodField()

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
            'verification_status', 'guardians', 'youth_members', 'custom_field_values'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']

    def get_guardians(self, obj):
        # If obj is a Youth, return their guardians
        return list(obj.guardian_links.values_list('guardian_id', flat=True))

    def get_youth_members(self, obj):
        # If obj is a Guardian, return their youth
        return list(obj.youth_links.values_list('youth_id', flat=True))

    def get_custom_field_values(self, obj):
        # Return custom field values as a list of {field: field_id, value: value}
        from custom_fields.models import CustomFieldValue
        values = CustomFieldValue.objects.filter(user=obj).select_related('field')
        return [
            {'field': cfv.field.id, 'value': cfv.value}
            for cfv in values
        ]


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


class YouthRegistrationSerializer(serializers.ModelSerializer):
    """
    Handles public registration for Youth Members.
    Includes logic for 'Shadow Guardians'.
    """
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    
    # Guardian Fields (Optional in serializer, validated based on club rules)
    guardian_email = serializers.EmailField(required=False, write_only=True)
    guardian_first_name = serializers.CharField(required=False, write_only=True)
    guardian_last_name = serializers.CharField(required=False, write_only=True)
    guardian_phone = serializers.CharField(required=False, write_only=True)
    # NEW: Guardian Gender
    guardian_legal_gender = serializers.ChoiceField(choices=User.Gender.choices, required=False, write_only=True)
    
    # Selection
    preferred_club_id = serializers.IntegerField(write_only=True)
    
    # Interests (ManyToMany) - will be handled in create method
    interests = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        allow_empty=True
    )

    # NEW: Custom Fields (Dict of {field_id: value})
    custom_fields = serializers.DictField(required=False, write_only=True)
    guardian_custom_fields = serializers.DictField(required=False, write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'nickname',
            'date_of_birth', 'legal_gender', 'preferred_gender',
            'grade', 'preferred_club_id',
            'guardian_email', 'guardian_first_name', 'guardian_last_name', 'guardian_phone', 'guardian_legal_gender',
            'interests', 'custom_fields', 'guardian_custom_fields'
        ]

    def validate(self, attrs):
        # 1. Password Check
        password = attrs.get('password')
        confirm = attrs.get('password_confirm')

        if password != confirm:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        
        # Complexity Checks
        if len(password) < 8:
            raise serializers.ValidationError({"password": "Password must be at least 8 characters long."})
        if not re.search(r'\d', password):
            raise serializers.ValidationError({"password": "Password must contain at least one number."})
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise serializers.ValidationError({"password": "Password must contain at least one special character."})
        
        # Clean up empty strings - convert to None for optional fields
        for field in ['nickname', 'preferred_gender', 'date_of_birth', 'grade']:
            if field in attrs and attrs[field] == '':
                attrs[field] = None
        
        # Handle grade - convert to None if invalid
        if 'grade' in attrs:
            try:
                if attrs['grade'] is not None:
                    attrs['grade'] = int(attrs['grade'])
            except (ValueError, TypeError):
                attrs['grade'] = None
            
        # 2. Club Validation
        try:
            club = Club.objects.get(id=attrs['preferred_club_id'])
        except Club.DoesNotExist:
            raise serializers.ValidationError({"preferred_club_id": "Invalid Club ID."})
            
        # Check if registration is allowed
        if not club.is_registration_allowed:
            raise serializers.ValidationError({"preferred_club_id": "This club does not accept online registrations."})
            
        # 3. Guardian Requirement Check
        if club.should_require_guardian:
            if not attrs.get('guardian_email'):
                raise serializers.ValidationError({"guardian_email": "This club requires a guardian to register."})
                
        attrs['preferred_club'] = club
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        # Pop non-model fields
        email = validated_data.pop('email')
        password = validated_data.pop('password')
        validated_data.pop('password_confirm')
        club = validated_data.pop('preferred_club')
        validated_data.pop('preferred_club_id')
        
        # Pop interests (ManyToMany field - set after creation)
        interests = validated_data.pop('interests', [])
        
        # Pop Custom Fields
        youth_cf_data = validated_data.pop('custom_fields', {})
        guardian_cf_data = validated_data.pop('guardian_custom_fields', {})
        
        # Pop Guardian Data
        g_email = validated_data.pop('guardian_email', None)
        g_first = validated_data.pop('guardian_first_name', '')
        g_last = validated_data.pop('guardian_last_name', '')
        g_phone = validated_data.pop('guardian_phone', '')
        g_gender = validated_data.pop('guardian_legal_gender', 'MALE')  # Default fallback

        # 1. Create Youth User
        user = User.objects.create_user(
            email=email,
            password=password,
            role=User.Role.YOUTH_MEMBER,
            verification_status=User.VerificationStatus.UNVERIFIED,
            preferred_club=club,
            **validated_data
        )
        
        # Set interests if provided
        if interests:
            user.interests.set(interests)

        # 1b. Save Youth Custom Fields
        self._save_custom_fields(user, youth_cf_data)

        # 2. Handle Guardian Logic
        if g_email:
            g_email = g_email.lower().strip()
            # Check if guardian exists
            guardian_user = User.objects.filter(email=g_email).first()
            
            if not guardian_user:
                # CREATE SHADOW GUARDIAN
                # We create an inactive user with a random unusable password
                random_password = get_random_string(50)  # Generate a random password
                guardian_user = User.objects.create_user(
                    email=g_email,
                    password=random_password,
                    first_name=g_first,
                    last_name=g_last,
                    phone_number=g_phone,
                    legal_gender=g_gender,  # Save Gender
                    role=User.Role.GUARDIAN,
                    is_active=False, # Inactive until they claim account
                    verification_status=User.VerificationStatus.UNVERIFIED
                )
                # Save Guardian Custom Fields (Only for new shadow users)
                self._save_custom_fields(guardian_user, guardian_cf_data)
            
            # Create Link (Pending by default)
            GuardianYouthLink.objects.create(
                youth=user,
                guardian=guardian_user,
                relationship_type='GUARDIAN', # Can be updated later
                status='PENDING',
                is_primary_guardian=True
            )

        return user

    def _save_custom_fields(self, user, data_dict):
        """Helper to save custom field values"""
        if not data_dict:
            return
        for field_id, value in data_dict.items():
            try:
                field = CustomFieldDefinition.objects.get(id=int(field_id))
                CustomFieldValue.objects.update_or_create(
                    user=user,
                    field=field,
                    defaults={'value': value}
                )
            except (CustomFieldDefinition.DoesNotExist, ValueError):
                continue
