from rest_framework import serializers
from .models import AnalyticsReport, AnalyticsPreference

class AnalyticsFilterSerializer(serializers.Serializer):
    """
    Validates the filter parameters sent from the frontend Dashboard.
    Groups take precedence over all other demographic filters.
    """
    start_date = serializers.DateTimeField(required=True)
    end_date = serializers.DateTimeField(required=True)
    
    # Scope - Municipality is set by the view based on user's role
    municipality_id = serializers.IntegerField(required=False, allow_null=True)
    club_id = serializers.IntegerField(required=False, allow_null=True)
    
    # Group Filter (Takes precedence over all other demographic filters)
    group_id = serializers.IntegerField(required=False, allow_null=True)
    
    # Demographics (Ignored if group_id is set)
    grades = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    genders = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    age_min = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    age_max = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    interests = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    
    # Custom Fields Filter: { field_id: value } or { field_id: [values] }
    custom_fields = serializers.DictField(required=False, default=dict)


class VisibleSectionsSerializer(serializers.Serializer):
    """
    Validates the visibility preferences for analytics sections.
    """
    metrics = serializers.BooleanField(required=False, default=True)
    heatmap = serializers.BooleanField(required=False, default=True)
    inventory = serializers.BooleanField(required=False, default=True)
    demographics = serializers.BooleanField(required=False, default=True)
    interests = serializers.BooleanField(required=False, default=True)
    insights = serializers.BooleanField(required=False, default=True)
    questionnaires = serializers.BooleanField(required=False, default=True)
    bookings = serializers.BooleanField(required=False, default=True)
    groupComparison = serializers.BooleanField(required=False, default=True)
    clubComparison = serializers.BooleanField(required=False, default=True)
    events = serializers.BooleanField(required=False, default=True)


class AIReportRequestSerializer(serializers.Serializer):
    """
    Validates AI report generation requests.
    """
    # The user's request/prompt
    user_request = serializers.CharField(
        required=True,
        max_length=1000,
        help_text="The admin's specific request or question"
    )
    
    # Report type
    report_type = serializers.ChoiceField(
        choices=['summary', 'monthly', 'trend'],
        default='summary',
        help_text="Type of report to generate"
    )
    
    # Output language
    language = serializers.ChoiceField(
        choices=['en', 'sv', 'no'],
        default='en',
        help_text="Output language (en=English, sv=Swedish, no=Norwegian)"
    )
    
    # AI provider (optional - uses default if not specified)
    provider = serializers.ChoiceField(
        choices=['anthropic', 'openai'],
        required=False,
        allow_null=True,
        help_text="AI provider to use (optional)"
    )
    
    # Analytics filters (same as dashboard)
    filters = AnalyticsFilterSerializer(required=True)
    
    # Visible sections (optional - defaults to all visible)
    visible_sections = VisibleSectionsSerializer(required=False, allow_null=True)

class AnalyticsReportSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = AnalyticsReport
        fields = [
            'id', 'name', 'description', 'report_type', 
            'created_at', 'created_by_name', 'file', 
            'date_range_start', 'date_range_end'
        ]
        read_only_fields = ['created_at', 'file']


class AnalyticsPreferenceSerializer(serializers.ModelSerializer):
    """
    Serializer for user's analytics visibility preferences.
    """
    class Meta:
        model = AnalyticsPreference
        fields = ['preferences', 'updated_at']
        read_only_fields = ['updated_at']
    
    def to_representation(self, instance):
        """Return preferences merged with defaults."""
        data = super().to_representation(instance)
        data['preferences'] = instance.get_preferences()
        return data
    
    def validate_preferences(self, value):
        """Validate that preferences is a dict with boolean values."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Preferences must be a dictionary.")
        
        valid_keys = set(AnalyticsPreference.get_default_preferences().keys())
        
        for key, val in value.items():
            if key not in valid_keys:
                raise serializers.ValidationError(f"Invalid preference key: {key}")
            if not isinstance(val, bool):
                raise serializers.ValidationError(f"Preference value for '{key}' must be a boolean.")
        
        return value