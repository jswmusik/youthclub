from django.contrib import admin
from .models import Feature, Plan, GlobalPricing, GlobalDataRetentionSettings, License, LicenseRequest

@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'monthly_price_sek')
    search_fields = ('name', 'slug')

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'monthly_price_sek', 'is_public', 'is_active')
    filter_horizontal = ('features',)
    list_filter = ('is_public', 'is_active')

@admin.register(GlobalPricing)
class GlobalPricingAdmin(admin.ModelAdmin):
    # Singleton protection: remove add button if one exists
    def has_add_permission(self, request):
        if self.model.objects.exists():
            return False
        return super().has_add_permission(request)

@admin.register(GlobalDataRetentionSettings)
class GlobalDataRetentionSettingsAdmin(admin.ModelAdmin):
    list_display = ('default_retention_months', 'min_allowed_retention_months', 
                    'max_allowed_retention_months', 'is_auto_deletion_enabled', 'updated_at')
    readonly_fields = ('updated_at',)
    fieldsets = (
        ('Retention Period Defaults', {
            'fields': ('default_retention_months', 'min_allowed_retention_months', 'max_allowed_retention_months'),
            'description': 'Configure the default and allowed range for data retention periods.'
        }),
        ('Warning Notifications', {
            'fields': ('warning_notification_days', 'second_warning_notification_days'),
            'description': 'When to notify users before their data is deleted.'
        }),
        ('System Control', {
            'fields': ('is_auto_deletion_enabled',),
            'description': 'Enable/disable automatic deletion. Keep disabled for testing.'
        }),
        ('Metadata', {
            'fields': ('updated_at',),
            'classes': ('collapse',)
        }),
    )

    # Singleton protection
    def has_add_permission(self, request):
        if self.model.objects.exists():
            return False
        return super().has_add_permission(request)
    
    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(License)
class LicenseAdmin(admin.ModelAdmin):
    list_display = ('municipality', 'plan', 'max_clubs', 'has_analytics', 'end_date', 'is_active')
    list_filter = ('plan', 'is_active', 'has_analytics')
    search_fields = ('municipality__name',)
    filter_horizontal = ('extra_features',)

@admin.register(LicenseRequest)
class LicenseRequestAdmin(admin.ModelAdmin):
    list_display = ('municipality', 'request_type', 'status', 'created_at')
    list_filter = ('status', 'request_type')
    search_fields = ('municipality__name',)
    readonly_fields = ('created_at',)