# backend/notifications/admin.py
from django.contrib import admin
from .models import Notification, NotificationTemplate, NotificationTemplateTranslation


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'recipient', 'category', 'is_read', 'created_at')
    list_filter = ('category', 'is_read', 'created_at')
    search_fields = ('title', 'recipient__email')


class NotificationTemplateTranslationInline(admin.TabularInline):
    model = NotificationTemplateTranslation
    extra = 1
    readonly_fields = ['updated_at']


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'category', 'is_active', 'translation_count', 'updated_at']
    list_filter = ['is_active', 'type', 'category']
    search_fields = ['name', 'description']
    inlines = [NotificationTemplateTranslationInline]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        (None, {
            'fields': ('type', 'name', 'description', 'category', 'is_active')
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
