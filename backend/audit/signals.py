"""
Signal handlers for automatic audit logging.

These signals can log important events like user login/logout.
"""

import logging
from django.contrib.auth.signals import user_logged_in, user_logged_out, user_login_failed
from django.dispatch import receiver
from django.conf import settings
from .services import log_audit_event, get_client_ip
from .models import AuditLog

logger = logging.getLogger(__name__)


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Log successful user login"""
    if not getattr(settings, 'ENABLE_AUDIT_LOGGING', False):
        return
    
    try:
        log_audit_event(
            action=AuditLog.Action.LOGIN,
            user=user,
            model_name='User',
            object_id=user.pk,
            object_repr=str(user),
            ip_address=get_client_ip(request) if request else None,
            user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
            endpoint='/api/auth/jwt/create/',
            method='POST'
        )
    except Exception as e:
        logger.error(f"Failed to log user login: {e}")


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """Log user logout"""
    if not getattr(settings, 'ENABLE_AUDIT_LOGGING', False):
        return
    
    if user:  # user can be None for anonymous logout
        try:
            log_audit_event(
                action=AuditLog.Action.LOGOUT,
                user=user,
                model_name='User',
                object_id=user.pk,
                object_repr=str(user),
                ip_address=get_client_ip(request) if request else None,
                user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
            )
        except Exception as e:
            logger.error(f"Failed to log user logout: {e}")


@receiver(user_login_failed)
def log_user_login_failed(sender, credentials, request, **kwargs):
    """Log failed login attempt"""
    if not getattr(settings, 'ENABLE_AUDIT_LOGGING', False):
        return
    
    try:
        email = credentials.get('email', credentials.get('username', 'Unknown'))
        
        log_audit_event(
            action=AuditLog.Action.LOGIN_FAILED,
            user=None,  # User not authenticated
            model_name='User',
            object_repr=email,
            reason=f"Failed login attempt for: {email}",
            ip_address=get_client_ip(request) if request else None,
            user_agent=request.META.get('HTTP_USER_AGENT', '') if request else '',
            endpoint='/api/auth/jwt/create/',
            method='POST'
        )
    except Exception as e:
        logger.error(f"Failed to log login failure: {e}")


