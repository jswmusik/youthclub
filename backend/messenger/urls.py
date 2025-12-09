from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConversationViewSet, BroadcastViewSet, InboxViewSet, MessageViewSet

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversations')
router.register(r'broadcast', BroadcastViewSet, basename='broadcast')
router.register(r'inbox', InboxViewSet, basename='inbox')
router.register(r'messages', MessageViewSet, basename='messages')

urlpatterns = [
    path('', include(router.urls)),
]