# backend/messenger/routing.py
"""
WebSocket URL routing for the messenger app.
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Chat WebSocket for specific conversations
    # URL: ws://localhost:8000/ws/chat/<conversation_id>/
    re_path(
        r'ws/chat/(?P<conversation_id>\d+)/$', 
        consumers.ChatConsumer.as_asgi()
    ),
    
    # User notification WebSocket for global notifications
    # URL: ws://localhost:8000/ws/notifications/
    re_path(
        r'ws/notifications/$', 
        consumers.NotificationConsumer.as_asgi()
    ),
]








