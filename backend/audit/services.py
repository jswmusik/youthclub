"""
Service functions for audit logging.

These utilities make it easy to log audit events throughout the application.
"""

import logging
from typing import Optional, Dict, Any
from django.contrib.auth import get_user_model
from django.db.models import Model
from .models import AuditLog

User = get_user_model()
logger = logging.getLogger(__name__)


def log_audit_event(
    action: str,
    user: Optional[User] = None,
    admin_user: Optional[User] = None,
    model_name: str = '',
    object_id: Optional[int] = None,
    object_repr: str = '',
    changes: Optional[Dict[str, Any]] = None,
    reason: str = '',
    ip_address: Optional[str] = None,
    user_agent: str = '',
    endpoint: str = '',
    method: str = ''
) -> Optional[AuditLog]:
    """
    Log an audit event.
    
    Args:
        action: Type of action (from AuditLog.Action)
        user: User who performed the action
        admin_user: Admin user (if action performed by admin on another user)
        model_name: Name of the model/table affected
        object_id: ID of the object affected
        object_repr: String representation of the object
        changes: Dictionary of before/after values
        reason: Reason for the action
        ip_address: IP address of the request
        user_agent: Browser/client user agent
        endpoint: API endpoint accessed
        method: HTTP method
    
    Returns:
        AuditLog instance or None if logging is disabled
    """
    from django.conf import settings
    
    # Check if audit logging is enabled
    if not getattr(settings, 'ENABLE_AUDIT_LOGGING', False):
        return None
    
    try:
        audit_log = AuditLog.objects.create(
            user=user,
            admin_user=admin_user,
            action=action,
            model_name=model_name,
            object_id=object_id,
            object_repr=object_repr,
            changes=changes,
            reason=reason,
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else '',  # Truncate
            endpoint=endpoint,
            method=method
        )
        return audit_log
    except Exception as e:
        # Log error but don't break the application
        logger.error(f"Failed to create audit log: {e}")
        return None


def log_model_change(
    instance: Model,
    action: str,
    user: Optional[User] = None,
    admin_user: Optional[User] = None,
    changes: Optional[Dict[str, Any]] = None,
    reason: str = '',
    request: Optional[Any] = None
) -> Optional[AuditLog]:
    """
    Log a model instance change.
    
    Args:
        instance: Model instance that was changed
        action: Type of action (CREATE, UPDATE, DELETE)
        user: User who performed the action
        admin_user: Admin user (if applicable)
        changes: Dictionary of before/after values
        reason: Reason for the change
        request: HTTP request object (to extract IP, user agent, etc.)
    
    Returns:
        AuditLog instance or None
    """
    ip_address = None
    user_agent = ''
    endpoint = ''
    method = ''
    
    if request:
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        endpoint = request.path
        method = request.method
    
    return log_audit_event(
        action=action,
        user=user,
        admin_user=admin_user,
        model_name=instance.__class__.__name__,
        object_id=instance.pk,
        object_repr=str(instance)[:200],
        changes=changes,
        reason=reason,
        ip_address=ip_address,
        user_agent=user_agent,
        endpoint=endpoint,
        method=method
    )


def log_login_attempt(
    user: Optional[User],
    success: bool,
    ip_address: Optional[str] = None,
    user_agent: str = '',
    reason: str = ''
) -> Optional[AuditLog]:
    """
    Log a login attempt.
    
    Args:
        user: User attempting to login (None if user not found)
        success: Whether login was successful
        ip_address: IP address of the request
        user_agent: Browser/client user agent
        reason: Reason for failure (if applicable)
    
    Returns:
        AuditLog instance or None
    """
    action = AuditLog.Action.LOGIN if success else AuditLog.Action.LOGIN_FAILED
    
    return log_audit_event(
        action=action,
        user=user,
        model_name='User',
        object_id=user.pk if user else None,
        object_repr=str(user) if user else 'Unknown',
        reason=reason,
        ip_address=ip_address,
        user_agent=user_agent,
        endpoint='/api/auth/jwt/create/',
        method='POST'
    )


def log_data_access(
    user: User,
    model_name: str,
    object_id: Optional[int] = None,
    request: Optional[Any] = None,
    reason: str = ''
) -> Optional[AuditLog]:
    """
    Log data access (read operation).
    
    Args:
        user: User accessing the data
        model_name: Name of the model being accessed
        object_id: ID of the specific object (if applicable)
        request: HTTP request object
        reason: Reason for access
    
    Returns:
        AuditLog instance or None
    """
    ip_address = None
    user_agent = ''
    endpoint = ''
    method = 'GET'
    
    if request:
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        endpoint = request.path
        method = request.method
    
    return log_audit_event(
        action=AuditLog.Action.READ,
        user=user,
        model_name=model_name,
        object_id=object_id,
        reason=reason,
        ip_address=ip_address,
        user_agent=user_agent,
        endpoint=endpoint,
        method=method
    )


def get_client_ip(request) -> Optional[str]:
    """
    Extract client IP address from request.
    
    Handles X-Forwarded-For header for load balancers.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def get_model_changes(old_instance: Model, new_instance: Model, fields: Optional[list] = None) -> Dict[str, Any]:
    """
    Get changes between two model instances.
    
    Args:
        old_instance: Original instance (before changes)
        new_instance: Updated instance (after changes)
        fields: List of field names to track (None = all fields)
    
    Returns:
        Dictionary with 'before' and 'after' values for changed fields
    """
    changes = {}
    
    if fields is None:
        fields = [f.name for f in new_instance._meta.fields]
    
    for field_name in fields:
        try:
            old_value = getattr(old_instance, field_name, None)
            new_value = getattr(new_instance, field_name, None)
            
            # Skip if values are the same
            if old_value == new_value:
                continue
            
            # Convert to serializable format
            changes[field_name] = {
                'before': str(old_value) if old_value is not None else None,
                'after': str(new_value) if new_value is not None else None
            }
        except Exception as e:
            logger.warning(f"Failed to get change for field {field_name}: {e}")
            continue
    
    return changes if changes else None


