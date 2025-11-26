from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HealthCheckView
from users.views import UserViewSet
from system_messages.views import SystemMessageViewSet

# --- NEW IMPORT ---
from news.views import NewsArticleViewSet, NewsTagViewSet

# Create a router for our custom endpoints
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'messages', SystemMessageViewSet)

# --- NEW REGISTRATIONS ---
# This creates /api/news/ and /api/news/hero/
router.register(r'news', NewsArticleViewSet)
# This creates /api/news_tags/
router.register(r'news_tags', NewsTagViewSet)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health_check'),
    
    # Djoser Auth (Login/Register self)
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    
    # Our Custom User Management & News
    path('', include(router.urls)), 
    
    # Organization URLs
    path('', include('organization.urls')),
]