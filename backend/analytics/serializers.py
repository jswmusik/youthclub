from rest_framework import serializers
from .models import AnalyticsReport

class AnalyticsFilterSerializer(serializers.Serializer):
    """
    Validates the filter parameters sent from the frontend Dashboard.
    """
    start_date = serializers.DateTimeField(required=True)
    end_date = serializers.DateTimeField(required=True)
    
    # Scope
    club_id = serializers.IntegerField(required=False, allow_null=True)
    
    # Demographics
    group_id = serializers.IntegerField(required=False, allow_null=True)
    grades = serializers.ListField(child=serializers.IntegerField(), required=False)
    genders = serializers.ListField(child=serializers.CharField(), required=False)
    age_min = serializers.IntegerField(required=False, min_value=0)
    age_max = serializers.IntegerField(required=False, min_value=0)
    interests = serializers.ListField(child=serializers.IntegerField(), required=False)

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