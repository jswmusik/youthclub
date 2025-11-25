from rest_framework import serializers
from django.http import QueryDict
import json
from .models import Country, Municipality, Club, RegularOpeningHour, ClubClosure, DateOverride, Interest

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
    
    class Meta:
        model = Municipality
        fields = [
            'id',
            'country',
            'country_name',
            'country_code',
            'name',
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
        ]

class ClubSerializer(serializers.ModelSerializer):
    # Include the related data nicely
    municipality_name = serializers.CharField(source='municipality.name', read_only=True)
    
    # Nested Opening Hours (so we get them automatically when fetching a club)
    regular_hours = RegularOpeningHourSerializer(many=True, read_only=True)
    closures = ClubClosureSerializer(many=True, read_only=True)
    date_overrides = DateOverrideSerializer(many=True, read_only=True)

    class Meta:
        model = Club
        fields = [
            'id', 'name', 'municipality', 'municipality_name', 
            'description', 'email', 'phone', 
            'terms_and_conditions', 'club_policies',
            'avatar', 'hero_image', 'address', 
            'latitude', 'longitude', 
            'allowed_age_groups', 'club_categories',
            'regular_hours', 'closures', 'date_overrides'
        ]

class InterestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interest
        fields = ['id', 'name', 'icon', 'avatar']


class ClubManagementSerializer(serializers.ModelSerializer):
    """
    Used by Super Admins to create/update Clubs AND their opening hours.
    """
    # We accept a JSON string for hours because we are using FormData (for images)
    regular_hours_data = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Club
        fields = [
            'id', 'name', 'municipality', 'description', 'email', 'phone',
            'terms_and_conditions', 'club_policies',
            'avatar', 'hero_image',
            'address', 'latitude', 'longitude',
            'club_categories',  # Removed allowed_age_groups as it's now handled per hour
            'regular_hours_data'
        ]

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