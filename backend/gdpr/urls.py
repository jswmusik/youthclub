"""
URL configuration for GDPR API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DataExportViewSet, ConsentTypePublicViewSet

router = DefaultRouter()
router.register(r'exports', DataExportViewSet, basename='dataexport')
router.register(r'consent-types', ConsentTypePublicViewSet, basename='consenttype')

app_name = 'gdpr'

urlpatterns = [
    path('', include(router.urls)),
    path('', include('gdpr.consent_urls')),  # Consent management endpoints (public)
    path('', include('gdpr.deletion_urls')),  # Account deletion endpoints
    path('admin/', include('gdpr.admin_urls')),  # Admin consent type management
]

