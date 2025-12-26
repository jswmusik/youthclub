from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DashboardMetricsView, 
    AnalyticsReportViewSet, 
    AnalyticsFilterOptionsView,
    AIReportGeneratorView,
    AIProvidersView,
    AnalyticsPreferencesView
)

router = DefaultRouter()
router.register(r'reports', AnalyticsReportViewSet, basename='analytics-reports')

urlpatterns = [
    path('dashboard/', DashboardMetricsView.as_view(), name='analytics-dashboard'),
    path('filter-options/', AnalyticsFilterOptionsView.as_view(), name='analytics-filter-options'),
    path('ai-report/', AIReportGeneratorView.as_view(), name='analytics-ai-report'),
    path('ai-providers/', AIProvidersView.as_view(), name='analytics-ai-providers'),
    path('preferences/', AnalyticsPreferencesView.as_view(), name='analytics-preferences'),
    path('', include(router.urls)),
]