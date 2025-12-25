from django.contrib import admin
from .models import Page, MenuItem, FeatureShowcase, CookieConsent

@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'is_published', 'updated_at')
    prepopulated_fields = {'slug': ('title',)}
    search_fields = ('title', 'content')

@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ('label', 'location', 'order', 'page')
    list_filter = ('location',)
    ordering = ('location', 'order')

@admin.register(FeatureShowcase)
class FeatureShowcaseAdmin(admin.ModelAdmin):
    list_display = ('title', 'layout', 'order', 'is_active')
    list_editable = ('order', 'is_active')

admin.site.register(CookieConsent)