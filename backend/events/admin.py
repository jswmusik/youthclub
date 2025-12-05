from django.contrib import admin
from .models import Event, EventRegistration, EventTicket, EventImage, EventDocument

class EventImageInline(admin.TabularInline):
    model = EventImage
    extra = 1

class EventDocumentInline(admin.TabularInline):
    model = EventDocument
    extra = 1

class EventRegistrationInline(admin.TabularInline):
    model = EventRegistration
    extra = 0
    readonly_fields = ('created_at',)
    can_delete = True
    classes = ['collapse']

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'start_date', 'municipality', 'club', 'status', 'confirmed_participants_count')
    list_filter = ('status', 'municipality', 'is_global')
    search_fields = ('title', 'description', 'location_name')
    inlines = [EventImageInline, EventDocumentInline, EventRegistrationInline]
    
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
            'fields': ('location_name', 'address', 'latitude', 'longitude', 'is_map_visible')
        }),
        ('Targeting', {
            'fields': ('target_audience', 'target_groups', 'target_interests', 'target_grades', 'target_genders', 'target_min_age', 'target_max_age')
        }),
        ('Registration & Capacity', {
            'fields': ('allow_registration', 'max_seats', 'max_waitlist', 'enable_tickets')
        }),
        ('Approvals', {
            'fields': ('requires_verified_account', 'requires_guardian_approval', 'requires_admin_approval')
        }),
    )

@admin.register(EventRegistration)
class EventRegistrationAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('user__email', 'event__title')

@admin.register(EventTicket)
class EventTicketAdmin(admin.ModelAdmin):
    list_display = ('ticket_code', 'registration', 'is_active')
    search_fields = ('ticket_code',)