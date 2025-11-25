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
    list_display = ('name', 'country', 'municipality_code')
    list_filter = ('country',)
    search_fields = ('name', 'municipality_code')

@admin.register(Club)
class ClubAdmin(admin.ModelAdmin):
    list_display = ('name', 'municipality', 'email')
    list_filter = ('municipality__country', 'municipality')
    search_fields = ('name', 'email')
    
    # Add the opening hours, closures, and overrides here
    inlines = [RegularOpeningHourInline, DateOverrideInline, ClubClosureInline]

@admin.register(Interest)
class InterestAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon')
    search_fields = ('name',)