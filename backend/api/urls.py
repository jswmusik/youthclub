from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HealthCheckView
from users.views import UserViewSet
from system_messages.views import SystemMessageViewSet
from news.views import NewsArticleViewSet, NewsTagViewSet
from custom_fields.views import CustomFieldDefinitionViewSet
# Update Import
from groups.views import GroupViewSet, GroupMembershipViewSet
from rewards.views import RewardViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'messages', SystemMessageViewSet)
router.register(r'news', NewsArticleViewSet)
router.register(r'news_tags', NewsTagViewSet)
router.register(r'custom-fields', CustomFieldDefinitionViewSet, basename='custom-fields')
router.register(r'groups', GroupViewSet, basename='groups')
# NEW
router.register(r'group-requests', GroupMembershipViewSet, basename='group-requests')
router.register(r'rewards', RewardViewSet, basename='rewards')

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health_check'),
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    path('', include(router.urls)), 
    path('', include('organization.urls')),
]