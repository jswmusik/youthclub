from django.contrib import admin
from .models import CustomFieldDefinition, CustomFieldValue

@admin.register(CustomFieldDefinition)
class CustomFieldDefinitionAdmin(admin.ModelAdmin):
    list_display = ('name', 'field_type', 'owner_role', 'context', 'is_published', 'created_at')
    list_filter = ('owner_role', 'context', 'field_type', 'is_published')
    search_fields = ('name', 'help_text')
    ordering = ['-created_at']

@admin.register(CustomFieldValue)
class CustomFieldValueAdmin(admin.ModelAdmin):
    list_display = ('user', 'field', 'value', 'updated_at')
    search_fields = ('user__email', 'field__name', 'value')
    list_filter = ('field',)