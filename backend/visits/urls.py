from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VisitViewSet, KioskTokenView, KioskPinView

router = DefaultRouter()
router.register(r'sessions', VisitViewSet, basename='visit-sessions')

urlpatterns = [
    path('kiosk/token/', KioskTokenView.as_view(), name='kiosk-token'),
    path('kiosk/pin/', KioskPinView.as_view(), name='kiosk-pin'),
    path('', include(router.urls)),
]