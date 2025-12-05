from django.contrib import admin
from .models import Event, EventRegistration, EventTicket

class EventRegistrationInline(admin.TabularInline):
    model = EventRegistration
    extra = 0
    readonly_fields = ('created_at', 'updated_at')
    can_delete = True
    classes = ['collapse']

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = (
        'title', 
        'start_date', 
        'municipality', 
        'club', 
        'status', 
        'target_audience',
        'confirmed_participants_count', 
        'max_seats'
    )
    list_filter = (
        'status', 
        'municipality', 
        'target_audience', 
        'is_recurring', 
        'start_date'
    )
    search_fields = ('title', 'description', 'location_name')
    readonly_fields = ('confirmed_participants_count', 'waitlist_count')
    inlines = [EventRegistrationInline]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('title', 'description', 'cover_image', 'video_url', 'cost', 'status')
        }),
        ('Organization', {
            'fields': ('municipality', 'club', 'organizer_name')
        }),
        ('Timing', {
            'fields': ('start_date', 'end_date', 'is_recurring', 'recurrence_pattern')
        }),
        ('Location', {
            'fields': ('location_name', 'address', 'latitude', 'longitude')
        }),
        ('Audience Targeting', {
            'fields': (
                'is_global', 
                'target_audience', 
                'target_groups', 
                'target_genders', 
                'target_min_age', 
                'target_max_age', 
                'target_grades', 
                'target_interests'
            ),
            'classes': ('collapse',)
        }),
        ('Registration Logic', {
            'fields': (
                'allow_registration', 
                'requires_verified_account', 
                'requires_guardian_approval', 
                'requires_admin_approval',
                'registration_open_date', 
                'registration_close_date'
            )
        }),
        ('Capacity & Tickets', {
            'fields': ('max_seats', 'max_waitlist', 'enable_tickets')
        }),
    )

@admin.register(EventRegistration)
class EventRegistrationAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'status', 'created_at')
    list_filter = ('status', 'event__municipality', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'event__title')
    autocomplete_fields = ['user', 'event']

@admin.register(EventTicket)
class EventTicketAdmin(admin.ModelAdmin):
    list_display = ('ticket_code', 'registration', 'is_active', 'checked_in_at')
    search_fields = ('ticket_code', 'registration__user__email')
    readonly_fields = ('ticket_code',)