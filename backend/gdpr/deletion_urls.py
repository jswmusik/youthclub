"""
URL configuration for account deletion API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .deletion_views import AccountDeletionViewSet, DeletedUserRecordViewSet

router = DefaultRouter()
router.register(r'deletion-requests', AccountDeletionViewSet, basename='deletion-request')
router.register(r'deleted-users', DeletedUserRecordViewSet, basename='deleted-user')

urlpatterns = router.urls


