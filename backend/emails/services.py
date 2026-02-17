import logging
import re
from html import unescape
from html.parser import HTMLParser
from typing import Dict, Any, Optional

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template import Template, Context
from django.utils import timezone

from .models import EmailTemplate, EmailTemplateTranslation, EmailLog
from users.models import User

logger = logging.getLogger(__name__)


class HTMLToText(HTMLParser):
    """Simple HTML to plain text converter."""
    def __init__(self):
        super().__init__()
        self.result = []
        self.in_tag = False
        
    def handle_starttag(self, tag, attrs):
        if tag in ['br', 'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            self.result.append('\n')
        elif tag == 'li':
            self.result.append('\n• ')
        elif tag == 'a':
            for attr in attrs:
                if attr[0] == 'href':
                    self.result.append(f' [{attr[1]}] ')
                    
    def handle_endtag(self, tag):
        if tag in ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol']:
            self.result.append('\n')
            
    def handle_data(self, data):
        self.result.append(data)
        
    def get_text(self):
        return unescape(''.join(self.result)).strip()


def html_to_text(html_content: str) -> str:
    """Convert HTML to plain text."""
    parser = HTMLToText()
    parser.feed(html_content)
    text = parser.get_text()
    # Clean up multiple newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text


class EmailService:
    """
    Service for sending templated emails.
    
    Usage:
        EmailService.send(
            template_type=EmailTemplate.Type.DELETION_WARNING_FIRST,
            recipient=user,
            context={
                'days_left': 30,
                'deletion_date': '2024-01-15',
            }
        )
    """
    
    @classmethod
    def send(
        cls,
        template_type: str,
        recipient: User,
        context: Dict[str, Any] = None,
        override_email: str = None,
    ) -> bool:
        """
        Send an email to a user using a template.
        
        Args:
            template_type: The EmailTemplate.Type value
            recipient: The User to send to
            context: Additional variables for template rendering
            override_email: Optional email address to send to instead of user's email
            
        Returns:
            bool: True if email was sent successfully
        """
        context = context or {}
        to_email = override_email or (recipient.email if recipient else None)
        
        if not to_email:
            logger.error(f"No email address provided for template {template_type}")
            return False
        
        # Default language when recipient is None
        default_language = 'sv'
        
        # Get the template
        try:
            template = EmailTemplate.objects.get(type=template_type)
        except EmailTemplate.DoesNotExist:
            logger.error(f"Email template not found: {template_type}")
            cls._log_email(
                recipient=recipient,
                recipient_email=to_email,
                template=None,
                template_type=template_type,
                subject=f"[Missing template: {template_type}]",
                language=getattr(recipient, 'preferred_language', default_language) if recipient else default_language,
                status=EmailLog.Status.FAILED,
                error_message=f"Template not found: {template_type}",
                context_data=context,
            )
            return False
            
        if not template.is_active:
            logger.info(f"Email template is disabled: {template_type}")
            return False
        
        # Get translation for user's preferred language
        user_language = getattr(recipient, 'preferred_language', 'sv') or 'sv'
        translation = template.get_translation(user_language)
        
        if not translation:
            logger.error(f"No translation found for template {template_type}")
            cls._log_email(
                recipient=recipient,
                recipient_email=to_email,
                template=template,
                template_type=template_type,
                subject=f"[Missing translation: {template_type}]",
                language=user_language,
                status=EmailLog.Status.FAILED,
                error_message=f"No translation found for language: {user_language}",
                context_data=context,
            )
            return False
        
        # Build the full context with user data
        full_context = cls._build_context(recipient, context)
        
        # Render subject and body
        try:
            subject = cls._render_template(translation.subject, full_context)
            body_html = cls._render_template(translation.body_html, full_context)
            body_text = translation.body_text.strip() if translation.body_text else None
            if body_text:
                body_text = cls._render_template(body_text, full_context)
            else:
                body_text = html_to_text(body_html)
        except Exception as e:
            logger.error(f"Error rendering email template: {e}")
            cls._log_email(
                recipient=recipient,
                recipient_email=to_email,
                template=template,
                template_type=template_type,
                subject=f"[Render error: {template_type}]",
                language=user_language,
                status=EmailLog.Status.FAILED,
                error_message=f"Template render error: {str(e)}",
                context_data=context,
            )
            return False
        
        # Send the email
        try:
            email = EmailMultiAlternatives(
                subject=subject,
                body=body_text,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[to_email],
            )
            email.attach_alternative(body_html, "text/html")
            email.send(fail_silently=False)
            
            logger.info(f"Email sent: {template_type} to {to_email}")
            
            cls._log_email(
                recipient=recipient,
                recipient_email=to_email,
                template=template,
                template_type=template_type,
                subject=subject,
                body_preview=body_text[:500] if body_text else "",
                language=user_language,
                status=EmailLog.Status.SENT,
                context_data=context,
                sent_at=timezone.now(),
            )
            return True
            
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            cls._log_email(
                recipient=recipient,
                recipient_email=to_email,
                template=template,
                template_type=template_type,
                subject=subject,
                body_preview=body_text[:500] if body_text else "",
                language=user_language,
                status=EmailLog.Status.FAILED,
                error_message=str(e),
                context_data=context,
            )
            return False
    
    @classmethod
    def send_test(
        cls,
        template_type: str,
        language: str,
        to_email: str,
        context: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Send a test email to a specific address.
        Uses sample data for template variables.
        
        Returns:
            Dict with success status and any error message
        """
        context = context or {}
        
        # Get template
        try:
            template = EmailTemplate.objects.get(type=template_type)
        except EmailTemplate.DoesNotExist:
            return {'success': False, 'error': f'Template not found: {template_type}'}
        
        # Get translation
        try:
            translation = template.translations.get(language=language)
        except EmailTemplateTranslation.DoesNotExist:
            return {'success': False, 'error': f'Translation not found for language: {language}'}
        
        # Build test context with sample data
        test_context = cls._build_test_context(context)
        
        try:
            subject = cls._render_template(translation.subject, test_context)
            body_html = cls._render_template(translation.body_html, test_context)
            body_text = translation.body_text.strip() if translation.body_text else html_to_text(body_html)
            if translation.body_text:
                body_text = cls._render_template(body_text, test_context)
                
            subject = f"[TEST] {subject}"
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=body_text,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[to_email],
            )
            email.attach_alternative(body_html, "text/html")
            email.send(fail_silently=False)
            
            return {'success': True, 'message': f'Test email sent to {to_email}'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    @classmethod
    def preview(
        cls,
        template_type: str,
        language: str,
        context: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Generate a preview of an email without sending.
        
        Returns:
            Dict with subject, body_html, body_text
        """
        context = context or {}
        
        try:
            template = EmailTemplate.objects.get(type=template_type)
        except EmailTemplate.DoesNotExist:
            return {'error': f'Template not found: {template_type}'}
        
        try:
            translation = template.translations.get(language=language)
        except EmailTemplateTranslation.DoesNotExist:
            return {'error': f'Translation not found for language: {language}'}
        
        test_context = cls._build_test_context(context)
        
        try:
            subject = cls._render_template(translation.subject, test_context)
            body_html = cls._render_template(translation.body_html, test_context)
            body_text = translation.body_text.strip() if translation.body_text else html_to_text(body_html)
            if translation.body_text:
                body_text = cls._render_template(body_text, test_context)
                
            return {
                'subject': subject,
                'body_html': body_html,
                'body_text': body_text,
            }
        except Exception as e:
            return {'error': f'Render error: {str(e)}'}
    
    @staticmethod
    def _build_context(user: User, extra_context: Dict[str, Any]) -> Dict[str, Any]:
        """Build the full template context including user data."""
        context = {
            'user': {
                'first_name': user.first_name or '',
                'last_name': user.last_name or '',
                'full_name': f"{user.first_name or ''} {user.last_name or ''}".strip() or 'User',
                'email': user.email,
                'nickname': user.nickname or user.first_name or 'User',
            },
            'app_name': 'Ungdomsappen',
            'support_email': 'support@ungdomsappen.se',
            'current_year': timezone.now().year,
        }
        
        # Add club info if available
        if hasattr(user, 'preferred_club') and user.preferred_club:
            context['club'] = {
                'name': user.preferred_club.name,
            }
            if user.preferred_club.municipality:
                context['municipality'] = {
                    'name': user.preferred_club.municipality.name,
                }
        
        # Merge extra context
        context.update(extra_context)
        return context
    
    @staticmethod
    def _build_test_context(extra_context: Dict[str, Any]) -> Dict[str, Any]:
        """Build a test context with sample data."""
        context = {
            'user': {
                'first_name': 'Test',
                'last_name': 'User',
                'full_name': 'Test User',
                'email': 'test@example.com',
                'nickname': 'Tester',
            },
            'club': {
                'name': 'Example Youth Club',
            },
            'municipality': {
                'name': 'Example Municipality',
            },
            'app_name': 'Ungdomsappen',
            'support_email': 'support@ungdomsappen.se',
            'current_year': timezone.now().year,
            # Sample data for common variables
            'days_left': 30,
            'deletion_date': '2024-01-15',
            'event_name': 'Summer Camp 2024',
            'event_date': '2024-07-01',
            'message_sender': 'Club Admin',
            'reward_name': 'Bronze Achievement',
        }
        context.update(extra_context)
        return context
    
    @staticmethod
    def _render_template(template_string: str, context: Dict[str, Any]) -> str:
        """
        Render a template string with the given context.
        Supports both Django template syntax and simple {{variable}} syntax.
        """
        # Convert {{variable}} to Django template syntax
        # Also handle {{user.first_name}} style nested access
        def replace_simple_vars(match):
            var_path = match.group(1).strip()
            return '{{ ' + var_path + ' }}'
        
        template_string = re.sub(r'\{\{([^}]+)\}\}', replace_simple_vars, template_string)
        
        # Render using Django template engine
        template = Template(template_string)
        return template.render(Context(context))
    
    @staticmethod
    def _log_email(
        recipient: Optional[User],
        recipient_email: str,
        template: Optional[EmailTemplate],
        template_type: str,
        subject: str,
        language: str,
        status: str,
        body_preview: str = "",
        error_message: str = "",
        context_data: Dict[str, Any] = None,
        sent_at=None,
    ):
        """Create an email log entry."""
        try:
            EmailLog.objects.create(
                recipient=recipient,
                recipient_email=recipient_email,
                template=template,
                template_type=template_type,
                subject=subject,
                body_preview=body_preview,
                language=language,
                status=status,
                error_message=error_message,
                context_data=context_data or {},
                sent_at=sent_at,
            )
        except Exception as e:
            logger.error(f"Failed to create email log: {e}")

