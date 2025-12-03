from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuestionnaireAdminViewSet, UserQuestionnaireViewSet

router = DefaultRouter()
# Admin endpoints: /api/questionnaires/manage/
router.register(r'manage', QuestionnaireAdminViewSet, basename='questionnaire-manage')

# User endpoints: /api/questionnaires/feed/
router.register(r'feed', UserQuestionnaireViewSet, basename='questionnaire-feed')

urlpatterns = [
    path('', include(router.urls)),
]