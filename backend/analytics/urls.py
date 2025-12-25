from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardMetricsView, AnalyticsReportViewSet

router = DefaultRouter()
router.register(r'reports', AnalyticsReportViewSet, basename='analytics-reports')

urlpatterns = [
    path('dashboard/', DashboardMetricsView.as_view(), name='analytics-dashboard'),
    path('', include(router.urls)),
]