from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HealthCheckView
from users.views import (
    UserViewSet, PublicRegistrationView, CheckEmailView, CheckGuardianView, 
    YouthGuardiansViewSet, GuardianChildrenViewSet, GuardianRelationshipViewSet, IdDocumentUploadView, IdDocumentReviewView,
    IdDocumentHistoryView, IdDocumentUploadHistoryView, AdminIdDocumentHistoryView, 
    AdminIdDocumentReviewView, GuardianPendingVerificationsView
)
from system_messages.views import SystemMessageViewSet
from news.views import NewsArticleViewSet, NewsTagViewSet
from custom_fields.views import CustomFieldDefinitionViewSet, PublicCustomFieldListView
# Update Import
from groups.views import GroupViewSet, GroupMembershipViewSet
from rewards.views import RewardViewSet
# Add this line at the top with other imports
from posts.views import PostViewSet, PostCommentViewSet, PostTemplateViewSet, PublicPostsView
from learning.views import CourseViewSet, LearningCategoryViewSet, ChapterViewSet, ContentItemViewSet, upload_image

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
router.register(r'post-templates', PostTemplateViewSet, basename='post-templates')
router.register(r'learning/courses', CourseViewSet, basename='courses')
router.register(r'learning/categories', LearningCategoryViewSet, basename='learning-categories')
router.register(r'learning/chapters', ChapterViewSet, basename='learning-chapters')
router.register(r'learning/items', ContentItemViewSet, basename='learning-items')
# Youth Guardians endpoint
router.register(r'youth/guardians', YouthGuardiansViewSet, basename='youth-guardians')
# Guardian Children endpoint (for guardians to manage their connected youth)
router.register(r'guardian/children', GuardianChildrenViewSet, basename='guardian-children')
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
    
    # Public Posts (for homepage)
    path('public/posts/', PublicPostsView.as_view(), name='public-posts'),
    
    # --- LEARNING IMAGE UPLOAD ---
    path('learning/upload-image/', upload_image, name='learning-upload-image'),
    
    # --- ID DOCUMENT VERIFICATION (Guardians) ---
    path('users/upload_id_document/', IdDocumentUploadView.as_view(), name='upload-id-document'),
    path('users/<int:user_id>/review_id_document/', IdDocumentReviewView.as_view(), name='review-id-document'),
    
    # --- ID DOCUMENT HISTORY (New endpoints) ---
    path('users/id_document_history/', IdDocumentHistoryView.as_view(), name='id-document-history'),
    path('users/upload_id_document_v2/', IdDocumentUploadHistoryView.as_view(), name='upload-id-document-v2'),
    path('users/<int:user_id>/id_document_history/', AdminIdDocumentHistoryView.as_view(), name='admin-id-document-history'),
    path('users/id_documents/<int:upload_id>/review/', AdminIdDocumentReviewView.as_view(), name='admin-id-document-review'),
    path('users/pending_verifications/', GuardianPendingVerificationsView.as_view(), name='pending-verifications'),
    
    # --- MARKETING / PUBLIC CONTENT ---
    path('marketing/', include('marketing.urls')),
    
    # --- ROUTER ENDPOINTS ---
    path('', include(router.urls)), 
    path('', include('organization.urls')),
    path('notifications/', include('notifications.urls')),
    path('visits/', include('visits.urls')),
    path('inventory/', include('inventory.urls')),
    path('questionnaires/', include('questionnaires.urls')),
    path('bookings/', include('bookings.urls')),
    path('messenger/', include('messenger.urls')),
    path('', include('events.urls')),
    
    # --- LICENSING (Super Admin) ---
    path('licensing/', include('licensing.urls')),
    
    # --- 2FA (Two-Factor Authentication) ---
    path('', include('users.urls')),
]