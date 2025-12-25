# backend/marketing/serializers.py
from rest_framework import serializers
from .models import SiteSEOSettings, Testimonial, Customer


class SiteSEOSettingsSerializer(serializers.ModelSerializer):
    """Serializer for public SEO and hero settings"""
    class Meta:
        model = SiteSEOSettings
        fields = [
            'id',
            # SEO fields
            'page_title', 'meta_description', 'keywords',
            # Hero fields
            'hero_title', 'hero_subtitle', 'hero_cta_text', 'hero_background',
            # Open Graph
            'og_title', 'og_description', 'og_image'
        ]


class SiteSEOSettingsAdminSerializer(serializers.ModelSerializer):
    """Admin serializer with all fields for editing"""
    class Meta:
        model = SiteSEOSettings
        fields = '__all__'


class TestimonialSerializer(serializers.ModelSerializer):
    """Serializer for public testimonials"""
    class Meta:
        model = Testimonial
        fields = [
            'id', 'author_name', 'author_role', 'author_avatar',
            'quote', 'rating', 'is_active', 'created_at'
        ]
        read_only_fields = ['created_at']


class TestimonialAdminSerializer(serializers.ModelSerializer):
    """Admin serializer with all fields"""
    class Meta:
        model = Testimonial
        fields = '__all__'
        read_only_fields = ['created_at']


class CustomerSerializer(serializers.ModelSerializer):
    """Serializer for public customer logos"""
    class Meta:
        model = Customer
        fields = ['id', 'name', 'logo', 'website_url', 'display_order']


class CustomerAdminSerializer(serializers.ModelSerializer):
    """Admin serializer with all fields for managing customers"""
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'logo', 'website_url', 
            'is_active', 'display_order', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
