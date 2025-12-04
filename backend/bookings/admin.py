from django.contrib import admin
from .models import BookingResource, BookingSchedule, Booking, ResourceQualification, BookingParticipant

class BookingScheduleInline(admin.TabularInline):
    model = BookingSchedule
    extra = 1

class BookingParticipantInline(admin.TabularInline):
    model = BookingParticipant
    extra = 0

@admin.register(BookingResource)
class BookingResourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'club', 'resource_type', 'requires_training', 'is_active')
    list_filter = ('club', 'resource_type', 'is_active', 'requires_training')
    search_fields = ('name', 'description')
    inlines = [BookingScheduleInline]

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'resource', 'start_time', 'status', 'created_at')
    list_filter = ('status', 'resource__club', 'start_time')
    search_fields = ('user__email', 'user__first_name', 'resource__name')
    inlines = [BookingParticipantInline]

@admin.register(ResourceQualification)
class ResourceQualificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'resource', 'granted_by', 'granted_at')
    search_fields = ('user__email', 'resource__name')