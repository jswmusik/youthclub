# backend/marketing/serializers.py
import re
import html
from rest_framework import serializers
from django.core.validators import EmailValidator
from django.core.exceptions import ValidationError
from .models import SiteSEOSettings, Testimonial, Customer, NewsletterSubscriber


class SiteSEOSettingsSerializer(serializers.ModelSerializer):
    """Serializer for public SEO and hero settings"""
    class Meta:
        model = SiteSEOSettings
        fields = [
            'id', 'language',
            # SEO fields
            'page_title', 'meta_description', 'keywords',
            # Hero fields
            'hero_title', 'hero_subtitle', 'hero_cta_text', 'hero_background', 'hero_video',
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
            'id', 'language', 'author_name', 'author_role', 'author_avatar',
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
        fields = ['id', 'language', 'name', 'logo', 'website_url', 'display_order']


class CustomerAdminSerializer(serializers.ModelSerializer):
    """Admin serializer with all fields for managing customers"""
    class Meta:
        model = Customer
        fields = [
            'id', 'language', 'name', 'logo', 'website_url', 
            'is_active', 'display_order', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


# List of common disposable email domains to block
DISPOSABLE_EMAIL_DOMAINS = {
    'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
    '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com',
    'getnada.com', 'maildrop.cc', 'yopmail.com', 'sharklasers.com',
    'guerrillamail.info', 'grr.la', 'spam4.me', 'tempail.com'
}


def sanitize_text(text: str) -> str:
    """Sanitize text input to prevent XSS and injection attacks"""
    if not text:
        return ''
    # Strip HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Escape HTML entities
    text = html.escape(text)
    # Remove potentially dangerous characters
    text = re.sub(r'[<>"\';(){}]', '', text)
    # Normalize whitespace
    text = ' '.join(text.split())
    return text.strip()


def validate_email_not_disposable(email: str):
    """Check if email is from a disposable email provider"""
    domain = email.lower().split('@')[-1]
    if domain in DISPOSABLE_EMAIL_DOMAINS:
        raise ValidationError('Disposable email addresses are not allowed.')


class NewsletterSubscribeSerializer(serializers.Serializer):
    """
    Public serializer for newsletter subscription.
    Includes extensive validation and sanitization for security.
    """
    email = serializers.EmailField(max_length=254)
    first_name = serializers.CharField(max_length=100, min_length=1)
    last_name = serializers.CharField(max_length=100, min_length=1)
    consent_given = serializers.BooleanField()
    # Honeypot field - should always be empty (bots fill it)
    website = serializers.CharField(required=False, allow_blank=True, max_length=100)
    
    def validate_email(self, value):
        """Validate and normalize email"""
        value = value.lower().strip()
        
        # Standard email validation
        validator = EmailValidator()
        try:
            validator(value)
        except ValidationError:
            raise serializers.ValidationError('Enter a valid email address.')
        
        # Check for disposable emails
        validate_email_not_disposable(value)
        
        # Check if already subscribed
        if NewsletterSubscriber.objects.filter(email=value, is_active=True).exists():
            raise serializers.ValidationError('This email is already subscribed.')
        
        return value
    
    def validate_first_name(self, value):
        """Sanitize first name"""
        value = sanitize_text(value)
        if len(value) < 1:
            raise serializers.ValidationError('First name is required.')
        if len(value) > 100:
            raise serializers.ValidationError('First name is too long.')
        # Check for suspicious patterns (SQL injection attempts, etc.)
        if re.search(r'(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|--|;)', value, re.IGNORECASE):
            raise serializers.ValidationError('Invalid characters in first name.')
        return value
    
    def validate_last_name(self, value):
        """Sanitize last name"""
        value = sanitize_text(value)
        if len(value) < 1:
            raise serializers.ValidationError('Last name is required.')
        if len(value) > 100:
            raise serializers.ValidationError('Last name is too long.')
        # Check for suspicious patterns
        if re.search(r'(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|--|;)', value, re.IGNORECASE):
            raise serializers.ValidationError('Invalid characters in last name.')
        return value
    
    def validate_consent_given(self, value):
        """Ensure consent is given"""
        if not value:
            raise serializers.ValidationError('You must agree to receive our newsletter.')
        return value
    
    def validate_website(self, value):
        """Honeypot validation - this field should always be empty"""
        if value:
            # If honeypot is filled, it's likely a bot - we'll handle this silently
            raise serializers.ValidationError('honeypot_triggered')
        return value
    
    def create(self, validated_data):
        """Create newsletter subscriber"""
        # Remove honeypot field before creating
        validated_data.pop('website', None)
        
        return NewsletterSubscriber.objects.create(**validated_data)


class NewsletterSubscriberSerializer(serializers.ModelSerializer):
    """Serializer for listing newsletter subscribers (admin)"""
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = NewsletterSubscriber
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'consent_given', 'consent_date', 'is_active',
            'created_at', 'updated_at', 'source', 'unsubscribed_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'consent_date', 'consent_ip']


class NewsletterSubscriberAdminSerializer(serializers.ModelSerializer):
    """Full admin serializer with all fields including audit data"""
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = NewsletterSubscriber
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class NewsletterExportSerializer(serializers.ModelSerializer):
    """Serializer for CSV export (Mailchimp compatible)"""
    class Meta:
        model = NewsletterSubscriber
        fields = ['email', 'first_name', 'last_name', 'created_at', 'is_active']
