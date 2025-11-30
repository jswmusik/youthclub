from rest_framework import serializers
from django.db.models import Max, Count, Exists, OuterRef
from .models import Post, PostImage, PostComment, PostReaction
from users.serializers import CustomUserSerializer # To show author details
from organization.serializers import MunicipalitySerializer, ClubSerializer # Import these for display
from organization.models import Municipality, Club
import json

class PostImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostImage
        fields = ['id', 'image', 'order']

class PostCommentSerializer(serializers.ModelSerializer):
    author = CustomUserSerializer(read_only=True)
    
    class Meta:
        model = PostComment
        fields = ['id', 'post', 'author', 'content', 'parent', 'is_approved', 'created_at']
        read_only_fields = ['author']
    
    def validate_is_approved(self, value):
        """Only allow admins to change is_approved status."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            # Allow super admins, municipality admins, and club admins to approve comments
            if user.role in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
                return value
            # Regular users cannot change approval status
            if self.instance and self.instance.is_approved != value:
                raise serializers.ValidationError("You don't have permission to change comment approval status.")
        return value

class PostSerializer(serializers.ModelSerializer):
    images = PostImageSerializer(many=True, read_only=True)
    author = CustomUserSerializer(read_only=True)
    
    # Organization info (for display instead of author)
    organization_name = serializers.SerializerMethodField()
    organization_avatar = serializers.SerializerMethodField()
    
    # Read-only details for the UI
    target_municipalities_details = MunicipalitySerializer(source='target_municipalities', many=True, read_only=True)
    target_clubs_details = ClubSerializer(source='target_clubs', many=True, read_only=True)
    
    # Write-only fields for ManyToMany
    target_municipalities = serializers.PrimaryKeyRelatedField(
        many=True, read_only=False, queryset=Municipality.objects.all(), required=False
    )
    target_clubs = serializers.PrimaryKeyRelatedField(
        many=True, read_only=False, queryset=Club.objects.all(), required=False
    )
    
    # We will accept uploaded files as a list during creation
    uploaded_images = serializers.ListField(
        child=serializers.FileField(max_length=100000, allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )
    
    # Accept list of image IDs to delete during update
    images_to_delete = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    comment_count = serializers.IntegerField(read_only=True)
    reaction_count = serializers.SerializerMethodField()
    user_has_reacted = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()
    reaction_breakdown = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = '__all__'
        read_only_fields = [
            'author', 'owner_role', 'municipality', 'club', 'view_count', 'comment_count',
            'target_municipalities_details', 'target_clubs_details', 'reaction_count', 
            'user_has_reacted', 'user_reaction', 'reaction_breakdown', 
            'organization_name', 'organization_avatar'
        ]
    
    def get_organization_name(self, obj):
        """Get the organization name based on owner_role."""
        if obj.owner_role == Post.OwnerRole.SUPER_ADMIN:
            return "Ungdomsappen"
        elif obj.owner_role == Post.OwnerRole.MUNICIPALITY_ADMIN and obj.municipality:
            return obj.municipality.name
        elif obj.owner_role == Post.OwnerRole.CLUB_ADMIN and obj.club:
            return obj.club.name
        # Fallback to author name if no organization
        if obj.author:
            return f"{obj.author.first_name} {obj.author.last_name}"
        return "Unknown"
    
    def get_organization_avatar(self, obj):
        """Get the organization avatar based on owner_role."""
        if obj.owner_role == Post.OwnerRole.SUPER_ADMIN:
            # Return site logo/avatar (you can set this in settings or use a default)
            return None  # Or return a default site avatar URL
        elif obj.owner_role == Post.OwnerRole.MUNICIPALITY_ADMIN and obj.municipality:
            if obj.municipality.avatar:
                return obj.municipality.avatar.url
            return None
        elif obj.owner_role == Post.OwnerRole.CLUB_ADMIN and obj.club:
            if obj.club.avatar:
                return obj.club.avatar.url
            return None
        # Fallback to author avatar
        if obj.author and obj.author.avatar:
            return obj.author.avatar.url
        return None
    
    def get_reaction_count(self, obj):
        """Get the total number of reactions for this post."""
        if hasattr(obj, 'reaction_count'):
            return obj.reaction_count
        return obj.reactions.count()
    
    def get_user_has_reacted(self, obj):
        """Check if the current user has reacted to this post."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if hasattr(obj, 'user_has_reacted'):
                return obj.user_has_reacted
            return obj.reactions.filter(user=request.user).exists()
        return False
    
    def get_user_reaction(self, obj):
        """Get the current user's reaction type."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                reaction = obj.reactions.get(user=request.user)
                return reaction.reaction_type
            except PostReaction.DoesNotExist:
                return None
        return None
    
    def get_reaction_breakdown(self, obj):
        """Get breakdown of reactions by type."""
        from django.db.models import Count
        breakdown = obj.reactions.values('reaction_type').annotate(count=Count('id'))
        return {item['reaction_type']: item['count'] for item in breakdown}
    
    def validate(self, data):
        """
        Validate that JSON fields are lists/dicts.
        Handle both JSON strings (from FormData) and native types (from JSON API).
        Also handle boolean strings from FormData.
        """
        # Handle boolean strings from FormData
        boolean_fields = ['is_pinned', 'allow_comments', 'require_moderation', 'allow_replies', 'send_push_notification', 'is_global']
        for field in boolean_fields:
            if field in data and isinstance(data[field], str):
                data[field] = data[field].lower() == 'true'
        
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
        
        if 'target_custom_fields' in data:
            if isinstance(data['target_custom_fields'], str):
                try:
                    data['target_custom_fields'] = json.loads(data['target_custom_fields'])
                except (json.JSONDecodeError, ValueError):
                    raise serializers.ValidationError({"target_custom_fields": "Invalid JSON format."})
            if not isinstance(data['target_custom_fields'], dict):
                raise serializers.ValidationError({"target_custom_fields": "Must be a dictionary."})
        
        return data

    def create(self, validated_data):
        # Extract ManyToMany fields (they can't be set during create)
        # DRF automatically parses multiple FormData values into lists for ManyToMany fields
        target_groups = validated_data.pop('target_groups', [])
        target_interests = validated_data.pop('target_interests', [])
        t_munis = validated_data.pop('target_municipalities', [])
        t_clubs = validated_data.pop('target_clubs', [])
        uploaded_images = validated_data.pop('uploaded_images', [])
        
        # Ensure they're lists (in case DRF didn't parse them correctly)
        if not isinstance(target_groups, list):
            target_groups = [target_groups] if target_groups else []
        if not isinstance(target_interests, list):
            target_interests = [target_interests] if target_interests else []
        if not isinstance(t_munis, list):
            t_munis = [t_munis] if t_munis else []
        if not isinstance(t_clubs, list):
            t_clubs = [t_clubs] if t_clubs else []
        
        # For club admins: automatically add their club to target_clubs if not specified
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.role == 'CLUB_ADMIN' and user.assigned_club:
            # If no clubs specified, automatically add the club admin's club
            if not t_clubs:
                t_clubs = [user.assigned_club.id]
            # Ensure the club admin's club is always included (even if they somehow specified others)
            elif user.assigned_club.id not in t_clubs:
                t_clubs.append(user.assigned_club.id)
        
        # Create the post
        post = Post.objects.create(**validated_data)

        # Set ManyToMany relationships (even if empty, to clear any defaults)
        post.target_groups.set(target_groups)
        post.target_interests.set(target_interests)
        post.target_municipalities.set(t_munis)
        post.target_clubs.set(t_clubs)

        # Handle Image Uploads
        for index, image in enumerate(uploaded_images):
            PostImage.objects.create(post=post, image=image, order=index)

        return post

    def update(self, instance, validated_data):
        # Extract ManyToMany fields
        target_groups = validated_data.pop('target_groups', None)
        target_interests = validated_data.pop('target_interests', None)
        t_munis = validated_data.pop('target_municipalities', None)
        t_clubs = validated_data.pop('target_clubs', None)
        uploaded_images = validated_data.pop('uploaded_images', [])
        images_to_delete = validated_data.pop('images_to_delete', [])
        
        # Ensure they're lists if provided
        if target_groups is not None and not isinstance(target_groups, list):
            target_groups = [target_groups] if target_groups else []
        if target_interests is not None and not isinstance(target_interests, list):
            target_interests = [target_interests] if target_interests else []
        if t_munis is not None and not isinstance(t_munis, list):
            t_munis = [t_munis] if t_munis else []
        if t_clubs is not None and not isinstance(t_clubs, list):
            t_clubs = [t_clubs] if t_clubs else []
        
        # Handle image deletion first
        if images_to_delete:
            if isinstance(images_to_delete, str):
                try:
                    images_to_delete = json.loads(images_to_delete)
                except (json.JSONDecodeError, ValueError):
                    images_to_delete = []
            if isinstance(images_to_delete, list):
                instance.images.filter(id__in=images_to_delete).delete()
        
        # Update standard fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update ManyToMany relationships if provided
        if target_groups is not None:
            instance.target_groups.set(target_groups)
        if target_interests is not None:
            instance.target_interests.set(target_interests)
        if t_munis is not None:
            instance.target_municipalities.set(t_munis)
        if t_clubs is not None:
            instance.target_clubs.set(t_clubs)
        
        # Handle new image uploads
        if uploaded_images:
            # Get current max order
            current_max_order = instance.images.aggregate(max_order=Max('order'))['max_order'] or -1
            for index, image in enumerate(uploaded_images):
                PostImage.objects.create(post=instance, image=image, order=current_max_order + 1 + index)
        
        return instance