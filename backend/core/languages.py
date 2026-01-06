# backend/core/languages.py
"""
Shared language configuration for the entire platform.
Used by CMS, Marketing, SEO, and other apps that need multi-language support.
"""

from django.db import models

# Language choices matching frontend i18n/config.ts
LANGUAGE_CHOICES = [
    ('sv', 'Svenska'),
    ('en', 'English'),
    ('da', 'Dansk'),
    ('nb', 'Norsk'),
    ('fi', 'Suomi'),
    ('ar', 'العربية'),
    ('so', 'Soomaali'),
    ('prs', 'دری'),
]

# Default language for the platform
DEFAULT_LANGUAGE = 'sv'

# Languages dict for quick lookup
LANGUAGES_DICT = dict(LANGUAGE_CHOICES)

# Country to language mapping (for SEO locations)
COUNTRY_CHOICES = [
    ('SE', 'Sweden'),
    ('DK', 'Denmark'),
    ('NO', 'Norway'),
    ('FI', 'Finland'),
]

# Map countries to their primary language
COUNTRY_TO_LANGUAGE = {
    'SE': 'sv',
    'DK': 'da',
    'NO': 'nb',
    'FI': 'fi',
}


def get_language_display(language_code):
    """Get the display name for a language code."""
    return LANGUAGES_DICT.get(language_code, language_code)


def is_valid_language(language_code):
    """Check if a language code is valid."""
    return language_code in LANGUAGES_DICT


def get_language_from_request(request, default=DEFAULT_LANGUAGE):
    """
    Extract language from request headers.
    Checks Accept-Language header and validates against supported languages.
    """
    accept_language = request.headers.get('Accept-Language', '')
    
    # Parse the first language from Accept-Language header
    if accept_language:
        # Handle formats like "da-DK,da;q=0.9,en;q=0.8"
        primary = accept_language.split(',')[0].split(';')[0].strip()
        # Get the language code (first 2 chars)
        lang_code = primary[:2].lower()
        
        if is_valid_language(lang_code):
            return lang_code
    
    return default

