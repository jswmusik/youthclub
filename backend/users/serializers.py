from rest_framework import serializers
from .models import User, GuardianYouthLink, IdDocumentUpload
from .trial_service import get_user_trial_info
from django.http import QueryDict
from django.db import transaction
from django.utils.crypto import get_random_string
from organization.models import Club, Interest
from organization.serializers import InterestSerializer, ClubSerializer, MunicipalitySerializer
from custom_fields.models import CustomFieldDefinition, CustomFieldValue
from groups.models import GroupMembership
from rewards.models import RewardUsage
import re


class GuardianYouthLinkSerializer(serializers.ModelSerializer):
    """
    Serializer for GuardianYouthLink objects.
    Includes guardian details for display.
    """
    guardian_email = serializers.EmailField(source='guardian.email', read_only=True)
    guardian_first_name = serializers.CharField(source='guardian.first_name', read_only=True)
    guardian_last_name = serializers.CharField(source='guardian.last_name', read_only=True)
    guardian_avatar = serializers.SerializerMethodField()
    guardian_phone = serializers.CharField(source='guardian.phone_number', read_only=True)
    # Youth details (for admin views and guardian children tab)
    youth = serializers.IntegerField(source='youth.id', read_only=True)
    youth_id = serializers.IntegerField(source='youth.id', read_only=True)
    youth_email = serializers.EmailField(source='youth.email', read_only=True)
    youth_first_name = serializers.CharField(source='youth.first_name', read_only=True)
    youth_last_name = serializers.CharField(source='youth.last_name', read_only=True)
    youth_grade = serializers.IntegerField(source='youth.grade', read_only=True, allow_null=True)
    youth_avatar = serializers.SerializerMethodField()
    youth_background_image = serializers.SerializerMethodField()
    
    class Meta:
        model = GuardianYouthLink
        fields = [
            'id', 'guardian', 'guardian_email', 'guardian_first_name', 
            'guardian_last_name', 'guardian_avatar', 'guardian_phone',
            'youth', 'youth_id', 'youth_email', 'youth_first_name', 'youth_last_name', 
            'youth_grade', 'youth_avatar', 'youth_background_image',
            'relationship_type', 'is_primary_guardian', 'status',
            'created_at', 'verified_at'
        ]
        read_only_fields = ['id', 'created_at', 'verified_at']
    
    def get_guardian_avatar(self, obj):
        if obj.guardian.avatar:
            return obj.guardian.avatar.url
        return None
    
    def get_youth_avatar(self, obj):
        if obj.youth.avatar:
            return obj.youth.avatar.url
        return None
    
    def get_youth_background_image(self, obj):
        if obj.youth.background_image:
            return obj.youth.background_image.url
        return None


class GuardianLinkCreateSerializer(serializers.Serializer):
    """
    Serializer for creating a new guardian link.
    Handles the "search vs. create" logic.
    """
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    relationship_type = serializers.ChoiceField(
        choices=GuardianYouthLink.RELATIONSHIP_CHOICES,
        default='GUARDIAN'
    )
    is_primary_guardian = serializers.BooleanField(default=False)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=50)
    legal_gender = serializers.ChoiceField(
        choices=User.Gender.choices,
        required=False,
        allow_blank=True
    )

class UserListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing users (e.g., in visit sessions).
    Includes only essential fields for display.
    """
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'nickname', 'avatar_url', 'grade', 'legal_gender', 'role']
        read_only_fields = ['id', 'email', 'first_name', 'last_name', 'nickname', 'avatar_url', 'grade', 'legal_gender', 'role']
    
    def get_avatar_url(self, obj):
        if obj.avatar:
            return obj.avatar.url
        return None

class CustomUserSerializer(serializers.ModelSerializer):
    """
    Standard serializer for reading user data.
    """
    guardians = serializers.SerializerMethodField()
    # Add youth_members for Guardians viewing their profile
    youth_members = serializers.SerializerMethodField()
    custom_field_values = serializers.SerializerMethodField()
    interests = InterestSerializer(many=True, read_only=True)
    # Writable field for interests (accepts list of IDs)
    interests_ids = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Interest.objects.all(), 
        source='interests',
        required=False,
        write_only=True
    )
    my_memberships = serializers.SerializerMethodField()
    my_rewards = serializers.SerializerMethodField()
    preferred_club = ClubSerializer(read_only=True)
    # This sends the full club objects, not just IDs, so we can show them in the profile
    followed_clubs = ClubSerializer(many=True, read_only=True)
    followed_clubs_ids = serializers.SerializerMethodField()
    # Serialize assigned_municipality as full object for Guardian profile
    assigned_municipality = MunicipalitySerializer(read_only=True)
    
    # --- LICENSING FIELD ---
    allowed_features = serializers.SerializerMethodField()
    
    # --- TRIAL PERIOD INFO ---
    trial_info = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 
            'role', 'phone_number', 'profession', 
            'assigned_municipality', 'assigned_club',
            'grade', 'preferred_club', 'nickname',
            'legal_gender', 'preferred_gender', 'date_of_birth',
            'avatar', 'preferred_language', 'is_active',
            'date_joined', 'last_login', 'hide_contact_info', 'interests', 'interests_ids',
            'verification_status', 'guardians', 'youth_members', 'custom_field_values',
            # --- NEW FIELDS ---
            'background_image', 
            'mood_status',
            'my_memberships',
            'my_rewards',
            'notification_email_enabled',
            'followed_clubs',
            'followed_clubs_ids',
            # --- LICENSING ---
            'allowed_features',
            # --- ID DOCUMENT VERIFICATION ---
            'id_document',
            'id_document_type',
            'id_document_uploaded_at',
            'id_document_review_status',
            'id_document_reviewed_at',
            'id_document_rejection_reason',
            # --- TRIAL PERIOD ---
            'trial_info',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']

    def get_allowed_features(self, obj):
        """
        Determines what features this user can access based on their
        associated municipality's license.
        """
        municipality = None

        # 1. If Admin/Staff, use assigned municipality
        if obj.assigned_municipality:
            municipality = obj.assigned_municipality
        elif obj.assigned_club and obj.assigned_club.municipality:
            municipality = obj.assigned_club.municipality
            
        # 2. If Youth, use preferred club's municipality
        elif obj.role == 'YOUTH_MEMBER' and obj.preferred_club:
            municipality = obj.preferred_club.municipality
            
        # 3. If Guardian (Edge case: Guardians might not belong to one muni)
        # For now, we return empty or check their first youth child's muni if critical.
        # But generally, Guardians access features via the context of the child they are viewing.
        # However, for the main sidebar "Messages", we might check the first linked youth.
        elif obj.role == 'GUARDIAN':
            first_link = obj.youth_links.first()
            if first_link and first_link.youth.preferred_club:
                municipality = first_link.youth.preferred_club.municipality

        if municipality and hasattr(municipality, 'license') and municipality.license.is_active:
            return list(municipality.license.get_active_features_slugs())
        
        return []

    def get_trial_info(self, obj):
        """
        Returns trial period information for youth members.
        This is used by the frontend to determine if the user can access the platform.
        """
        # Only include trial info for youth members
        if obj.role == 'YOUTH_MEMBER':
            return get_user_trial_info(obj)
        return None

    def get_followed_clubs_ids(self, obj):
        return list(obj.followed_clubs.values_list('id', flat=True))

    def get_guardians(self, obj):
        # If obj is a Youth, return their guardians with full details
        guardian_links = obj.guardian_links.select_related('guardian').all()
        return [
            {
                'id': link.guardian.id,
                'first_name': link.guardian.first_name,
                'last_name': link.guardian.last_name,
                'email': link.guardian.email,
                'avatar': link.guardian.avatar.url if link.guardian.avatar else None,
            }
            for link in guardian_links
        ]

    def get_youth_members(self, obj):
        # If obj is a Guardian, return their youth with relationship details
        # Include preferred_club and followed_clubs for the Guardian dashboard
        youth_links = obj.youth_links.select_related(
            'youth', 
            'youth__preferred_club',
            'youth__preferred_club__municipality'
        ).prefetch_related(
            'youth__followed_clubs',
            'youth__followed_clubs__municipality'
        ).all()
        
        result = []
        for link in youth_links:
            youth = link.youth
            
            # Serialize preferred_club if exists
            preferred_club_data = None
            if youth.preferred_club:
                preferred_club_data = {
                    'id': youth.preferred_club.id,
                    'name': youth.preferred_club.name,
                    'slug': youth.preferred_club.slug,
                    'avatar': youth.preferred_club.avatar.url if youth.preferred_club.avatar else None,
                    'municipality': {
                        'id': youth.preferred_club.municipality.id,
                        'name': youth.preferred_club.municipality.name,
                    } if youth.preferred_club.municipality else None,
                }
            
            # Serialize followed_clubs
            followed_clubs_data = [
                {
                    'id': club.id,
                    'name': club.name,
                    'slug': club.slug,
                    'avatar': club.avatar.url if club.avatar else None,
                    'municipality': {
                        'id': club.municipality.id,
                        'name': club.municipality.name,
                    } if club.municipality else None,
                }
                for club in youth.followed_clubs.all()
            ]
            
            result.append({
                'id': youth.id,
                'first_name': youth.first_name,
                'last_name': youth.last_name,
                'email': youth.email,
                'avatar': youth.avatar.url if youth.avatar else None,
                'preferred_club': preferred_club_data,
                'followed_clubs': followed_clubs_data,
                'relationship_id': link.id,  # ID of the GuardianYouthLink
                'relationship_type': link.relationship_type,
                'status': link.status,
                'is_primary_guardian': link.is_primary_guardian,
                'verified_at': link.verified_at.isoformat() if link.verified_at else None,
                'created_at': link.created_at.isoformat() if link.created_at else None,
            })
        
        return result

    def get_custom_field_values(self, obj):
        # Return custom field values as a list of {field: field_id, value: value}
        from custom_fields.models import CustomFieldValue
        values = CustomFieldValue.objects.filter(user=obj).select_related('field')
        return [
            {'field': cfv.field.id, 'value': cfv.value}
            for cfv in values
        ]

    def get_my_memberships(self, obj):
        """
        Returns a simplified list of groups the user belongs to.
        """
        memberships = GroupMembership.objects.filter(user=obj).select_related('group')
        data = []
        for m in memberships:
            data.append({
                'id': m.id,
                'group_id': m.group.id,
                'group_name': m.group.name,
                'group_avatar': m.group.avatar.url if m.group.avatar else None,
                'status': m.status,   # 'PENDING', 'APPROVED', etc.
                'role': m.role,       # 'MEMBER', 'ADMIN'
                'joined_at': m.joined_at
            })
        return data

    def get_my_rewards(self, obj):
        """
        Returns rewards assigned to the user.
        """
        # Use the reverse relationship for better performance
        # Get all rewards for this user, ordered by 'not redeemed' first, then by date
        try:
            usages = obj.reward_usages.select_related('reward').order_by('is_redeemed', '-created_at')
        except AttributeError:
            # Fallback if reverse relationship doesn't exist
            from rewards.models import RewardUsage
            usages = RewardUsage.objects.filter(user=obj).select_related('reward').order_by('is_redeemed', '-created_at')
        
        data = []
        for u in usages:
            # Safely get image URL
            reward_image = None
            if u.reward and u.reward.image:
                try:
                    reward_image = u.reward.image.url
                except (ValueError, AttributeError):
                    reward_image = None
            
            # Safely get dates (convert to ISO format strings)
            redeemed_at = None
            if u.redeemed_at:
                redeemed_at = u.redeemed_at.isoformat()
            
            created_at = u.created_at.isoformat() if u.created_at else None
            
            expiration_date = None
            if u.reward and u.reward.expiration_date:
                expiration_date = u.reward.expiration_date.isoformat()
            
            data.append({
                'id': u.id,  # RewardUsage ID
                'reward_id': u.reward.id if u.reward else None,  # Reward ID for redemption endpoint
                'reward_name': u.reward.name if u.reward else 'Unknown Reward',
                'reward_image': reward_image,
                'description': u.reward.description if u.reward else '',
                'is_redeemed': u.is_redeemed,
                'redeemed_at': redeemed_at,
                'created_at': created_at,
                'expiration_date': expiration_date,
                'sponsor': u.reward.sponsor_name if u.reward else ''
            })
        return data
    
    def update(self, instance, validated_data):
        """
        Override update to handle interests from FormData (QueryDict).
        """
        # Handle interests from FormData
        interests = validated_data.pop('interests', None)
        
        # If interests is None, try to get it from initial_data (FormData)
        if interests is None and hasattr(self, 'initial_data'):
            request_data = self.initial_data
            if isinstance(request_data, QueryDict):
                raw = request_data.getlist('interests')
                if raw:
                    interests = [int(i) for i in raw if i.strip()]
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        # Update interests if provided
        if interests is not None:
            instance.interests.set(interests)
        
        return instance


class UserManagementSerializer(serializers.ModelSerializer):
    """
    Used by Super Admins to create AND update users.
    """
    password = serializers.CharField(write_only=True, required=False)
    
    # For Youth: List of Guardian IDs
    guardians = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    
    # For Guardians: List of Youth IDs (New)
    youth_members = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    
    # Interests (ManyToMany) - accepts list of IDs
    interests = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Interest.objects.all(),
        required=False,
        write_only=True
    )

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
            'preferred_language',
            # --- NEW FIELDS ADDED HERE FOR ADMINS ---
            'background_image', 
            'mood_status'
        ]
        extra_kwargs = {
            'grade': {'required': False, 'allow_null': True},
            'preferred_club': {'required': False, 'allow_null': True},
            'assigned_club': {'required': False, 'allow_null': True},
            'assigned_municipality': {'required': False, 'allow_null': True},
            'interests': {'required': False},
        }
    
    def validate(self, attrs):
        """
        Clean up fields based on user role.
        """
        role = attrs.get('role') or (self.instance.role if self.instance else None)
        
        # Password validation for creation
        if not self.instance:
            password = attrs.get('password')
            if not password or (isinstance(password, str) and password.strip() == ''):
                raise serializers.ValidationError({'password': 'Password is required when creating a new user.'})
            
            # Password complexity checks (same as YouthRegistrationSerializer)
            if len(password) < 8:
                raise serializers.ValidationError({'password': 'Password must be at least 8 characters long.'})
            if not re.search(r'\d', password):
                raise serializers.ValidationError({'password': 'Password must contain at least one number.'})
            if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
                raise serializers.ValidationError({'password': 'Password must contain at least one special character.'})
        
        # For guardians, remove fields that don't apply
        if role == 'GUARDIAN':
            # Remove youth-specific fields
            attrs.pop('grade', None)
            attrs.pop('preferred_club', None)
            attrs.pop('interests', None)
            # These should already be None, but ensure they are
            if 'assigned_club' in attrs:
                attrs['assigned_club'] = None
            if 'assigned_municipality' in attrs:
                attrs['assigned_municipality'] = None
        
        # Clean up empty strings - convert to None for optional fields that have null=True
        # Fields with blank=True but NOT null=True must remain as empty strings: nickname, mood_status, preferred_gender, profession
        for field in ['phone_number', 'background_image']:
            if field in attrs and attrs[field] == '':
                attrs[field] = None
        
        # Ensure role is set correctly (should already be set, but double-check)
        if self.instance and not attrs.get('role'):
            attrs['role'] = self.instance.role
        
        return attrs

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
        password = validated_data.pop('password', None)
        if not password or (isinstance(password, str) and password.strip() == ''):
            raise serializers.ValidationError({'password': 'Password is required when creating a new user.'})
        email = validated_data.pop('email')
        interests = validated_data.pop('interests', None)
        guardian_ids = validated_data.pop('guardians', None)
        youth_ids = validated_data.pop('youth_members', None)
        
        # --- Handle Data Extraction from FormData (QueryDict) ---
        if hasattr(self, 'initial_data'):
            request_data = self.initial_data
            if isinstance(request_data, QueryDict):
                # Handle Interests - if not parsed by DRF, extract from FormData
                if interests is None:
                    raw = request_data.getlist('interests')
                    if raw:
                        # Convert to Interest objects if they're IDs
                        interest_ids = [int(i) for i in raw if i.strip()]
                        interests = Interest.objects.filter(id__in=interest_ids) if interest_ids else []
                    else:
                        interests = []
                
                # Handle Guardians
                if guardian_ids is None:
                    raw = request_data.getlist('guardians')
                    if raw: guardian_ids = [int(i) for i in raw if i.strip()]
                    else: guardian_ids = []

                # Handle Youth Members
                if youth_ids is None:
                    raw = request_data.getlist('youth_members')
                    if raw: youth_ids = [int(i) for i in raw if i.strip()]
                    else: youth_ids = []
        
        # Ensure lists are initialized
        if interests is None:
            interests = []
        if guardian_ids is None:
            guardian_ids = []
        if youth_ids is None:
            youth_ids = []

        youth_ids = self._filter_youth_ids_by_scope(youth_ids)
        
        user = User.objects.create_user(email, password=password, **validated_data)
        
        # Set interests - PrimaryKeyRelatedField returns Interest objects, FormData handling returns queryset
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

        # Only filter youth_ids if they exist and instance is a guardian
        if youth_ids is not None and instance.role == 'GUARDIAN':
            youth_ids = self._filter_youth_ids_by_scope(youth_ids) if youth_ids else None

        if password:
            instance.set_password(password)
        
        # Only set attributes that are in validated_data and not None (unless explicitly None)
        for attr, value in validated_data.items():
            # Skip fields that shouldn't be set on guardians
            if instance.role == 'GUARDIAN' and attr in ['grade', 'preferred_club', 'assigned_club', 'assigned_municipality']:
                continue
            setattr(instance, attr, value)
        
        instance.save()
        
        if interests is not None and instance.role != 'GUARDIAN':
            instance.interests.set(interests)
            
        # Sync Guardians (If User is Youth)
        if guardian_ids is not None and instance.role == 'YOUTH_MEMBER':
            instance.guardian_links.all().delete()
            for gid in guardian_ids:
                GuardianYouthLink.objects.create(
                    youth=instance, guardian_id=gid, relationship_type='GUARDIAN', status='ACTIVE'
                )

        # Sync Youth (If User is Guardian)
        if youth_ids is not None and instance.role == 'GUARDIAN':
            instance.youth_links.all().delete()
            for yid in youth_ids:
                GuardianYouthLink.objects.create(
                    guardian=instance, youth_id=yid, relationship_type='GUARDIAN', status='ACTIVE'
                )
            
        return instance


class IdDocumentUploadSerializer(serializers.Serializer):
    """
    Serializer for guardians to upload their ID document for verification.
    """
    id_document = serializers.FileField(required=True)
    id_document_type = serializers.ChoiceField(
        choices=User.IdDocumentType.choices,
        required=True
    )


class IdDocumentReviewSerializer(serializers.Serializer):
    """
    Serializer for admins to review (approve/reject/delete) ID documents.
    """
    action = serializers.ChoiceField(choices=['approve', 'reject', 'delete'], required=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs.get('action') == 'reject' and not attrs.get('rejection_reason'):
            raise serializers.ValidationError({
                'rejection_reason': 'Rejection reason is required when rejecting a document.'
            })
        return attrs


class IdDocumentUploadHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for viewing ID document upload history.
    """
    reviewed_by_name = serializers.SerializerMethodField()
    document_url = serializers.SerializerMethodField()

    class Meta:
        model = IdDocumentUpload
        fields = [
            'id', 'document', 'document_url', 'document_type', 'status',
            'uploaded_at', 'reviewed_at', 'reviewed_by', 'reviewed_by_name',
            'rejection_reason', 'admin_notes'
        ]
        read_only_fields = ['id', 'uploaded_at', 'reviewed_at', 'reviewed_by', 'status']

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return f"{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}"
        return None

    def get_document_url(self, obj):
        if obj.document:
            return obj.document.url
        return None


class IdDocumentUploadCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for guardians to upload new ID documents.
    Validates max 3 pending uploads.
    """
    class Meta:
        model = IdDocumentUpload
        fields = ['document', 'document_type']

    def validate(self, attrs):
        guardian = self.context.get('guardian')
        if guardian:
            pending_count = IdDocumentUpload.get_pending_count(guardian)
            if pending_count >= 3:
                raise serializers.ValidationError(
                    "You already have 3 pending verification requests. "
                    "Please wait for them to be reviewed before uploading more."
                )
        return attrs

    def create(self, validated_data):
        guardian = self.context.get('guardian')
        validated_data['guardian'] = guardian
        return super().create(validated_data)


class IdDocumentReviewHistorySerializer(serializers.Serializer):
    """
    Serializer for admins to review documents from the upload history.
    """
    action = serializers.ChoiceField(choices=['approve', 'reject', 'delete'], required=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    admin_notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs.get('action') == 'reject' and not attrs.get('rejection_reason'):
            raise serializers.ValidationError({
                'rejection_reason': 'Rejection reason is required when rejecting a document.'
            })
        return attrs


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
            'first_name', 'last_name', 'nickname', 'phone_number',
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
        # Note: nickname is excluded because the model has blank=True but not null=True
        for field in ['preferred_gender', 'date_of_birth', 'grade']:
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
                # We create an active user with a random unusable password
                # Guardian must be active so they can use password reset to set their password
                random_password = get_random_string(50)  # Generate a random password
                guardian_user = User.objects.create_user(
                    email=g_email,
                    password=random_password,
                    first_name=g_first,
                    last_name=g_last,
                    phone_number=g_phone,
                    legal_gender=g_gender,  # Save Gender
                    role=User.Role.GUARDIAN,
                    is_active=True,  # Active so they can use password reset
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
