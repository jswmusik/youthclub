from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HealthCheckView
from users.views import UserViewSet # Import the new view
from system_messages.views import SystemMessageViewSet

# Create a router for our custom endpoints
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'messages', SystemMessageViewSet)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health_check'),
    
    # Djoser Auth (Login/Register self)
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    
    # Our Custom User Management (Manage others)
    # This creates /api/users/
    path('', include(router.urls)), 
    
    # Organization URLs
    path('', include('organization.urls')),
]