# backend/seo/serializers.py
"""
Serializers for SEO app API endpoints.
"""

from rest_framework import serializers
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
# KEYWORD SERIALIZERS
# =============================================================================

class KeywordSerializer(serializers.ModelSerializer):
    """Full keyword serializer for admin views."""
    
    class Meta:
        model = Keyword
        fields = '__all__'
        read_only_fields = ['slug', 'created_at', 'updated_at']


class KeywordListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for keyword lists."""
    has_content = serializers.BooleanField(read_only=True)
    content_status = serializers.CharField(read_only=True)
    generated_page_slug = serializers.CharField(
        source='generated_page.slug', 
        read_only=True, 
        allow_null=True
    )
    generated_article_slug = serializers.CharField(
        source='generated_article.slug', 
        read_only=True, 
        allow_null=True
    )
    detected_location_name = serializers.CharField(
        source='detected_location.name',
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = Keyword
        fields = [
            'id', 'keyword', 'slug', 'search_volume', 'difficulty',
            'intent', 'target_audience', 'current_ranking', 'status',
            'has_content', 'content_status', 'generated_page_slug',
            'generated_article_slug', 'detected_location_name'
        ]


# =============================================================================
# SWEDISH LOCATION SERIALIZERS
# =============================================================================

class SwedishLocationSerializer(serializers.ModelSerializer):
    """Full location serializer."""
    is_customer = serializers.ReadOnlyField()
    linked_municipality_name = serializers.CharField(
        source='linked_municipality.name', 
        read_only=True,
        default=None
    )
    
    class Meta:
        model = SwedishLocation
        fields = '__all__'
        read_only_fields = ['slug', 'created_at', 'updated_at']


class SwedishLocationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for location lists."""
    is_customer = serializers.ReadOnlyField()
    
    class Meta:
        model = SwedishLocation
        fields = [
            'id', 'name', 'slug', 'location_type', 'region',
            'latitude', 'longitude', 'population', 'is_customer', 'priority'
        ]


# =============================================================================
# LOCAL LANDING PAGE SERIALIZERS
# =============================================================================

class LocalLandingPageSerializer(serializers.ModelSerializer):
    """Full serializer for local landing pages."""
    location_name = serializers.CharField(source='location.name', read_only=True)
    location_region = serializers.CharField(source='location.region', read_only=True)
    primary_keyword_text = serializers.CharField(
        source='primary_keyword.keyword', 
        read_only=True,
        default=None
    )
    published_by_email = serializers.CharField(
        source='published_by.email', 
        read_only=True,
        default=None
    )
    
    class Meta:
        model = LocalLandingPage
        fields = '__all__'
        read_only_fields = [
            'slug', 'ai_generated_at', 'ai_model_used', 'ai_persona_used',
            'generation_prompt_hash', 'created_at', 'updated_at',
            'word_count', 'reading_time_minutes'
        ]


class LocalLandingPageListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for page lists."""
    location_name = serializers.CharField(source='location.name', read_only=True)
    
    class Meta:
        model = LocalLandingPage
        fields = [
            'id', 'slug', 'title', 'h1_title', 'location', 'location_name',
            'page_type', 'target_audience', 'status', 'published_at',
            'ai_generated_at', 'hero_image', 'hero_image_alt'
        ]


class LocalLandingPagePublicSerializer(serializers.ModelSerializer):
    """Serializer for public frontend consumption."""
    location_name = serializers.CharField(source='location.name', read_only=True)
    location_slug = serializers.CharField(source='location.slug', read_only=True)
    location_region = serializers.CharField(source='location.region', read_only=True)
    location_population = serializers.IntegerField(source='location.population', read_only=True)
    location_latitude = serializers.FloatField(source='location.latitude', read_only=True)
    location_longitude = serializers.FloatField(source='location.longitude', read_only=True)
    
    class Meta:
        model = LocalLandingPage
        fields = [
            'id', 'slug', 'title', 'meta_description', 'h1_title', 'hero_tagline',
            'intro_content', 'main_content', 'cta_content',
            # Hero image
            'hero_image', 'hero_image_alt',
            # SEO fields
            'focus_keyphrase', 'canonical_url',
            # Open Graph
            'og_title', 'og_description', 'og_image',
            # Twitter Card
            'twitter_card', 'twitter_title', 'twitter_description', 'twitter_image',
            # FAQ
            'faq_items',
            # Content metrics
            'word_count', 'reading_time_minutes',
            # Location
            'location_name', 'location_slug', 'location_region',
            'location_population', 'location_latitude', 'location_longitude',
            # Display settings
            'show_nearby_clubs', 'show_nearby_events', 
            'show_platform_stats', 'show_testimonials', 'nearby_radius_km',
            # Meta
            'page_type', 'target_audience', 'published_at'
        ]


# =============================================================================
# SEO ARTICLE SERIALIZERS
# =============================================================================

class SEOArticleSerializer(serializers.ModelSerializer):
    """Full serializer for articles."""
    target_keyword_text = serializers.CharField(
        source='target_keyword.keyword', 
        read_only=True,
        default=None
    )
    published_by_email = serializers.CharField(
        source='published_by.email', 
        read_only=True,
        default=None
    )
    
    class Meta:
        model = SEOArticle
        fields = '__all__'
        read_only_fields = [
            'slug', 'ai_draft', 'ai_model_used', 'ai_persona_used',
            'created_at', 'updated_at'
        ]


class SEOArticleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for article lists."""
    target_keyword_text = serializers.CharField(
        source='target_keyword.keyword', 
        read_only=True,
        default=None
    )
    
    class Meta:
        model = SEOArticle
        fields = [
            'id', 'slug', 'title', 'target_keyword', 'target_keyword_text',
            'target_audience', 'status', 'published_at', 'featured_image',
            'featured_image_alt', 'h1_title', 'meta_description', 'excerpt',
            'content', 'ai_draft', 'og_title', 'og_description'
        ]


class SEOArticlePublicSerializer(serializers.ModelSerializer):
    """Serializer for public frontend consumption."""
    
    class Meta:
        model = SEOArticle
        fields = [
            'id', 'slug', 'title', 'meta_description', 'h1_title', 'excerpt',
            'content', 'featured_image', 'featured_image_alt',
            'og_title', 'og_description', 'schema_type',
            'author_name', 'author_title', 'published_at'
        ]


# =============================================================================
# INTERNAL LINK SERIALIZERS
# =============================================================================

class InternalLinkSerializer(serializers.ModelSerializer):
    """Full serializer for internal links."""
    
    class Meta:
        model = InternalLink
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


# =============================================================================
# SEO CAMPAIGN SERIALIZERS
# =============================================================================

class SEOCampaignSerializer(serializers.ModelSerializer):
    """Full serializer for campaigns."""
    keyword_count = serializers.SerializerMethodField()
    page_count = serializers.SerializerMethodField()
    article_count = serializers.SerializerMethodField()
    
    class Meta:
        model = SEOCampaign
        fields = '__all__'
        read_only_fields = ['slug', 'created_at', 'updated_at']
    
    def get_keyword_count(self, obj):
        return obj.keywords.count()
    
    def get_page_count(self, obj):
        return obj.local_pages.count()
    
    def get_article_count(self, obj):
        return obj.articles.count()


class SEOCampaignListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for campaign lists."""
    
    class Meta:
        model = SEOCampaign
        fields = [
            'id', 'name', 'slug', 'target_audience', 'status',
            'start_date', 'end_date'
        ]


# =============================================================================
# CONTENT GENERATION SERIALIZERS
# =============================================================================

class GenerateLocalPageContentSerializer(serializers.Serializer):
    """Input serializer for generating local page content."""
    location_id = serializers.IntegerField()
    keyword_id = serializers.IntegerField(required=False, allow_null=True)
    keyword_text = serializers.CharField(required=False, allow_blank=True)
    page_type = serializers.ChoiceField(
        choices=['EVENTS', 'CLUBS', 'GENERAL'],
        default='GENERAL'
    )
    target_audience = serializers.ChoiceField(
        choices=['YOUTH', 'GUARDIAN', 'MUNICIPALITY', 'GENERAL'],
        default='GENERAL'
    )
    
    def validate(self, data):
        if not data.get('keyword_id') and not data.get('keyword_text'):
            raise serializers.ValidationError(
                "Either keyword_id or keyword_text must be provided"
            )
        return data


class GenerateArticleContentSerializer(serializers.Serializer):
    """Input serializer for generating article content."""
    keyword_id = serializers.IntegerField(required=False, allow_null=True)
    keyword_text = serializers.CharField(required=False, allow_blank=True)
    title_suggestion = serializers.CharField(required=False, allow_blank=True)
    target_audience = serializers.ChoiceField(
        choices=['YOUTH', 'GUARDIAN', 'MUNICIPALITY', 'GENERAL'],
        default='GENERAL'
    )
    outline = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    
    def validate(self, data):
        if not data.get('keyword_id') and not data.get('keyword_text'):
            raise serializers.ValidationError(
                "Either keyword_id or keyword_text must be provided"
            )
        return data


class PublishPageSerializer(serializers.Serializer):
    """Input serializer for publishing pages."""
    page_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )


# =============================================================================
# DASHBOARD/STATS SERIALIZERS
# =============================================================================

class SEODashboardStatsSerializer(serializers.Serializer):
    """Stats for the SEO dashboard."""
    total_keywords = serializers.IntegerField()
    active_keywords = serializers.IntegerField()
    total_local_pages = serializers.IntegerField()
    published_local_pages = serializers.IntegerField()
    draft_local_pages = serializers.IntegerField()
    total_articles = serializers.IntegerField()
    published_articles = serializers.IntegerField()
    locations_covered = serializers.IntegerField()
    locations_with_customers = serializers.IntegerField()


class NearbyContentSerializer(serializers.Serializer):
    """Serializer for nearby clubs/events data."""
    nearby_clubs = serializers.ListField(child=serializers.DictField())
    nearby_events = serializers.ListField(child=serializers.DictField())
    platform_stats = serializers.DictField()

