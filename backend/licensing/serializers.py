from rest_framework import serializers
from .models import Feature, Plan, License, LicenseRequest, GlobalPricing


class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = ['id', 'name', 'slug', 'description', 'monthly_price_sek']


class PlanSerializer(serializers.ModelSerializer):
    # We show the full feature objects for display
    features_details = FeatureSerializer(source='features', many=True, read_only=True)
    features = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Feature.objects.all(), write_only=True
    )

    class Meta:
        model = Plan
        fields = [
            'id', 'name', 'description', 
            'features', 'features_details', 
            'monthly_price_sek', 'is_public', 'is_active', 'created_at'
        ]


class LicenseSerializer(serializers.ModelSerializer):
    municipality_name = serializers.CharField(source='municipality.name', read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    
    # Plan features (included in the plan)
    plan_features = serializers.SerializerMethodField()
    
    # Extra features (purchased separately)
    extra_features_details = FeatureSerializer(source='extra_features', many=True, read_only=True)
    extra_features = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Feature.objects.all(), required=False
    )

    class Meta:
        model = License
        fields = [
            'id', 'municipality', 'municipality_name',
            'plan', 'plan_name', 'plan_features',
            'extra_features', 'extra_features_details',
            'max_clubs', 'has_analytics',
            'start_date', 'end_date', 'auto_renew', 'is_active'
        ]
    
    def get_plan_features(self, obj):
        """Returns the feature IDs included in the license's plan"""
        return list(obj.plan.features.values_list('id', flat=True))


class LicenseRequestSerializer(serializers.ModelSerializer):
    municipality_name = serializers.CharField(source='municipality.name', read_only=True)
    requested_plan_name = serializers.CharField(source='requested_plan.name', read_only=True, allow_null=True)
    requested_feature_name = serializers.CharField(source='requested_feature.name', read_only=True, allow_null=True)
    
    class Meta:
        model = LicenseRequest
        fields = [
            'id', 'municipality', 'municipality_name',
            'request_type', 'status',
            'requested_plan', 'requested_plan_name',
            'requested_feature', 'requested_feature_name', 'requested_club_count',
            'renewal_years',
            'admin_notes', 'created_at'
        ]
        read_only_fields = ['created_at', 'status']
        extra_kwargs = {
            # Municipality is auto-filled in perform_create for non-superusers
            'municipality': {'required': False},
        }


class GlobalPricingSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalPricing
        fields = ['price_per_extra_club_sek', 'analytics_package_price_sek', 'yearly_renewal_discount_percent']

