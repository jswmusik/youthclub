from rest_framework import serializers
from .models import Page, MenuItem, FeatureShowcase, CookieConsent, PageFeature


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
