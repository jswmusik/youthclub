from django.contrib import admin
from .models import EmailTemplate, EmailTemplateTranslation, EmailLog


class EmailTemplateTranslationInline(admin.TabularInline):
    model = EmailTemplateTranslation
    extra = 1
    fields = ['language', 'subject', 'body_html', 'body_text', 'updated_at']
    readonly_fields = ['updated_at']


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'is_active', 'translation_count', 'updated_at']
    list_filter = ['is_active', 'type']
    search_fields = ['name', 'description']
    inlines = [EmailTemplateTranslationInline]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        (None, {
            'fields': ('type', 'name', 'description', 'is_active')
        }),
        ('Variables', {
            'fields': ('available_variables',),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def translation_count(self, obj):
        return obj.translations.count()
    translation_count.short_description = 'Translations'


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ['recipient_email', 'template_type', 'subject', 'status', 'language', 'sent_at', 'created_at']
    list_filter = ['status', 'template_type', 'language', 'created_at']
    search_fields = ['recipient_email', 'subject']
    readonly_fields = [
        'recipient', 'recipient_email', 'template', 'template_type',
        'subject', 'body_preview', 'language', 'status', 'error_message',
        'context_data', 'sent_at', 'created_at'
    ]
    
    def has_add_permission(self, request):
        return False  # Logs are created programmatically only
    
    def has_change_permission(self, request, obj=None):
        return False  # Logs are read-only
