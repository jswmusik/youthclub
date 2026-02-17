"""
Admin URLs for GDPR consent document management.
"""

from rest_framework.routers import DefaultRouter
from .admin_views import ConsentTypeAdminViewSet

router = DefaultRouter()
router.register(r'consent-types', ConsentTypeAdminViewSet, basename='admin-consenttype')

urlpatterns = router.urls


