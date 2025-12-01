from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VisitViewSet, KioskTokenView

router = DefaultRouter()
router.register(r'sessions', VisitViewSet, basename='visit-sessions')

urlpatterns = [
    path('kiosk/token/', KioskTokenView.as_view(), name='kiosk-token'),
    path('', include(router.urls)),
]