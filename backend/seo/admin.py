# backend/seo/admin.py
"""
Django Admin configuration for SEO app.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone

from .models import (
    Keyword,
    SwedishLocation,
    LocalLandingPage,
    SEOArticle,
    InternalLink,
    SEOCampaign,
)


# =============================================================================
# KEYWORD ADMIN
# =============================================================================

@admin.register(Keyword)
class KeywordAdmin(admin.ModelAdmin):
    list_display = [
        'keyword',
        'search_volume',
        'difficulty_badge',
        'intent',
        'target_audience',
        'current_ranking',
        'status',
        'source',
    ]
    list_filter = ['status', 'intent', 'target_audience', 'source']
    search_fields = ['keyword', 'notes']
    ordering = ['-search_volume', 'keyword']
    readonly_fields = ['slug', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Keyword', {
            'fields': ('keyword', 'slug', 'status')
        }),
        ('SEO Metrics', {
            'fields': ('search_volume', 'difficulty', 'cpc')
        }),
        ('Classification', {
            'fields': ('intent', 'target_audience')
        }),
        ('Ranking', {
            'fields': ('current_ranking', 'best_ranking', 'last_rank_check')
        }),
        ('Source', {
            'fields': ('source', 'external_id'),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def difficulty_badge(self, obj):
        if obj.difficulty is None:
            return '-'
        if obj.difficulty < 30:
            color = '#22c55e'  # Green
            label = 'Easy'
        elif obj.difficulty < 60:
            color = '#f59e0b'  # Yellow
            label = 'Medium'
        else:
            color = '#ef4444'  # Red
            label = 'Hard'
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 4px;">{} ({})</span>',
            color, obj.difficulty, label
        )
    difficulty_badge.short_description = 'Difficulty'


# =============================================================================
# SWEDISH LOCATION ADMIN
# =============================================================================

@admin.register(SwedishLocation)
class SwedishLocationAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'location_type',
        'region',
        'population_formatted',
        'is_customer_badge',
        'priority',
    ]
    list_filter = ['location_type', 'region']
    search_fields = ['name', 'slug', 'scb_code']
    ordering = ['-population', 'name']
    readonly_fields = ['slug', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Location', {
            'fields': ('name', 'name_genitive', 'slug', 'location_type')
        }),
        ('Geography', {
            'fields': ('latitude', 'longitude', 'population', 'region', 'region_code')
        }),
        ('Official Codes', {
            'fields': ('scb_code',),
            'classes': ('collapse',)
        }),
        ('Platform Link', {
            'fields': ('linked_municipality', 'priority')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def population_formatted(self, obj):
        if obj.population:
            return f'{obj.population:,}'
        return '-'
    population_formatted.short_description = 'Population'
    
    def is_customer_badge(self, obj):
        if obj.linked_municipality:
            return format_html(
                '<span style="background: #22c55e; color: white; padding: 3px 8px; border-radius: 4px;">✓ Active</span>'
            )
        return format_html(
            '<span style="background: #6b7280; color: white; padding: 3px 8px; border-radius: 4px;">Not Active</span>'
        )
    is_customer_badge.short_description = 'Customer'


# =============================================================================
# LOCAL LANDING PAGE ADMIN
# =============================================================================

@admin.register(LocalLandingPage)
class LocalLandingPageAdmin(admin.ModelAdmin):
    list_display = [
        'h1_title',
        'location',
        'page_type',
        'target_audience',
        'status_badge',
        'ai_generated_at',
        'published_at',
    ]
    list_filter = ['status', 'page_type', 'target_audience', 'location__region']
    search_fields = ['h1_title', 'title', 'location__name', 'slug']
    ordering = ['-created_at']
    readonly_fields = [
        'slug', 'ai_generated_at', 'ai_model_used', 'ai_persona_used',
        'generation_prompt_hash', 'created_at', 'updated_at'
    ]
    autocomplete_fields = ['location', 'primary_keyword', 'published_by']
    filter_horizontal = ['secondary_keywords']
    
    fieldsets = (
        ('Targeting', {
            'fields': ('location', 'page_type', 'target_audience', 'slug')
        }),
        ('Keywords', {
            'fields': ('primary_keyword', 'secondary_keywords')
        }),
        ('SEO Meta', {
            'fields': ('title', 'meta_description', 'og_title', 'og_description', 'og_image')
        }),
        ('Content', {
            'fields': ('h1_title', 'hero_tagline', 'intro_content', 'main_content', 'cta_content')
        }),
        ('Dynamic Content Settings', {
            'fields': (
                'show_nearby_clubs', 'show_nearby_events', 
                'show_platform_stats', 'show_testimonials', 'nearby_radius_km'
            )
        }),
        ('Indexing', {
            'fields': ('canonical_url', 'noindex'),
            'classes': ('collapse',)
        }),
        ('Publishing', {
            'fields': ('status', 'published_at', 'published_by')
        }),
        ('AI Generation', {
            'fields': (
                'ai_generated_at', 'ai_model_used', 'ai_persona_used',
                'generation_prompt_hash'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def status_badge(self, obj):
        colors = {
            'DRAFT': '#6b7280',
            'REVIEW': '#f59e0b',
            'APPROVED': '#3b82f6',
            'PUBLISHED': '#22c55e',
            'ARCHIVED': '#ef4444',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 4px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    actions = ['publish_pages', 'unpublish_pages', 'mark_for_review']
    
    def publish_pages(self, request, queryset):
        updated = queryset.filter(status='APPROVED').update(
            status='PUBLISHED',
            published_at=timezone.now(),
            published_by=request.user
        )
        self.message_user(request, f'{updated} pages published.')
    publish_pages.short_description = 'Publish selected approved pages'
    
    def unpublish_pages(self, request, queryset):
        updated = queryset.update(status='DRAFT', published_at=None, published_by=None)
        self.message_user(request, f'{updated} pages unpublished.')
    unpublish_pages.short_description = 'Unpublish selected pages'
    
    def mark_for_review(self, request, queryset):
        updated = queryset.filter(status='DRAFT').update(status='REVIEW')
        self.message_user(request, f'{updated} pages marked for review.')
    mark_for_review.short_description = 'Mark drafts for review'


# =============================================================================
# SEO ARTICLE ADMIN
# =============================================================================

@admin.register(SEOArticle)
class SEOArticleAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'target_keyword',
        'target_audience',
        'status_badge',
        'published_at',
    ]
    list_filter = ['status', 'target_audience', 'schema_type']
    search_fields = ['title', 'h1_title', 'slug', 'content']
    ordering = ['-created_at']
    readonly_fields = [
        'slug', 'ai_draft', 'ai_model_used', 'ai_persona_used',
        'created_at', 'updated_at'
    ]
    autocomplete_fields = ['target_keyword', 'published_by']
    filter_horizontal = ['secondary_keywords', 'related_articles', 'related_local_pages']
    
    fieldsets = (
        ('Targeting', {
            'fields': ('target_keyword', 'secondary_keywords', 'target_audience', 'slug')
        }),
        ('SEO Meta', {
            'fields': ('title', 'meta_description', 'og_title', 'og_description')
        }),
        ('Content', {
            'fields': ('h1_title', 'excerpt', 'content', 'outline')
        }),
        ('Media', {
            'fields': ('featured_image', 'featured_image_alt')
        }),
        ('Internal Links', {
            'fields': ('related_articles', 'related_local_pages')
        }),
        ('Schema', {
            'fields': ('schema_type',),
            'classes': ('collapse',)
        }),
        ('Publishing', {
            'fields': ('status', 'published_at', 'published_by')
        }),
        ('Author Display', {
            'fields': ('author_name', 'author_title'),
            'classes': ('collapse',)
        }),
        ('AI Generation', {
            'fields': ('ai_draft', 'ai_model_used', 'ai_persona_used'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def status_badge(self, obj):
        colors = {
            'IDEA': '#6b7280',
            'OUTLINE': '#8b5cf6',
            'DRAFTING': '#f59e0b',
            'REVIEW': '#3b82f6',
            'APPROVED': '#06b6d4',
            'PUBLISHED': '#22c55e',
            'ARCHIVED': '#ef4444',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 4px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'


# =============================================================================
# INTERNAL LINK ADMIN
# =============================================================================

@admin.register(InternalLink)
class InternalLinkAdmin(admin.ModelAdmin):
    list_display = [
        'anchor_text',
        'source_url_short',
        'target_url_short',
        'link_type',
        'link_strength',
        'is_auto_generated',
        'is_active',
    ]
    list_filter = ['link_type', 'is_auto_generated', 'is_active']
    search_fields = ['source_url', 'target_url', 'anchor_text']
    ordering = ['-link_strength', '-created_at']
    
    def source_url_short(self, obj):
        return obj.source_url[:50] + '...' if len(obj.source_url) > 50 else obj.source_url
    source_url_short.short_description = 'Source'
    
    def target_url_short(self, obj):
        return obj.target_url[:50] + '...' if len(obj.target_url) > 50 else obj.target_url
    target_url_short.short_description = 'Target'


# =============================================================================
# SEO CAMPAIGN ADMIN
# =============================================================================

@admin.register(SEOCampaign)
class SEOCampaignAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'target_audience',
        'status_badge',
        'start_date',
        'end_date',
        'content_count',
    ]
    list_filter = ['status', 'target_audience']
    search_fields = ['name', 'description']
    ordering = ['-created_at']
    readonly_fields = ['slug', 'created_at', 'updated_at']
    filter_horizontal = ['keywords', 'local_pages', 'articles']
    
    fieldsets = (
        ('Campaign', {
            'fields': ('name', 'slug', 'description', 'target_audience')
        }),
        ('Status & Timing', {
            'fields': ('status', 'start_date', 'end_date')
        }),
        ('Content', {
            'fields': ('keywords', 'local_pages', 'articles')
        }),
        ('Goals', {
            'fields': ('target_traffic_increase', 'target_keywords_ranked'),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def status_badge(self, obj):
        colors = {
            'PLANNING': '#6b7280',
            'ACTIVE': '#22c55e',
            'PAUSED': '#f59e0b',
            'COMPLETED': '#3b82f6',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 4px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def content_count(self, obj):
        keywords = obj.keywords.count()
        pages = obj.local_pages.count()
        articles = obj.articles.count()
        return f'{keywords} KW / {pages} Pages / {articles} Articles'
    content_count.short_description = 'Content'
