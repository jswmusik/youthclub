# backend/marketing/serializers.py
from rest_framework import serializers
from .models import SiteSEOSettings, Testimonial


class SiteSEOSettingsSerializer(serializers.ModelSerializer):
    """Serializer for public SEO settings"""
    class Meta:
        model = SiteSEOSettings
        fields = [
            'page_title', 'meta_description', 'keywords',
            'og_title', 'og_description', 'og_image'
        ]


class TestimonialSerializer(serializers.ModelSerializer):
    """Serializer for testimonials"""
    class Meta:
        model = Testimonial
        fields = [
            'id', 'author_name', 'author_role', 'quote', 
            'rating', 'is_active', 'created_at'
        ]
        read_only_fields = ['created_at']


class TestimonialAdminSerializer(serializers.ModelSerializer):
    """Admin serializer with all fields"""
    class Meta:
        model = Testimonial
        fields = '__all__'
        read_only_fields = ['created_at']

