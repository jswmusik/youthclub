# backend/messenger/middleware.py
"""
Custom authentication middleware for Django Channels WebSocket connections.

This middleware handles JWT token authentication for WebSocket connections,
since the default AuthMiddlewareStack only works with session-based auth.
"""
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from urllib.parse import parse_qs


@database_sync_to_async
def get_user_from_token(token_key):
    """
    Validate JWT token and return the associated user.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        # Validate the token
        access_token = AccessToken(token_key)
        user_id = access_token['user_id']
        
        # Get the user
        user = User.objects.get(id=user_id)
        return user
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware that authenticates WebSocket connections using JWT tokens.
    
    The token can be passed in two ways:
    1. As a query parameter: ws://localhost:8000/ws/chat/1/?token=<jwt_token>
    2. In the subprotocol (for browsers that support it)
    
    Usage in ASGI config:
        application = ProtocolTypeRouter({
            "websocket": JWTAuthMiddleware(
                URLRouter(websocket_urlpatterns)
            ),
        })
    """
    
    async def __call__(self, scope, receive, send):
        # Get query string parameters
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        
        # Try to get token from query parameters
        token = None
        if 'token' in query_params:
            token = query_params['token'][0]
        
        # If no token in query params, check subprotocols
        if not token:
            subprotocols = scope.get('subprotocols', [])
            for protocol in subprotocols:
                if protocol.startswith('jwt.'):
                    token = protocol[4:]  # Remove 'jwt.' prefix
                    break
        
        # Authenticate user
        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)


class JWTAuthMiddlewareStack:
    """
    Convenience wrapper that combines JWTAuthMiddleware with URLRouter.
    
    Usage:
        application = ProtocolTypeRouter({
            "websocket": JWTAuthMiddlewareStack(websocket_urlpatterns),
        })
    """
    
    def __new__(cls, inner):
        from channels.routing import URLRouter
        return JWTAuthMiddleware(URLRouter(inner))
