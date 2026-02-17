"""
Django admin interface for GDPR data exports and consent management.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import DataExportRequest, DataExportLog
from .consent_models import ConsentType, UserConsent, ConsentLog


class DataExportLogInline(admin.TabularInline):
    """Inline display of export logs"""
    model = DataExportLog
    extra = 0
    can_delete = False
    readonly_fields = ['section', 'record_count', 'status', 'error_message', 'created_at']
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(DataExportRequest)
class DataExportRequestAdmin(admin.ModelAdmin):
    """Admin interface for data export requests"""
    
    list_display = [
        'id',
        'user_link',
        'status_colored',
        'requested_at',
        'completed_at',
        'file_size_mb',
        'is_available',
        'expires_at',
    ]
    
    list_filter = [
        'status',
        'requested_at',
        'completed_at',
    ]
    
    search_fields = [
        'user__email',
        'user__first_name',
        'user__last_name',
        'ip_address',
    ]
    
    readonly_fields = [
        'user',
        'status',
        'requested_at',
        'ip_address',
        'started_at',
        'completed_at',
        'file_path',
        'file_size_display',
        'expires_at',
        'error_message',
        'retry_count',
        'task_id',
        'is_available',
        'is_expired',
        'processing_time_display',
    ]
    
    date_hierarchy = 'requested_at'
    ordering = ['-requested_at']
    inlines = [DataExportLogInline]
    
    # Disable add/edit
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        # Allow deletion of old/expired exports
        return request.user.is_superuser
    
    def user_link(self, obj):
        """Display user as clickable link"""
        url = reverse('admin:users_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = _('User')
    
    def status_colored(self, obj):
        """Display status with color coding"""
        colors = {
            'PENDING': 'gray',
            'PROCESSING': 'blue',
            'COMPLETED': 'green',
            'FAILED': 'red',
            'EXPIRED': 'orange',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_colored.short_description = _('Status')
    
    def file_size_mb(self, obj):
        """Display file size in MB"""
        if obj.file_size:
            return f"{obj.file_size / (1024 * 1024):.2f} MB"
        return '-'
    file_size_mb.short_description = _('File Size')
    
    def file_size_display(self, obj):
        """Display file size with formatting"""
        if not obj.file_size:
            return '-'
        
        size = obj.file_size
        if size < 1024:
            return f"{size} bytes"
        elif size < 1024 * 1024:
            return f"{size / 1024:.2f} KB"
        else:
            return f"{size / (1024 * 1024):.2f} MB"
    file_size_display.short_description = _('File Size')
    
    def processing_time_display(self, obj):
        """Display processing time"""
        time = obj.processing_time
        if time is None:
            return '-'
        
        if time < 60:
            return f"{time:.1f} seconds"
        else:
            return f"{time / 60:.1f} minutes"
    processing_time_display.short_description = _('Processing Time')
    
    fieldsets = (
        (_('Request Details'), {
            'fields': ('user', 'status', 'requested_at', 'ip_address')
        }),
        (_('Processing'), {
            'fields': ('started_at', 'completed_at', 'processing_time_display', 'task_id')
        }),
        (_('Export File'), {
            'fields': ('file_path', 'file_size_display', 'expires_at', 'is_available', 'is_expired')
        }),
        (_('Errors'), {
            'fields': ('error_message', 'retry_count'),
            'classes': ('collapse',)
        }),
    )


@admin.register(DataExportLog)
class DataExportLogAdmin(admin.ModelAdmin):
    """Admin interface for data export logs"""
    
    list_display = [
        'id',
        'export_request_link',
        'section',
        'record_count',
        'status_colored',
        'created_at',
    ]
    
    list_filter = [
        'status',
        'section',
        'created_at',
    ]
    
    search_fields = [
        'export_request__user__email',
        'section',
        'error_message',
    ]
    
    readonly_fields = [
        'export_request',
        'section',
        'record_count',
        'status',
        'error_message',
        'created_at',
    ]
    
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
    
    def export_request_link(self, obj):
        """Display export request as clickable link"""
        url = reverse('admin:gdpr_dataexportrequest_change', args=[obj.export_request.pk])
        return format_html(
            '<a href="{}">Export #{}</a>',
            url,
            obj.export_request.id
        )
    export_request_link.short_description = _('Export Request')
    
    def status_colored(self, obj):
        """Display status with color coding"""
        colors = {
            'SUCCESS': 'green',
            'SKIPPED': 'gray',
            'ERROR': 'red',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.status
        )
    status_colored.short_description = _('Status')


# ============================================================================
# CONSENT MANAGEMENT ADMIN
# ============================================================================


@admin.register(ConsentType)
class ConsentTypeAdmin(admin.ModelAdmin):
    """Admin interface for consent types"""
    
    list_display = [
        'name',
        'code',
        'version',
        'is_required_badge',
        'is_active_badge',
        'display_order',
        'created_at',
    ]
    
    list_filter = [
        'is_required',
        'is_active',
        'created_at',
    ]
    
    search_fields = [
        'name',
        'code',
        'description',
        'consent_text',
    ]
    
    readonly_fields = ['created_at', 'updated_at', 'is_current_version']
    
    ordering = ['display_order', 'name']
    
    fieldsets = (
        (_('Basic Information'), {
            'fields': ('code', 'name', 'description', 'version')
        }),
        (_('Settings'), {
            'fields': ('is_required', 'is_active', 'display_order')
        }),
        (_('Legal'), {
            'fields': ('legal_basis', 'consent_text', 'document_url')
        }),
        (_('Metadata'), {
            'fields': ('created_at', 'updated_at', 'created_by', 'is_current_version'),
            'classes': ('collapse',)
        }),
    )
    
    def is_required_badge(self, obj):
        """Display is_required as badge"""
        if obj.is_required:
            return format_html(
                '<span style="background-color: #dc3545; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">REQUIRED</span>'
            )
        return format_html(
            '<span style="background-color: #6c757d; color: white; padding: 3px 10px; border-radius: 3px;">Optional</span>'
        )
    is_required_badge.short_description = _('Type')
    
    def is_active_badge(self, obj):
        """Display is_active as badge"""
        if obj.is_active:
            return format_html(
                '<span style="background-color: #28a745; color: white; padding: 3px 10px; border-radius: 3px;">Active</span>'
            )
        return format_html(
            '<span style="background-color: #6c757d; color: white; padding: 3px 10px; border-radius: 3px;">Inactive</span>'
        )
    is_active_badge.short_description = _('Status')
    
    def save_model(self, request, obj, form, change):
        """Set created_by on creation"""
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


class ConsentLogInline(admin.TabularInline):
    """Inline display of consent logs"""
    model = ConsentLog
    extra = 0
    can_delete = False
    readonly_fields = ['event_type', 'timestamp', 'ip_address', 'details']
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(UserConsent)
class UserConsentAdmin(admin.ModelAdmin):
    """Admin interface for user consents"""
    
    list_display = [
        'user_link',
        'consent_type_name',
        'version_snapshot',
        'consent_method',
        'status_badge',
        'consented_at',
        'withdrawn_at',
    ]
    
    list_filter = [
        'is_active',
        'consent_method',
        'consent_type',
        'consented_at',
        'withdrawn_at',
    ]
    
    search_fields = [
        'user__email',
        'user__first_name',
        'user__last_name',
        'consent_type__name',
        'consent_type__code',
    ]
    
    readonly_fields = [
        'user',
        'consent_type',
        'consented_at',
        'consent_method',
        'ip_address',
        'user_agent',
        'consent_text_snapshot',
        'version_snapshot',
        'withdrawn_at',
        'withdrawal_reason',
        'withdrawal_ip_address',
        'is_active',
        'is_current_version',
        'needs_update',
    ]
    
    date_hierarchy = 'consented_at'
    ordering = ['-consented_at']
    inlines = [ConsentLogInline]
    
    # Disable add/edit/delete
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Only super admins can delete consent records
        return request.user.is_superuser
    
    def user_link(self, obj):
        """Display user as clickable link"""
        url = reverse('admin:users_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = _('User')
    
    def consent_type_name(self, obj):
        """Display consent type with version"""
        return f"{obj.consent_type.name} (v{obj.version_snapshot})"
    consent_type_name.short_description = _('Consent Type')
    
    def status_badge(self, obj):
        """Display consent status as badge"""
        if obj.is_active:
            if obj.needs_update:
                return format_html(
                    '<span style="background-color: #ffc107; color: black; padding: 3px 10px; border-radius: 3px;">Active (Outdated)</span>'
                )
            return format_html(
                '<span style="background-color: #28a745; color: white; padding: 3px 10px; border-radius: 3px;">Active</span>'
            )
        return format_html(
            '<span style="background-color: #dc3545; color: white; padding: 3px 10px; border-radius: 3px;">Withdrawn</span>'
        )
    status_badge.short_description = _('Status')
    
    fieldsets = (
        (_('Consent Details'), {
            'fields': ('user', 'consent_type', 'consent_method', 'consented_at')
        }),
        (_('Technical Details'), {
            'fields': ('ip_address', 'user_agent')
        }),
        (_('Consent Snapshot'), {
            'fields': ('consent_text_snapshot', 'version_snapshot', 'is_current_version', 'needs_update')
        }),
        (_('Withdrawal'), {
            'fields': ('is_active', 'withdrawn_at', 'withdrawal_reason', 'withdrawal_ip_address'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ConsentLog)
class ConsentLogAdmin(admin.ModelAdmin):
    """Admin interface for consent logs"""
    
    list_display = [
        'user_consent_link',
        'event_type_badge',
        'timestamp',
        'ip_address',
    ]
    
    list_filter = [
        'event_type',
        'timestamp',
    ]
    
    search_fields = [
        'user_consent__user__email',
        'user_consent__consent_type__name',
        'ip_address',
    ]
    
    readonly_fields = [
        'user_consent',
        'event_type',
        'timestamp',
        'ip_address',
        'details',
    ]
    
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
    
    def user_consent_link(self, obj):
        """Display user consent as clickable link"""
        url = reverse('admin:gdpr_userconsent_change', args=[obj.user_consent.pk])
        return format_html(
            '<a href="{}">{} - {}</a>',
            url,
            obj.user_consent.user.email,
            obj.user_consent.consent_type.name
        )
    user_consent_link.short_description = _('User Consent')
    
    def event_type_badge(self, obj):
        """Display event type with color coding"""
        colors = {
            'GIVEN': '#28a745',
            'WITHDRAWN': '#dc3545',
            'UPDATED': '#ffc107',
            'VIEWED': '#17a2b8',
            'REMINDED': '#6c757d',
        }
        color = colors.get(obj.event_type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_event_type_display()
        )
    event_type_badge.short_description = _('Event Type')

