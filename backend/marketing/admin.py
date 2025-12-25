# backend/marketing/admin.py
from django.contrib import admin
from .models import SiteSEOSettings, Testimonial


@admin.register(SiteSEOSettings)
class SiteSEOSettingsAdmin(admin.ModelAdmin):
    """
    Admin for SEO settings - singleton model
    """
    list_display = ['page_title', 'og_title']
    fieldsets = (
        ('Page SEO', {
            'fields': ('page_title', 'meta_description', 'keywords')
        }),
        ('Open Graph / Social', {
            'fields': ('og_title', 'og_description', 'og_image'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        # Only allow adding if no instance exists
        return not SiteSEOSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of singleton
        return False


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    """
    Admin for testimonials
    """
    list_display = ['author_name', 'author_role', 'rating', 'is_active', 'created_at']
    list_filter = ['is_active', 'rating', 'created_at']
    search_fields = ['author_name', 'quote']
    list_editable = ['is_active']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Author', {
            'fields': ('author_name', 'author_role')
        }),
        ('Content', {
            'fields': ('quote', 'rating')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )
