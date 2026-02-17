"""
URL configuration for consent management API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .consent_views import ConsentTypeViewSet, UserConsentViewSet

router = DefaultRouter()
router.register(r'consent-types', ConsentTypeViewSet, basename='consent-type')
router.register(r'my-consents', UserConsentViewSet, basename='user-consent')

urlpatterns = router.urls


