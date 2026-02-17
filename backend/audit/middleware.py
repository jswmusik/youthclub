"""
Audit logging middleware for automatic request tracking.

This middleware automatically logs certain requests for GDPR compliance.
It can be enabled/disabled via settings without affecting the application.
"""

import logging
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from .services import log_audit_event, get_client_ip
from .models import AuditLog

logger = logging.getLogger(__name__)


class AuditLogMiddleware(MiddlewareMixin):
    """
    Middleware to automatically log requests to sensitive endpoints.
    
    This is OPTIONAL and can be enabled via ENABLE_AUDIT_LOGGING setting.
    If disabled, it does nothing and doesn't affect performance.
    """
    
    # Endpoints that access personal data (customize as needed)
    SENSITIVE_ENDPOINTS = [
        '/api/users/',
        '/api/messages/',
        '/api/visits/',
        '/api/events/',
        '/api/posts/',
        '/api/notifications/',
        '/api/questionnaires/',
        '/api/rewards/',
        '/api/bookings/',
    ]
    
    # Actions that should always be logged regardless of endpoint
    ALWAYS_LOG_ACTIONS = [
        '/api/auth/jwt/create/',  # Login
        '/api/auth/jwt/refresh/',  # Token refresh
        '/api/users/export-data/',  # Data export
        '/api/users/request-deletion/',  # Account deletion
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Check if audit logging is enabled
        self.enabled = getattr(settings, 'ENABLE_AUDIT_LOGGING', False)
    
    def __call__(self, request):
        # If audit logging disabled, pass through immediately
        if not self.enabled:
            return self.get_response(request)
        
        # Check if we should log this request
        should_log = self._should_log_request(request)
        
        if should_log and request.user.is_authenticated:
            try:
                self._log_request(request)
            except Exception as e:
                # Log error but don't break the request
                logger.error(f"Audit logging failed: {e}")
        
        # Process the request normally
        response = self.get_response(request)
        
        return response
    
    def _should_log_request(self, request) -> bool:
        """Determine if this request should be logged"""
        path = request.path
        
        # Always log certain actions
        if any(path.startswith(action) for action in self.ALWAYS_LOG_ACTIONS):
            return True
        
        # Log access to sensitive endpoints (only GET for reads, all others)
        if any(path.startswith(endpoint) for endpoint in self.SENSITIVE_ENDPOINTS):
            # For sensitive endpoints, log all methods
            return True
        
        return False
    
    def _log_request(self, request):
        """Log the request"""
        # Map HTTP methods to actions
        action_map = {
            'GET': AuditLog.Action.READ,
            'POST': AuditLog.Action.CREATE,
            'PUT': AuditLog.Action.UPDATE,
            'PATCH': AuditLog.Action.UPDATE,
            'DELETE': AuditLog.Action.DELETE,
        }
        
        action = action_map.get(request.method, AuditLog.Action.READ)
        
        # Extract model name from path if possible
        model_name = self._extract_model_name(request.path)
        
        log_audit_event(
            action=action,
            user=request.user,
            model_name=model_name,
            endpoint=request.path,
            method=request.method,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        )
    
    def _extract_model_name(self, path: str) -> str:
        """Extract model name from API path"""
        # Simple heuristic: /api/users/ -> User
        parts = path.strip('/').split('/')
        if len(parts) >= 2 and parts[0] == 'api':
            model = parts[1].rstrip('s').capitalize()
            # Handle plural forms
            if model.endswith('ie'):
                model = model[:-2] + 'y'
            return model
        return 'Unknown'


