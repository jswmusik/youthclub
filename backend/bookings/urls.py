from rest_framework.routers import DefaultRouter
from .views import BookingResourceViewSet, BookingViewSet, BookingScheduleViewSet

router = DefaultRouter()
router.register(r'resources', BookingResourceViewSet, basename='booking-resources')
router.register(r'schedules', BookingScheduleViewSet, basename='booking-schedules')
router.register(r'bookings', BookingViewSet, basename='bookings')

urlpatterns = router.urls