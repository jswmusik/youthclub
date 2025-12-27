from django.contrib import admin
from .models import Feature, Plan, GlobalPricing, License, LicenseRequest

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