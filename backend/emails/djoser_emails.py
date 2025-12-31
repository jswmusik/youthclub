"""
Custom Djoser email classes that integrate with our email template system.
This allows password reset emails to use our branded templates and be editable
from the Super Admin email templates panel.
"""

import logging
from django.conf import settings
from djoser.email import PasswordResetEmail as DjoserPasswordResetEmail

from .services import EmailService
from .models import EmailTemplate

logger = logging.getLogger(__name__)


class PasswordResetEmail(DjoserPasswordResetEmail):
    """
    Custom password reset email that uses our email template system
    instead of Djoser's default templates.
    """
    
    def send(self, to, *args, **kwargs):
        """
        Override Djoser's send method to use our EmailService.
        """
        # Get the full context from Djoser's parent class
        context = self.get_context_data()
        
        user = context.get('user')
        uid = context.get('uid')
        token = context.get('token')
        
        # Build the full reset URL
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        reset_url = f"{frontend_url}/reset-password/{uid}/{token}"
        
        logger.info(f"Password reset email prepared for {user.email if user else 'unknown'}")
        
        # Send using our email service
        try:
            success = EmailService.send(
                template_type=EmailTemplate.Type.PASSWORD_RESET,
                recipient=user,
                context={
                    'reset_url': reset_url,
                    'uid': uid,
                    'token': token,
                    'validity_hours': 24,  # Djoser default token validity
                }
            )
            
            if success:
                logger.info(f"Password reset email sent to {user.email}")
            else:
                logger.error(f"Failed to send password reset email to {user.email}")
                
        except Exception as e:
            logger.exception(f"Error sending password reset email to {user.email}: {e}")

