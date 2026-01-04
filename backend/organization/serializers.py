from rest_framework import serializers
from django.http import QueryDict
from django.utils import timezone
from datetime import timedelta, datetime
import json
from .models import Country, Municipality, Club, RegularOpeningHour, ClubClosure, DateOverride, Interest
from licensing.models import License, Plan

# --- Opening Hours Serializers ---

class RegularOpeningHourSerializer(serializers.ModelSerializer):
    weekday_display = serializers.CharField(source='get_weekday_display', read_only=True)
    
    class Meta:
        model = RegularOpeningHour
        fields = [
            'id', 'weekday', 'weekday_display', 'week_cycle', 
            'open_time', 'close_time', 'title', 
            'gender_restriction', 'restriction_mode', 'min_value', 'max_value'
        ]

class ClubClosureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubClosure
        fields = ['id', 'start_date', 'end_date', 'description']

class DateOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = DateOverride
        fields = ['id', 'date', 'open_time', 'close_time', 'title', 'description']

# --- Organization Serializers ---

class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = [
            'id',
            'name',
            'country_code',
            'description',
            'currency_code',
            'default_language',
            'timezone',
            'avatar',
        ]

class MunicipalitySerializer(serializers.ModelSerializer):
    # Include country name for easier display
    country_name = serializers.CharField(source='country.name', read_only=True)
    country_code = serializers.CharField(source='country.country_code', read_only=True)
    
    # --- WRITABLE FIELDS FOR SUPER ADMIN ---
    plan_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    max_clubs = serializers.IntegerField(write_only=True, required=False)
    license_end_date = serializers.DateField(write_only=True, required=False, allow_null=True)
    license_is_active = serializers.BooleanField(write_only=True, required=False)
    
    # License-related fields for frontend feature gating
    allowed_features = serializers.SerializerMethodField()
    license_status = serializers.SerializerMethodField()
    
    # Data retention fields (GDPR)
    effective_retention_months = serializers.IntegerField(read_only=True)
    data_retention_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Municipality
        fields = [
            'id',
            'country',
            'country_name',
            'country_code',
            'name',
            'slug',
            'municipality_code',
            'description',
            'terms_and_conditions',
            'avatar',
            'hero_image',
            'email',
            'phone',
            'website_link',
            'social_media',
            'allow_self_registration',
            'require_guardian_at_registration',
            'trial_period_days',  # Trial period for unverified youth members
            'data_retention_months',  # Can be set by municipality admin
            'effective_retention_months',  # Computed: shows actual value used
            'data_retention_info',  # Full info including global defaults
            'created_at',
            # License fields
            'allowed_features',
            'license_status',
            # Writable license fields (Super Admin)
            'plan_id',
            'max_clubs',
            'license_end_date',
            'license_is_active',
        ]
    
    def get_data_retention_info(self, obj):
        """Returns full data retention info including global defaults."""
        from licensing.models import GlobalDataRetentionSettings
        global_settings = GlobalDataRetentionSettings.get_settings()
        
        return {
            'municipality_override': obj.data_retention_months,
            'effective_months': obj.effective_retention_months,
            'global_default_months': global_settings.default_retention_months,
            'min_allowed_months': global_settings.min_allowed_retention_months,
            'max_allowed_months': global_settings.max_allowed_retention_months,
            'is_using_global_default': obj.data_retention_months is None
        }
    
    def validate_data_retention_months(self, value):
        """Validate that data_retention_months is within allowed range."""
        if value is not None:
            from licensing.models import GlobalDataRetentionSettings
            settings = GlobalDataRetentionSettings.get_settings()
            
            if value < settings.min_allowed_retention_months:
                raise serializers.ValidationError(
                    f"Data retention period cannot be less than {settings.min_allowed_retention_months} months."
                )
            if value > settings.max_allowed_retention_months:
                raise serializers.ValidationError(
                    f"Data retention period cannot exceed {settings.max_allowed_retention_months} months."
                )
        return value
    
    def get_allowed_features(self, obj):
        """Returns list of feature slugs the municipality has access to."""
        if hasattr(obj, 'license') and obj.license.is_active:
            return list(obj.license.get_active_features_slugs())
        return []
    
    def get_license_status(self, obj):
        """Returns details about the current subscription."""
        if hasattr(obj, 'license'):
            license = obj.license
            return {
                'plan_id': license.plan.id,
                'plan_name': license.plan.name,
                'plan_monthly_price': float(license.plan.monthly_price_sek),
                'max_clubs': license.max_clubs,
                'clubs_used': obj.clubs.count(),
                'has_analytics': license.has_analytics,
                'expires_at': license.end_date,
                'is_active': license.is_active,
            }
        return None
    
    def create(self, validated_data):
        """Create municipality and optionally assign a license."""
        # Extract license data before creating municipality
        plan_id = validated_data.pop('plan_id', None)
        max_clubs_override = validated_data.pop('max_clubs', 3)
        license_end_date = validated_data.pop('license_end_date', None)
        license_is_active = validated_data.pop('license_is_active', True)
        
        # Create Municipality (signal will auto-create a default license)
        municipality = super().create(validated_data)
        
        # If a specific plan_id was provided, update the license with the specified values
        # The signal already created a default license, so we just update it
        if plan_id:
            try:
                plan = Plan.objects.get(id=plan_id)
                # Calculate end date
                end_date = license_end_date if license_end_date else (timezone.now().date() + timedelta(days=365))
                
                # Get the license (signal should have created it)
                # Use get_or_create as a safety fallback
                license, created = License.objects.get_or_create(
                    municipality=municipality,
                    defaults={
                        'plan': plan,
                        'max_clubs': max_clubs_override,
                        'start_date': timezone.now().date(),
                        'end_date': end_date,
                        'is_active': license_is_active,
                        'auto_renew': True
                    }
                )
                
                if not created:
                    # License existed (from signal), update it with the specified values
                    license.plan = plan
                    license.max_clubs = max_clubs_override
                    license.end_date = end_date
                    license.is_active = license_is_active
                    license.save()
                    
            except Plan.DoesNotExist:
                pass  # Signal already created a default license
        
        return municipality
    
    def update(self, instance, validated_data):
        """Update municipality and optionally update license."""
        # Extract license data
        plan_id = validated_data.pop('plan_id', None)
        max_clubs_override = validated_data.pop('max_clubs', None)
        license_end_date = validated_data.pop('license_end_date', None)
        license_is_active = validated_data.pop('license_is_active', None)
        
        # Update Municipality
        instance = super().update(instance, validated_data)
        
        # Update License if any license field was provided
        has_license_updates = any([
            plan_id, 
            max_clubs_override is not None, 
            license_end_date, 
            license_is_active is not None
        ])
        
        if has_license_updates:
            # Check if license exists using database query (more reliable)
            license_exists = License.objects.filter(municipality=instance).exists()
            
            if license_exists:
                # Update existing license
                license = instance.license
                if plan_id:
                    try:
                        plan = Plan.objects.get(id=plan_id)
                        license.plan = plan
                    except Plan.DoesNotExist:
                        pass
                if max_clubs_override is not None:
                    license.max_clubs = max_clubs_override
                if license_end_date:
                    license.end_date = license_end_date
                if license_is_active is not None:
                    license.is_active = license_is_active
                license.save()
            elif plan_id:
                # No license exists, create one if plan_id was provided
                try:
                    plan = Plan.objects.get(id=plan_id)
                    License.objects.create(
                        municipality=instance,
                        plan=plan,
                        max_clubs=max_clubs_override if max_clubs_override is not None else 3,
                        start_date=timezone.now().date(),
                        end_date=license_end_date if license_end_date else (timezone.now().date() + timedelta(days=365)),
                        is_active=license_is_active if license_is_active is not None else True,
                        auto_renew=True
                    )
                except Plan.DoesNotExist:
                    pass
        
        return instance

class ClubSerializer(serializers.ModelSerializer):
    # Include the related data nicely
    municipality_name = serializers.CharField(source='municipality.name', read_only=True)
    municipality_slug = serializers.CharField(source='municipality.slug', read_only=True)
    
    # Nested Opening Hours (so we get them automatically when fetching a club)
    regular_hours = RegularOpeningHourSerializer(many=True, read_only=True)
    closures = ClubClosureSerializer(many=True, read_only=True)
    date_overrides = DateOverrideSerializer(many=True, read_only=True)

    # Add calculated properties so frontend doesn't have to do the math
    effective_require_guardian = serializers.BooleanField(source='should_require_guardian', read_only=True)
    effective_registration_allowed = serializers.BooleanField(source='is_registration_allowed', read_only=True)
    effective_trial_period_days = serializers.IntegerField(read_only=True)
    
    # Municipality details for showing defaults
    municipality_details = serializers.SerializerMethodField()
    
    # Override trial_period_days_override to accept empty string as null
    trial_period_days_override = serializers.IntegerField(
        required=False, 
        allow_null=True,
        min_value=0,
        max_value=90
    )

    class Meta:
        model = Club
        fields = [
            'id', 'name', 'slug', 'municipality', 'municipality_name', 'municipality_slug',
            'description', 'email', 'phone', 
            'terms_and_conditions', 'club_policies',
            'avatar', 'hero_image', 'address', 
            'latitude', 'longitude', 
            'allowed_age_groups', 'club_categories',
            'regular_hours', 'closures', 'date_overrides',
            # New fields:
            'allow_self_registration_override', 
            'require_guardian_override',
            'trial_period_days_override',
            # Computed fields:
            'effective_require_guardian',
            'effective_registration_allowed',
            'effective_trial_period_days',
            'municipality_details',
            'created_at'
        ]
    
    def to_internal_value(self, data):
        """Handle empty string as null for trial_period_days_override"""
        # Convert empty string to None for trial_period_days_override
        if 'trial_period_days_override' in data:
            value = data.get('trial_period_days_override')
            if value == '' or value is None:
                # Create a mutable copy if needed
                if hasattr(data, '_mutable'):
                    data._mutable = True
                data['trial_period_days_override'] = None
                if hasattr(data, '_mutable'):
                    data._mutable = False
        return super().to_internal_value(data)
    
    def get_municipality_details(self, obj):
        """Returns municipality details for showing defaults in the UI"""
        if obj.municipality:
            return {
                'id': obj.municipality.id,
                'name': obj.municipality.name,
                'trial_period_days': obj.municipality.trial_period_days,
            }
        return None

class InterestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interest
        fields = ['id', 'name', 'icon', 'avatar']


class NullableBooleanField(serializers.Field):
    """Custom field that accepts empty string as null, and 'true'/'false' strings as booleans."""
    
    def to_internal_value(self, data):
        if data == '' or data is None or data == 'undefined' or data == 'null':
            return None
        if isinstance(data, bool):
            return data
        if isinstance(data, str):
            if data.lower() in ('true', '1', 'yes'):
                return True
            if data.lower() in ('false', '0', 'no'):
                return False
        raise serializers.ValidationError('Must be a valid boolean or empty for default.')
    
    def to_representation(self, value):
        if value is None:
            return None
        return value


class ClubManagementSerializer(serializers.ModelSerializer):
    """
    Used by Super Admins to create/update Clubs AND their opening hours.
    """
    # We accept a JSON string for hours because we are using FormData (for images)
    regular_hours_data = serializers.CharField(write_only=True, required=False)
    
    # Override boolean fields to accept null/empty string (for "use municipality default")
    allow_self_registration_override = NullableBooleanField(required=False)
    require_guardian_override = NullableBooleanField(required=False)
    
    # Override trial_period_days_override to accept empty string as null
    trial_period_days_override = serializers.IntegerField(
        required=False, 
        allow_null=True,
        min_value=0,
        max_value=90
    )

    class Meta:
        model = Club
        fields = [
            'id', 'name', 'municipality', 'description', 'email', 'phone',
            'terms_and_conditions', 'club_policies',
            'avatar', 'hero_image',
            'address', 'latitude', 'longitude',
            'club_categories',  # Removed allowed_age_groups as it's now handled per hour
            'allow_self_registration_override',
            'require_guardian_override',
            'trial_period_days_override',  # Added trial period override
            'regular_hours_data'
        ]

    def to_internal_value(self, data):
        # Handle trial_period_days_override empty string as null
        if 'trial_period_days_override' in data:
            value = data.get('trial_period_days_override')
            if value == '' or value is None:
                # Make data mutable if needed
                if hasattr(data, '_mutable'):
                    data._mutable = True
                else:
                    data = data.copy()
                data['trial_period_days_override'] = None
                if hasattr(data, '_mutable'):
                    data._mutable = False
            
        return super().to_internal_value(data)
    
    def validate(self, data):
        """
        Validate club creation against license limits.
        Only check on creation (not editing existing clubs).
        """
        # Only check on creation (not editing)
        if not self.instance:
            request = self.context.get('request')
            municipality = data.get('municipality')
            
            # If municipality is provided in data, use it; otherwise try to get from user
            if not municipality and request and request.user:
                municipality = getattr(request.user, 'assigned_municipality', None)
            
            if municipality:
                if hasattr(municipality, 'license'):
                    license = municipality.license
                    
                    if not license.is_active:
                        raise serializers.ValidationError(
                            "The municipality's license is not active. Please contact support."
                        )
                    
                    current_count = municipality.clubs.count()
                    max_allowed = license.max_clubs
                    
                    if current_count >= max_allowed:
                        raise serializers.ValidationError(
                            f"Your license allows for a maximum of {max_allowed} clubs. "
                            f"You currently have {current_count} clubs. "
                            "Please upgrade your plan to add more."
                        )
                else:
                    # Optional: Block creation if no license exists at all
                    raise serializers.ValidationError(
                        "No active license found for this municipality. Please contact support."
                    )
        
        return data

    def create(self, validated_data):
        hours_json = validated_data.pop('regular_hours_data', None)
        club = Club.objects.create(**validated_data)

        if hours_json:
            try:
                hours_list = json.loads(hours_json)
                for hour in hours_list:
                    # Clean up frontend temporary IDs
                    if 'id' in hour: del hour['id']
                    if 'weekday_display' in hour: del hour['weekday_display']
                    
                    # Validate Overlap Logic Here (Optional but good for safety)
                    # For now, we rely on frontend validation for UX, 
                    # simply saving what is sent.
                    RegularOpeningHour.objects.create(club=club, **hour)
            except json.JSONDecodeError:
                pass  # Ignore invalid JSON

        return club

    def update(self, instance, validated_data):
        hours_json = validated_data.pop('regular_hours_data', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if hours_json:
            try:
                hours_list = json.loads(hours_json)
                instance.regular_hours.all().delete()
                for hour in hours_list:
                    # Clean up frontend temporary IDs
                    if 'id' in hour: del hour['id']
                    if 'weekday_display' in hour: del hour['weekday_display']
                    
                    # Validate Overlap Logic Here (Optional but good for safety)
                    # For now, we rely on frontend validation for UX, 
                    # simply saving what is sent.
                    RegularOpeningHour.objects.create(club=instance, **hour)
            except json.JSONDecodeError:
                pass
                
        return instance


# =============================================================================
# PUBLIC CLUB SERIALIZER - For unauthenticated public pages
# =============================================================================

class PublicClubDetailSerializer(serializers.ModelSerializer):
    """
    Full public club serializer for landing pages.
    No sensitive data - just public info.
    """
    municipality_name = serializers.CharField(source='municipality.name', read_only=True)
    municipality_slug = serializers.CharField(source='municipality.slug', read_only=True)
    municipality_description = serializers.CharField(source='municipality.description', read_only=True)
    municipality_avatar = serializers.FileField(source='municipality.avatar', read_only=True)
    
    # Opening hours
    regular_hours = RegularOpeningHourSerializer(many=True, read_only=True)
    
    # Is the club open right now?
    is_open_now = serializers.SerializerMethodField()
    todays_hours = serializers.SerializerMethodField()
    
    class Meta:
        model = Club
        fields = [
            'id', 'name', 'slug', 
            'municipality_name', 'municipality_slug', 'municipality_description', 'municipality_avatar',
            'description', 
            'avatar', 'hero_image', 
            'address', 'latitude', 'longitude',
            'email', 'phone',
            'allowed_age_groups', 'club_categories',
            'regular_hours',
            'is_open_now', 'todays_hours',
            'created_at',
        ]
    
    def get_is_open_now(self, obj):
        """Check if the club is currently open."""
        now = timezone.now()
        current_weekday = now.isoweekday()  # 1=Monday, 7=Sunday
        current_time = now.time()
        current_week = now.isocalendar()[1]
        is_odd_week = current_week % 2 == 1
        
        # Check for closures
        closures = obj.closures.filter(
            start_date__lte=now.date(),
            end_date__gte=now.date()
        )
        if closures.exists():
            return False
        
        # Check regular hours for today
        for hour in obj.regular_hours.filter(weekday=current_weekday):
            # Check week cycle
            if hour.week_cycle == 'ODD' and not is_odd_week:
                continue
            if hour.week_cycle == 'EVEN' and is_odd_week:
                continue
            
            if hour.open_time <= current_time <= hour.close_time:
                return True
        
        return False
    
    def get_todays_hours(self, obj):
        """Get today's opening hours."""
        now = timezone.now()
        current_weekday = now.isoweekday()
        current_week = now.isocalendar()[1]
        is_odd_week = current_week % 2 == 1
        
        # Check for closures
        closures = obj.closures.filter(
            start_date__lte=now.date(),
            end_date__gte=now.date()
        )
        if closures.exists():
            closure = closures.first()
            return {'closed': True, 'reason': closure.description or 'Stängt'}
        
        # Check for date overrides
        overrides = obj.date_overrides.filter(date=now.date())
        if overrides.exists():
            override = overrides.first()
            return {
                'closed': False,
                'open_time': override.open_time.strftime('%H:%M'),
                'close_time': override.close_time.strftime('%H:%M'),
                'title': override.title or 'Specialöppet'
            }
        
        # Get regular hours
        hours = []
        for hour in obj.regular_hours.filter(weekday=current_weekday):
            # Check week cycle
            if hour.week_cycle == 'ODD' and not is_odd_week:
                continue
            if hour.week_cycle == 'EVEN' and is_odd_week:
                continue
            
            hours.append({
                'open_time': hour.open_time.strftime('%H:%M'),
                'close_time': hour.close_time.strftime('%H:%M'),
                'title': hour.title or '',
                'gender_restriction': hour.gender_restriction,
            })
        
        if not hours:
            return {'closed': True, 'reason': 'Ingen öppettid idag'}
        
        return {'closed': False, 'hours': hours}