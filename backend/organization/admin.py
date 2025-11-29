from django.contrib import admin
from .models import Country, Municipality, Club, RegularOpeningHour, ClubClosure, DateOverride, Interest

# --- INLINES (Allows editing inside the Club page) ---

class RegularOpeningHourInline(admin.TabularInline):
    model = RegularOpeningHour
    extra = 0 # Don't show empty extra rows by default
    ordering = ['weekday', 'open_time']

class ClubClosureInline(admin.TabularInline):
    model = ClubClosure
    extra = 0
    ordering = ['start_date']

class DateOverrideInline(admin.TabularInline):
    model = DateOverride
    extra = 0
    ordering = ['date']

# --- ADMIN CONFIGURATION ---

@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ('name', 'country_code', 'default_language')
    search_fields = ('name', 'country_code')

@admin.register(Municipality)
class MunicipalityAdmin(admin.ModelAdmin):
    # Added new settings to list_display
    list_display = ('name', 'country', 'municipality_code', 'allow_self_registration', 'require_guardian_at_registration')
    list_filter = ('country', 'allow_self_registration', 'require_guardian_at_registration')
    search_fields = ('name', 'municipality_code')
    
    # Grouping fields for cleaner UI
    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'country', 'municipality_code', 'description', 'terms_and_conditions')
        }),
        ('Registration Settings', {
            'fields': ('allow_self_registration', 'require_guardian_at_registration'),
            'description': 'Control how youth members register for clubs in this municipality.'
        }),
        ('Contact & Branding', {
            'fields': ('email', 'phone', 'website_link', 'social_media', 'avatar', 'hero_image')
        }),
    )

@admin.register(Club)
class ClubAdmin(admin.ModelAdmin):
    list_display = ('name', 'municipality', 'email', 'get_self_reg', 'get_guardian_req')
    list_filter = ('municipality__country', 'municipality')
    search_fields = ('name', 'email')
    inlines = [RegularOpeningHourInline, DateOverrideInline, ClubClosureInline]

    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'municipality', 'description', 'club_categories', 'allowed_age_groups')
        }),
        ('Registration Overrides', {
            'fields': ('allow_self_registration_override', 'require_guardian_override'),
            'description': 'Set to True/False to override the Municipality default. Leave Empty (None) to use default.'
        }),
        ('Contact & Location', {
            'fields': ('email', 'phone', 'address', 'latitude', 'longitude', 'terms_and_conditions', 'club_policies')
        }),
        ('Branding', {
            'fields': ('avatar', 'hero_image')
        }),
    )

    # Helper methods to show the effective setting in the list view
    @admin.display(description='Self Reg')
    def get_self_reg(self, obj):
        val = obj.allow_self_registration_override
        if val is None:
            return f"Default ({obj.municipality.allow_self_registration})"
        return val

    @admin.display(description='Guardian Req')
    def get_guardian_req(self, obj):
        val = obj.require_guardian_override
        if val is None:
            return f"Default ({obj.municipality.require_guardian_at_registration})"
        return val

@admin.register(Interest)
class InterestAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon')
    search_fields = ('name',)