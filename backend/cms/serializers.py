from rest_framework import serializers
from .models import Page, MenuItem, FeatureShowcase, CookieConsent, PageFeature, PricingPageContent, PricingFAQ, ContactPageContent, ContactSubmission


class FeatureShowcaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureShowcase
        fields = '__all__'


class PageFeatureSerializer(serializers.ModelSerializer):
    """Serializer for the through model, includes full feature data."""
    feature = FeatureShowcaseSerializer(read_only=True)
    
    class Meta:
        model = PageFeature
        fields = ['id', 'feature', 'order']


class PageSerializer(serializers.ModelSerializer):
    # Include full feature data when reading, ordered by PageFeature.order
    features_data = serializers.SerializerMethodField()

    class Meta:
        model = Page
        fields = [
            'id', 'title', 'slug', 'page_type', 'content', 'excerpt', 'hero_tagline',
            'hero_image', 'show_hero', 'features_data',
            # Table of contents
            'table_of_contents', 'show_toc',
            # Author info
            'author_name', 'author_title', 'author_image',
            # SEO
            'meta_title', 'meta_description', 'og_title', 'og_image', 
            'ai_description', 'is_published', 'created_at', 'updated_at'
        ]
        lookup_field = 'slug'
        extra_kwargs = {
            'slug': {'required': False},
            # Make optional fields truly optional
            'table_of_contents': {'required': False, 'allow_null': True},
            'excerpt': {'required': False, 'allow_blank': True},
            'hero_tagline': {'required': False, 'allow_blank': True},
            'author_name': {'required': False, 'allow_blank': True},
            'author_title': {'required': False, 'allow_blank': True},
            'author_image': {'required': False, 'allow_null': True},
            'hero_image': {'required': False, 'allow_null': True},
            'og_image': {'required': False, 'allow_null': True},
        }

    def validate_slug(self, value):
        """Allow the same slug when updating the same instance."""
        if self.instance and self.instance.slug == value:
            return value
        # Check if slug exists for other pages
        if Page.objects.filter(slug=value).exists():
            raise serializers.ValidationError("A page with this slug already exists.")
        return value

    def get_features_data(self, obj):
        """Get features ordered by PageFeature.order."""
        page_features = PageFeature.objects.filter(page=obj).order_by('order').select_related('feature')
        features = [pf.feature for pf in page_features]
        return FeatureShowcaseSerializer(features, many=True).data


class MenuItemSerializer(serializers.ModelSerializer):
    # Optional: Nested serializer if you want full page details in the menu
    page_slug = serializers.CharField(source='page.slug', read_only=True)

    class Meta:
        model = MenuItem
        fields = '__all__'


class CookieConsentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CookieConsent
        fields = '__all__'


class PricingFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingFAQ
        fields = ['id', 'question', 'answer', 'order', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class PricingPageContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingPageContent
        fields = [
            'id',
            # Hero Section
            'hero_title', 'hero_subtitle', 'hero_tagline',
            # CTA Section
            'cta_title', 'cta_description', 'cta_button_text', 'cta_button_url',
            # Trust Section
            'trust_section_title', 'trust_section_description',
            # Trust Stats
            'trust_stat_municipalities', 'trust_stat_active_users', 
            'trust_stat_satisfaction', 'trust_stat_uptime',
            # SEO Fields
            'meta_title', 'meta_description', 'og_title', 'og_description', 
            'og_image', 'ai_description',
            # Timestamps
            'updated_at'
        ]
        read_only_fields = ['updated_at']


class ContactPageContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactPageContent
        fields = [
            'id',
            # Hero Section
            'hero_title', 'hero_subtitle',
            # Contact Info
            'contact_email', 'response_time_text',
            # Form Section
            'form_title', 'form_description',
            # Success Message
            'success_title', 'success_message',
            # Additional Info
            'info_title', 'info_content',
            # SEO Fields
            'meta_title', 'meta_description',
            # Timestamps
            'updated_at'
        ]
        read_only_fields = ['updated_at']


class ContactSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactSubmission
        fields = [
            'id', 'name', 'email', 'organization', 'subject', 'message',
            'is_read', 'is_replied', 'replied_at', 'created_at'
        ]
        read_only_fields = ['is_read', 'is_replied', 'replied_at', 'created_at']


class ContactSubmissionCreateSerializer(serializers.ModelSerializer):
    """Serializer for public contact form submissions."""
    class Meta:
        model = ContactSubmission
        fields = ['name', 'email', 'organization', 'subject', 'message']
