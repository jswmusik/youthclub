from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HealthCheckView
from users.views import UserViewSet, PublicRegistrationView, CheckEmailView, CheckGuardianView, YouthGuardiansViewSet, GuardianRelationshipViewSet
from system_messages.views import SystemMessageViewSet
from news.views import NewsArticleViewSet, NewsTagViewSet
from custom_fields.views import CustomFieldDefinitionViewSet, PublicCustomFieldListView
# Update Import
from groups.views import GroupViewSet, GroupMembershipViewSet
from rewards.views import RewardViewSet
# Add this line at the top with other imports
from posts.views import PostViewSet, PostCommentViewSet

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
# --- ADD THESE TWO LINES ---
router.register(r'posts', PostViewSet, basename='posts')
router.register(r'post-comments', PostCommentViewSet, basename='post-comments')
# Youth Guardians endpoint
router.register(r'youth/guardians', YouthGuardiansViewSet, basename='youth-guardians')
# Admin Guardian Relationships endpoint
router.register(r'admin/guardian-relationships', GuardianRelationshipViewSet, basename='guardian-relationships')

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health_check'),
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    
    # --- PUBLIC ENDPOINTS ---
    # These must go before router to prevent conflicts (e.g. custom-fields/public vs custom-fields/1)
    path('register/youth/', PublicRegistrationView.as_view(), name='public-youth-register'),
    path('register/check-guardian/', CheckGuardianView.as_view(), name='check-guardian'),
    
    # NEW: Generic Email Check
    path('register/check-email/', CheckEmailView.as_view(), name='check-email'),
    
    path('custom-fields/public/', PublicCustomFieldListView.as_view(), name='public-custom-fields'),
    
    # --- ROUTER ENDPOINTS ---
    path('', include(router.urls)), 
    path('', include('organization.urls')),
    path('notifications/', include('notifications.urls')),
    path('visits/', include('visits.urls')),
]