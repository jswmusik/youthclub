# backend/seo/urls.py
"""
URL routing for SEO app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    KeywordViewSet,
    SwedishLocationViewSet,
    LocalLandingPageViewSet,
    SEOArticleViewSet,
    SEOCampaignViewSet,
    InternalLinkViewSet,
    PublicLocalPageView,
    PublicArticleView,
    PublicArticleListView,
    PublicLocalPageListView,
    SEODashboardView,
    AIPersonasView,
)

# Create router for viewsets
router = DefaultRouter()
router.register(r'keywords', KeywordViewSet, basename='keyword')
router.register(r'locations', SwedishLocationViewSet, basename='location')
router.register(r'local-pages', LocalLandingPageViewSet, basename='local-page')
router.register(r'articles', SEOArticleViewSet, basename='article')
router.register(r'campaigns', SEOCampaignViewSet, basename='campaign')
router.register(r'internal-links', InternalLinkViewSet, basename='internal-link')

urlpatterns = [
    # Admin API endpoints (authenticated)
    path('', include(router.urls)),
    
    # Dashboard
    path('dashboard/', SEODashboardView.as_view(), name='seo-dashboard'),
    
    # AI Personas
    path('personas/', AIPersonasView.as_view(), name='ai-personas'),
    
    # Public API endpoints (for frontend consumption)
    path('public/local-page/<slug:slug>/', PublicLocalPageView.as_view(), name='public-local-page'),
    path('public/article/<slug:slug>/', PublicArticleView.as_view(), name='public-article'),
    path('public/articles/', PublicArticleListView.as_view(), name='public-articles'),
    path('public/local-pages/', PublicLocalPageListView.as_view(), name='public-local-pages'),
]



