from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmailTemplateViewSet, EmailLogViewSet

router = DefaultRouter()
router.register(r'templates', EmailTemplateViewSet, basename='email-template')
router.register(r'logs', EmailLogViewSet, basename='email-log')

urlpatterns = [
    path('', include(router.urls)),
]

