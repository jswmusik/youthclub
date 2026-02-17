"""
Django admin interface for audit logs.

Provides read-only access to audit logs for administrators.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from .models import AuditLog, AuditLogArchive


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Admin interface for audit logs (read-only)"""
    
    list_display = [
        'timestamp',
        'user_link',
        'action_colored',
        'model_name',
        'object_repr_short',
        'ip_address',
        'endpoint_short',
    ]
    
    list_filter = [
        'action',
        'model_name',
        'timestamp',
    ]
    
    search_fields = [
        'user__email',
        'user__first_name',
        'user__last_name',
        'admin_user__email',
        'object_repr',
        'ip_address',
        'endpoint',
    ]
    
    readonly_fields = [
        'user',
        'admin_user',
        'action',
        'model_name',
        'object_id',
        'object_repr',
        'changes_formatted',
        'reason',
        'ip_address',
        'user_agent',
        'endpoint',
        'method',
        'timestamp',
    ]
    
    date_hierarchy = 'timestamp'
    
    ordering = ['-timestamp']
    
    # Disable add/edit/delete
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
    
    def user_link(self, obj):
        """Display user as clickable link"""
        if obj.user:
            url = f"/admin/users/user/{obj.user.pk}/change/"
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return '-'
    user_link.short_description = _('User')
    
    def action_colored(self, obj):
        """Display action with color coding"""
        colors = {
            'CREATE': 'green',
            'READ': 'blue',
            'UPDATE': 'orange',
            'DELETE': 'red',
            'EXPORT': 'purple',
            'LOGIN': 'green',
            'LOGOUT': 'gray',
            'LOGIN_FAILED': 'red',
        }
        color = colors.get(obj.action, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_action_display()
        )
    action_colored.short_description = _('Action')
    
    def object_repr_short(self, obj):
        """Display shortened object representation"""
        if obj.object_repr:
            return obj.object_repr[:50] + '...' if len(obj.object_repr) > 50 else obj.object_repr
        return '-'
    object_repr_short.short_description = _('Object')
    
    def endpoint_short(self, obj):
        """Display shortened endpoint"""
        if obj.endpoint:
            return obj.endpoint[:40] + '...' if len(obj.endpoint) > 40 else obj.endpoint
        return '-'
    endpoint_short.short_description = _('Endpoint')
    
    def changes_formatted(self, obj):
        """Display changes in a formatted way"""
        if not obj.changes:
            return '-'
        
        html = '<table style="border-collapse: collapse;">'
        for field, values in obj.changes.items():
            before = values.get('before', '-')
            after = values.get('after', '-')
            html += f'''
                <tr>
                    <td style="padding: 5px; font-weight: bold;">{field}:</td>
                    <td style="padding: 5px; color: red;">{before}</td>
                    <td style="padding: 5px;">→</td>
                    <td style="padding: 5px; color: green;">{after}</td>
                </tr>
            '''
        html += '</table>'
        return format_html(html)
    changes_formatted.short_description = _('Changes')
    
    fieldsets = (
        (_('Who'), {
            'fields': ('user', 'admin_user', 'ip_address', 'user_agent')
        }),
        (_('What'), {
            'fields': ('action', 'model_name', 'object_id', 'object_repr', 'changes_formatted', 'reason')
        }),
        (_('Context'), {
            'fields': ('endpoint', 'method', 'timestamp')
        }),
    )


@admin.register(AuditLogArchive)
class AuditLogArchiveAdmin(admin.ModelAdmin):
    """Admin interface for archived audit logs (read-only)"""
    
    list_display = [
        'timestamp',
        'user_email',
        'action',
        'model_name',
        'archived_at',
    ]
    
    list_filter = [
        'action',
        'model_name',
        'archived_at',
    ]
    
    search_fields = [
        'user_email',
        'object_repr',
        'ip_address',
    ]
    
    readonly_fields = [
        'original_id',
        'user_id',
        'user_email',
        'admin_user_id',
        'action',
        'model_name',
        'object_id',
        'object_repr',
        'changes',
        'reason',
        'ip_address',
        'timestamp',
        'archived_at',
    ]
    
    date_hierarchy = 'timestamp'
    
    ordering = ['-timestamp']
    
    # Disable add/edit/delete
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Allow deletion of very old archives
        return request.user.is_superuser


