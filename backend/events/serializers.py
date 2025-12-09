from rest_framework import serializers
from django.utils.text import slugify
from .models import Event, EventRegistration, EventTicket, EventImage, EventDocument
from users.serializers import UserListSerializer
from organization.serializers import MunicipalitySerializer, ClubSerializer
from organization.models import Municipality, Club
from groups.serializers import GroupSerializer

class EventImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventImage
        fields = ['id', 'image', 'caption', 'order']

class EventDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventDocument
        fields = ['id', 'file', 'title', 'description']

class EventTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventTicket
        fields = ['id', 'ticket_code', 'is_active', 'checked_in_at']
        read_only_fields = ['ticket_code', 'checked_in_at']

class EventRegistrationSerializer(serializers.ModelSerializer):
    ticket = EventTicketSerializer(read_only=True)
    user_detail = UserListSerializer(source='user', read_only=True)
    event_detail = serializers.SerializerMethodField()

    class Meta:
        model = EventRegistration
        fields = ['id', 'event', 'user', 'user_detail', 'status', 'created_at', 'ticket', 'event_detail']
        read_only_fields = ['approved_by', 'approval_date', 'ticket']

    def get_event_detail(self, obj):
        return {
            'id': obj.event.id,
            'title': obj.event.title,
            'start_date': obj.event.start_date,
            'location_name': obj.event.location_name,
        }

class EventSerializer(serializers.ModelSerializer):
    municipality_detail = MunicipalitySerializer(source='municipality', read_only=True)
    club_detail = ClubSerializer(source='club', read_only=True)
    
    # Nested Media
    images = EventImageSerializer(many=True, read_only=True)
    documents = EventDocumentSerializer(many=True, read_only=True)
    
    # Read-only details for target groups
    target_groups_details = GroupSerializer(source='target_groups', many=True, read_only=True)
    
    # Write-only fields for media upload (handled in create/update if needed, or separate endpoints)
    # Typically in React we upload files to separate endpoints or use FormData with nested naming
    # For simplicity, we usually keep them read-only here and manage them via nested ViewSet or separate calls
    
    user_registration_status = serializers.SerializerMethodField()
    is_full = serializers.BooleanField(read_only=True)
    
    # Allow slug to be empty - model's save() will auto-generate it
    slug = serializers.SlugField(required=False, allow_blank=True)
    
    # Make municipality and club optional in serializer - they're auto-assigned in perform_create
    municipality = serializers.PrimaryKeyRelatedField(required=False, allow_null=True, queryset=Municipality.objects.all())
    club = serializers.PrimaryKeyRelatedField(required=False, allow_null=True, queryset=Club.objects.all())
    
    def validate_club(self, value):
        # Handle empty string from FormData - convert to None to clear the club
        if value == '' or (isinstance(value, str) and value.strip() == ''):
            return None
        return value

    class Meta:
        model = Event
        fields = '__all__'
        read_only_fields = ['confirmed_participants_count', 'waitlist_count']

    def get_user_registration_status(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            reg = obj.registrations.filter(user=user).first()
            return reg.status if reg else None
        return None

    def validate_slug(self, value):
        # Convert empty strings and None to None so they're treated as missing
        # The create/update methods will generate the slug
        if value == '' or value is None:
            return None
        return value
    
    def to_internal_value(self, data):
        # Handle empty string for club field (to clear it) - FormData sends empty strings
        # PrimaryKeyRelatedField will fail on empty strings, so convert to None before validation
        from django.http import QueryDict
        import json
        import ast
        
        # Create a new dict to avoid pickle issues with file objects
        # Don't use copy() on QueryDict with files - it tries to deepcopy file objects
        if isinstance(data, QueryDict):
            # Build a new dict, handling file objects carefully
            processed_data = {}
            for key in data.keys():
                # Get list of values for this key
                value_list = data.getlist(key)
                if len(value_list) > 0:
                    # For file fields, keep the file object directly (don't try to copy)
                    if key in ['cover_image', 'og_image', 'twitter_image']:
                        # File fields - take the first file object
                        processed_data[key] = value_list[0] if value_list else None
                    else:
                        # Non-file fields - store as list or single value
                        processed_data[key] = value_list if len(value_list) > 1 else value_list[0]
            data = processed_data
        elif hasattr(data, '_mutable') and not data._mutable:
            # For immutable QueryDict, create a new dict
            processed_data = {}
            for key in data.keys():
                value_list = data.getlist(key) if hasattr(data, 'getlist') else [data.get(key)]
                if len(value_list) > 0:
                    if key in ['cover_image', 'og_image', 'twitter_image']:
                        processed_data[key] = value_list[0] if value_list else None
                    else:
                        processed_data[key] = value_list if len(value_list) > 1 else value_list[0]
            data = processed_data
        elif isinstance(data, dict):
            data = dict(data)
        
        if isinstance(data, dict):
            # Fields that should be arrays (ManyToMany or JSON fields)
            array_fields = ['target_groups', 'target_interests', 'target_genders', 'target_grades']
            json_fields = ['target_genders', 'target_grades']
            
            for key in list(data.keys()):
                # Get value - could be a list or single value
                value = data.get(key)
                
                # Skip if value is None or empty
                if value is None or value == '':
                    continue
                
                # Handle JSON fields (target_genders, target_grades)
                if key in json_fields:
                    # If it's a list (from FormData multiple entries), convert to proper array
                    if isinstance(value, list):
                        # Filter out empty strings and convert to proper types
                        filtered = [v for v in value if v and str(v).strip()]
                        if filtered:
                            # For target_grades, convert strings to integers
                            if key == 'target_grades':
                                try:
                                    data[key] = [int(v) for v in filtered]
                                except (ValueError, TypeError):
                                    data[key] = filtered
                            else:
                                data[key] = filtered
                        else:
                            data[key] = []
                    # If it's a string that looks like JSON, parse it
                    elif isinstance(value, str) and value.strip().startswith('[') and value.strip().endswith(']'):
                        try:
                            parsed = json.loads(value.strip())
                            if isinstance(parsed, list):
                                # For target_grades, convert strings to integers
                                if key == 'target_grades':
                                    try:
                                        data[key] = [int(v) for v in parsed if v]
                                    except (ValueError, TypeError):
                                        data[key] = parsed
                                else:
                                    data[key] = parsed
                            else:
                                data[key] = []
                        except (json.JSONDecodeError, ValueError):
                            # If JSON parsing fails, try as single value
                            if key == 'target_grades':
                                try:
                                    data[key] = [int(value)]
                                except (ValueError, TypeError):
                                    data[key] = [value]
                            else:
                                data[key] = [value]
                    # If it's a single value, convert to list
                    else:
                        if key == 'target_grades':
                            try:
                                data[key] = [int(value)]
                            except (ValueError, TypeError):
                                data[key] = [value]
                        else:
                            data[key] = [value]
                    continue
                
                # Skip other array fields - they're handled by DRF's ManyToMany handling
                if key in array_fields:
                    continue
                
                # Handle lists (from QueryDict when FormData sends multiple values)
                if isinstance(value, list):
                    if len(value) == 1:
                        # Extract single value from list
                        data[key] = value[0]
                    elif len(value) > 1:
                        # Multiple values for non-array field - take first
                        data[key] = value[0]
                    continue
                
                # Check if value is a string that looks like an array representation
                # FormData converts arrays to strings like "['SCHEDULED']" (Python-style) or '["SCHEDULED"]' (JSON-style)
                if isinstance(value, str) and value.strip().startswith('[') and value.strip().endswith(']'):
                    value_stripped = value.strip()
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Detected stringified array for field '{key}': {value_stripped}")
                    
                    try:
                        # Try using ast.literal_eval first (handles Python-style like "['SCHEDULED']")
                        parsed = ast.literal_eval(value_stripped)
                        if isinstance(parsed, list) and len(parsed) == 1:
                            # Extract single value from array
                            logger.info(f"Extracted '{parsed[0]}' from stringified array for field '{key}'")
                            data[key] = parsed[0]
                            continue
                        elif isinstance(parsed, list) and len(parsed) > 1:
                            logger.warning(f"Multiple values in stringified array for '{key}', taking first: {parsed[0]}")
                            data[key] = parsed[0]
                            continue
                    except (ValueError, SyntaxError) as e:
                        logger.warning(f"ast.literal_eval failed for '{key}': {e}, trying JSON")
                        try:
                            # Try to parse as JSON (handles JSON-style like '["SCHEDULED"]')
                            parsed = json.loads(value_stripped)
                            if isinstance(parsed, list) and len(parsed) == 1:
                                # Extract single value from array
                                logger.info(f"Extracted '{parsed[0]}' from JSON stringified array for field '{key}'")
                                data[key] = parsed[0]
                                continue
                        except (json.JSONDecodeError, ValueError) as e2:
                            # Not a valid array representation, keep original value
                            logger.error(f"Failed to parse stringified array for '{key}': {e2}, keeping original value")
                            pass
                
                # Handle club field specifically
                if key == 'club':
                    if value == '' or (isinstance(value, str) and value.strip() == ''):
                        data[key] = None
        
        return super().to_internal_value(data)
    
    def validate(self, data):
        if data.get('end_date') and data.get('start_date'):
            if data['end_date'] < data['start_date']:
                raise serializers.ValidationError("End date cannot be before start date.")
        
        # Validate age range - max_age must be greater than or equal to min_age
        min_age = data.get('target_min_age')
        max_age = data.get('target_max_age')
        if min_age is not None and max_age is not None:
            if max_age < min_age:
                raise serializers.ValidationError({"target_max_age": "Maximum age must be greater than or equal to minimum age."})
        
        # Validate registration_close_date - must be before event start_date
        registration_close_date = data.get('registration_close_date')
        start_date = data.get('start_date')
        if start_date is None and self.instance:
            start_date = self.instance.start_date
        
        if registration_close_date and start_date:
            if registration_close_date >= start_date:
                raise serializers.ValidationError({
                    'registration_close_date': 'Registration close date must be before the event start date.'
                })
        
        # Validate scheduled_publish_date when status is SCHEDULED
        status = data.get('status')
        if status is None and self.instance:
            status = self.instance.status
        
        scheduled_publish_date = data.get('scheduled_publish_date')
        # Remove scheduled_publish_date if status is not SCHEDULED and it's empty/None
        if status != 'SCHEDULED' and (scheduled_publish_date is None or scheduled_publish_date == ''):
            data.pop('scheduled_publish_date', None)
        
        if status == 'SCHEDULED':
            # Check if scheduled_publish_date is provided or already exists
            if not scheduled_publish_date:
                if self.instance and self.instance.scheduled_publish_date:
                    # Updating existing event that already has scheduled_publish_date - allow it
                    pass
                else:
                    # Creating new event or updating without scheduled_publish_date
                    raise serializers.ValidationError({
                        'scheduled_publish_date': 'Scheduled publish date is required when status is SCHEDULED.'
                    })
        
        # Validate recurrence_end_date when is_recurring is True
        is_recurring = data.get('is_recurring')
        if is_recurring is None and self.instance:
            is_recurring = self.instance.is_recurring
        
        recurrence_end_date = data.get('recurrence_end_date')
        if is_recurring:
            if not recurrence_end_date:
                if self.instance and self.instance.recurrence_end_date:
                    # Updating existing event that already has recurrence_end_date - allow it
                    pass
                else:
                    # Creating new event or updating without recurrence_end_date
                    raise serializers.ValidationError({
                        'recurrence_end_date': 'Recurrence end date is required when event is recurring.'
                    })
        
        return data
    
    def create(self, validated_data):
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            logger.info("=== Serializer.create() called ===")
            logger.info(f"Validated data keys: {list(validated_data.keys())}")
            
            # Ensure slug is generated if empty or missing
            slug_value = validated_data.get('slug')
            if slug_value:
                slug_value = str(slug_value).strip()
            else:
                slug_value = ''
            
            if not slug_value and validated_data.get('title'):
                base_slug = slugify(validated_data['title'])
                slug = base_slug
                counter = 1
                # Ensure uniqueness - use a more robust check with transaction
                from django.db import transaction
                max_attempts = 100  # Prevent infinite loop
                attempts = 0
                while Event.objects.filter(slug=slug).exists() and attempts < max_attempts:
                    slug = f"{base_slug}-{counter}"
                    counter += 1
                    attempts += 1
                if attempts >= max_attempts:
                    # Fallback to UUID-based slug if we can't find a unique one
                    import uuid
                    slug = f"{base_slug}-{str(uuid.uuid4())[:8]}"
                validated_data['slug'] = slug
                logger.info(f"Generated slug: {slug} (attempts: {attempts})")
            elif not slug_value:
                # If no title either, generate a default slug
                validated_data['slug'] = slugify(validated_data.get('title', 'event'))
                logger.info(f"Generated default slug: {validated_data['slug']}")
            
            # Municipality and club are set in perform_create, but if they're not provided,
            # we need to ensure they're set here for validation to pass
            # The ViewSet's perform_create will override these if needed
            request = self.context.get('request')
            logger.info(f"Request context: {request is not None}")
            logger.info(f"Municipality in validated_data: {validated_data.get('municipality')}")
            logger.info(f"Club in validated_data: {validated_data.get('club')}")
            
            if request and request.user:
                user = request.user
                logger.info(f"User: {user.email}, Role: {user.role}")
                # Only set if not already provided and user is an admin
                if not validated_data.get('municipality'):
                    logger.info("Municipality not provided, checking user role...")
                    if user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
                        validated_data['municipality'] = user.assigned_municipality
                        logger.info(f"Set municipality from MUNICIPALITY_ADMIN: {validated_data['municipality']}")
                    elif user.role == 'CLUB_ADMIN' and user.assigned_club:
                        # Get club with municipality
                        club = user.assigned_club
                        club_id = club.pk if hasattr(club, 'pk') else (club.id if hasattr(club, 'id') else club)
                        logger.info(f"Getting club with ID: {club_id}")
                        club_obj = Club.objects.select_related('municipality').get(pk=club_id)
                        logger.info(f"Club object: {club_obj.name}, Municipality: {club_obj.municipality}")
                        if club_obj.municipality:
                            validated_data['municipality'] = club_obj.municipality
                            validated_data['club'] = club_obj
                            logger.info(f"Set municipality: {validated_data['municipality']}, club: {validated_data['club']}")
                        else:
                            logger.error(f"Club {club_obj.name} has no municipality!")
                    else:
                        logger.warning(f"User role {user.role} doesn't have municipality/club assignment")
                else:
                    logger.info("Municipality already provided in validated_data")
            
            logger.info(f"Final validated_data has municipality: {validated_data.get('municipality') is not None}")
            logger.info(f"Final validated_data has club: {validated_data.get('club') is not None}")
            
            # Try to create the event, handling slug conflicts
            max_retries = 5
            for attempt in range(max_retries):
                try:
                    result = super().create(validated_data)
                    logger.info(f"Event created successfully: {result.id}")
                    return result
                except Exception as e:
                    error_str = str(e)
                    # Check if it's a slug uniqueness error
                    if 'UNIQUE constraint failed' in error_str and 'slug' in error_str and attempt < max_retries - 1:
                        # Regenerate slug and retry
                        import uuid
                        base_slug = slugify(validated_data.get('title', 'event'))
                        validated_data['slug'] = f"{base_slug}-{str(uuid.uuid4())[:8]}"
                        logger.warning(f"Slug conflict detected, retrying with new slug: {validated_data['slug']} (attempt {attempt + 1})")
                        continue
                    else:
                        # Re-raise if it's not a slug error or we've exhausted retries
                        raise
        except Exception as e:
            import traceback
            logger.error(f"Error in serializer.create(): {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    def update(self, instance, validated_data):
        # Ensure slug is generated if empty or missing during update
        slug_value = validated_data.get('slug')
        if slug_value:
            slug_value = str(slug_value).strip()
        else:
            slug_value = ''
        
        if not slug_value and validated_data.get('title'):
            base_slug = slugify(validated_data['title'])
            slug = base_slug
            counter = 1
            # Ensure uniqueness (excluding current instance)
            while Event.objects.filter(slug=slug).exclude(pk=instance.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data['slug'] = slug
        
        # Handle empty string for club field (to clear it)
        # FormData sends empty strings, but we need None to clear ForeignKey
        if 'club' in validated_data:
            club_value = validated_data['club']
            if club_value == '' or (isinstance(club_value, str) and club_value.strip() == ''):
                validated_data['club'] = None
        
        return super().update(instance, validated_data)