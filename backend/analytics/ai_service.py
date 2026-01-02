"""
AI Report Generation Service

Supports both Anthropic Claude and OpenAI GPT-4 for generating
analytics reports based on dashboard data.
"""

import os
import json
import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from django.conf import settings

logger = logging.getLogger(__name__)


# =============================================================================
# AI PROVIDER CONFIGURATION
# =============================================================================

# Model configurations
AI_CONFIG = {
    'anthropic': {
        'model': 'claude-sonnet-4-20250514',
        'max_tokens': 4096,
    },
    'openai': {
        'model': 'gpt-4-turbo-preview',
        'max_tokens': 4096,
    }
}


def get_anthropic_api_key():
    """Get Anthropic API key at runtime (after .env is loaded)."""
    return os.environ.get('ANTHROPIC_API_KEY', '')


def get_openai_api_key():
    """Get OpenAI API key at runtime (after .env is loaded)."""
    return os.environ.get('OPENAI_API_KEY', '')


def get_default_ai_provider():
    """Get default AI provider at runtime."""
    return os.environ.get('AI_PROVIDER', 'anthropic')


# =============================================================================
# BASE AI PROVIDER CLASS
# =============================================================================

class AIProvider(ABC):
    """Abstract base class for AI providers."""
    
    @abstractmethod
    def generate_report(self, system_prompt: str, user_prompt: str) -> str:
        """Generate a report using the AI model."""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if this provider is configured and available."""
        pass


# =============================================================================
# ANTHROPIC CLAUDE PROVIDER
# =============================================================================

class AnthropicProvider(AIProvider):
    """Anthropic Claude API provider."""
    
    def __init__(self):
        self.api_key = get_anthropic_api_key()
        self.model = AI_CONFIG['anthropic']['model']
        self.max_tokens = AI_CONFIG['anthropic']['max_tokens']
    
    def is_available(self) -> bool:
        # Re-check at runtime in case env was loaded after init
        return bool(get_anthropic_api_key())
    
    def generate_report(self, system_prompt: str, user_prompt: str) -> str:
        if not self.is_available():
            raise ValueError("Anthropic API key not configured")
        
        try:
            import anthropic
            
            client = anthropic.Anthropic(api_key=self.api_key)
            
            message = client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            # Extract text from response
            return message.content[0].text
            
        except ImportError:
            raise ImportError("anthropic package not installed. Run: pip install anthropic")
        except Exception as e:
            logger.error(f"Anthropic API error: {str(e)}")
            raise


# =============================================================================
# OPENAI GPT PROVIDER
# =============================================================================

class OpenAIProvider(AIProvider):
    """OpenAI GPT API provider."""
    
    def __init__(self):
        self.api_key = get_openai_api_key()
        self.model = AI_CONFIG['openai']['model']
        self.max_tokens = AI_CONFIG['openai']['max_tokens']
    
    def is_available(self) -> bool:
        # Re-check at runtime in case env was loaded after init
        return bool(get_openai_api_key())
    
    def generate_report(self, system_prompt: str, user_prompt: str) -> str:
        if not self.is_available():
            raise ValueError("OpenAI API key not configured")
        
        try:
            from openai import OpenAI
            
            client = OpenAI(api_key=self.api_key)
            
            response = client.chat.completions.create(
                model=self.model,
                max_tokens=self.max_tokens,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            return response.choices[0].message.content
            
        except ImportError:
            raise ImportError("openai package not installed. Run: pip install openai")
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise


# =============================================================================
# AI SERVICE FACTORY
# =============================================================================

def get_ai_provider(provider_name: Optional[str] = None) -> AIProvider:
    """
    Get an AI provider instance.
    
    Args:
        provider_name: 'anthropic' or 'openai'. If None, uses default.
    
    Returns:
        AIProvider instance
    """
    provider_name = provider_name or get_default_ai_provider()
    
    if provider_name == 'anthropic':
        return AnthropicProvider()
    elif provider_name == 'openai':
        return OpenAIProvider()
    else:
        raise ValueError(f"Unknown AI provider: {provider_name}")


def get_available_providers() -> list:
    """Return list of available (configured) AI providers."""
    available = []
    
    if AnthropicProvider().is_available():
        available.append('anthropic')
    if OpenAIProvider().is_available():
        available.append('openai')
    
    return available


# =============================================================================
# REPORT GENERATION SERVICE
# =============================================================================

class AIReportGenerator:
    """
    Main service for generating AI-powered analytics reports.
    """
    
    def __init__(self, provider_name: Optional[str] = None):
        self.provider = get_ai_provider(provider_name)
    
    def generate_report(
        self,
        analytics_data: Dict[str, Any],
        user_request: str,
        report_type: str = 'summary',
        filters_context: Optional[Dict] = None,
        language: str = 'en',
        visible_sections: Optional[Dict[str, bool]] = None
    ) -> Dict[str, Any]:
        """
        Generate an analytics report using AI.
        
        Args:
            analytics_data: The analytics response from AnalyticsService
            user_request: The admin's specific request/question
            report_type: 'summary', 'monthly', 'board', 'trend'
            filters_context: Information about applied filters
            language: 'en', 'sv', 'no' for output language
            visible_sections: Dict of section visibility preferences.
                             Only visible sections will be included in the report.
        
        Returns:
            Dict with 'report' (text) and 'metadata'
        """
        from .ai_prompts import build_system_prompt, build_user_prompt
        
        # Build prompts
        system_prompt = build_system_prompt(report_type, language)
        user_prompt = build_user_prompt(
            analytics_data=analytics_data,
            user_request=user_request,
            filters_context=filters_context,
            report_type=report_type,
            visible_sections=visible_sections
        )
        
        # Generate report
        report_text = self.provider.generate_report(system_prompt, user_prompt)
        
        return {
            'report': report_text,
            'metadata': {
                'provider': type(self.provider).__name__,
                'report_type': report_type,
                'language': language,
            }
        }

