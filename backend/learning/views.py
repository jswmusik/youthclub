from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Avg, Count
from .models import (
    LearningCategory, Course, CourseChapter, ContentItem, 
    UserCourseProgress, UserItemProgress, CourseRating
)
from .serializers import (
    LearningCategorySerializer, CourseListSerializer, 
    CourseDetailSerializer, CourseRatingSerializer,
    ContentItemSerializer, CourseChapterSerializer
)

class IsSuperAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role == 'SUPER_ADMIN'

class LearningCategoryViewSet(viewsets.ModelViewSet):
    queryset = LearningCategory.objects.all()
    serializer_class = LearningCategorySerializer
    permission_classes = [IsSuperAdminOrReadOnly]

class CourseViewSet(viewsets.ModelViewSet):
    """
    Main ViewSet for Courses.
    - Super Admins see everything and can edit.
    - Regular Users see only published courses matching their role.
    """
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'slug'

    def get_queryset(self):
        import json
        import traceback
        try:
            # #region agent log
            with open('/Users/ungdomsappen/the-youth-app/.cursor/debug.log', 'a') as f:
                f.write(json.dumps({'location':'views.py:get_queryset:entry','message':'get_queryset called','data':{'action':self.action,'user_role':self.request.user.role if self.request.user.is_authenticated else None,'user_authenticated':self.request.user.is_authenticated},'timestamp':int(__import__('time').time()*1000),'sessionId':'debug-session','runId':'run1','hypothesisId':'A'})+'\n')
            # #endregion
            
            # First, automatically publish any scheduled courses that have passed their published_at date
            # This ensures scheduled courses are published even if the cron job hasn't run yet
            now = timezone.now()
            scheduled_courses = Course.objects.filter(
                status=Course.Status.SCHEDULED,
                published_at__isnull=False,
                published_at__lte=now
            )
            if scheduled_courses.exists():
                scheduled_courses.update(status=Course.Status.PUBLISHED)
            
            user = self.request.user
            qs = Course.objects.all().prefetch_related('chapters__items')

            if user.role == 'SUPER_ADMIN':
                # #region agent log
                with open('/Users/ungdomsappen/the-youth-app/.cursor/debug.log', 'a') as f:
                    f.write(json.dumps({'location':'views.py:get_queryset:super_admin','message':'Returning all courses for super admin','data':{'queryset_count':qs.count()},'timestamp':int(__import__('time').time()*1000),'sessionId':'debug-session','runId':'run1','hypothesisId':'A'})+'\n')
                # #endregion
                return qs
            
            # Filter for normal users:
            # 1. Must be PUBLISHED
            # 2. visible_to_roles must be empty (public to all admins) OR contain user's role
            # For SQLite JSONField: Try database-level filtering first, fallback to Python if needed
            # #region agent log
            with open('/Users/ungdomsappen/the-youth-app/.cursor/debug.log', 'a') as f:
                f.write(json.dumps({'location':'views.py:get_queryset:before_filter','message':'Before filtering for non-super-admin','data':{'user_role':user.role,'qs_count':qs.count()},'timestamp':int(__import__('time').time()*1000),'sessionId':'debug-session','runId':'run1','hypothesisId':'B'})+'\n')
            # #endregion
            
            try:
                # Try database-level filtering (works for PostgreSQL, may work for SQLite)
                # For SQLite: visible_to_roles=[] checks for empty JSON array
                # visible_to_roles__icontains checks if role string appears in JSON (like news/views.py)
                filtered_qs = qs.filter(
                    status=Course.Status.PUBLISHED
                ).filter(
                    Q(visible_to_roles=[]) | Q(visible_to_roles__icontains=user.role)
                )
                # #region agent log
                with open('/Users/ungdomsappen/the-youth-app/.cursor/debug.log', 'a') as f:
                    f.write(json.dumps({'location':'views.py:get_queryset:db_filter_success','message':'Database-level filter succeeded','data':{'filtered_count':filtered_qs.count()},'timestamp':int(__import__('time').time()*1000),'sessionId':'debug-session','runId':'run1','hypothesisId':'B'})+'\n')
                # #endregion
                return filtered_qs
            except Exception as db_error:
                # #region agent log
                with open('/Users/ungdomsappen/the-youth-app/.cursor/debug.log', 'a') as f:
                    f.write(json.dumps({'location':'views.py:get_queryset:db_filter_failed','message':'Database-level filter failed, using Python filtering','data':{'error':str(db_error),'error_type':type(db_error).__name__},'timestamp':int(__import__('time').time()*1000),'sessionId':'debug-session','runId':'run1','hypothesisId':'C'})+'\n')
                # #endregion
                # Fallback to Python-side filtering (for SQLite JSONField compatibility)
                # This matches the pattern used in custom_fields/views.py for cross-DB safety
                filtered_qs = qs.filter(status=Course.Status.PUBLISHED)
                final_course_ids = []
                for course in filtered_qs.only('id', 'visible_to_roles'):
                    visible_roles = course.visible_to_roles if isinstance(course.visible_to_roles, list) else []
                    # Empty list means visible to all admins, OR user's role is in the list
                    if len(visible_roles) == 0 or user.role in visible_roles:
                        final_course_ids.append(course.id)
                # #region agent log
                with open('/Users/ungdomsappen/the-youth-app/.cursor/debug.log', 'a') as f:
                    f.write(json.dumps({'location':'views.py:get_queryset:python_filter','message':'Python-side filtering completed','data':{'filtered_count':len(final_course_ids),'final_course_ids':final_course_ids[:5]},'timestamp':int(__import__('time').time()*1000),'sessionId':'debug-session','runId':'run1','hypothesisId':'C'})+'\n')
                # #endregion
                return qs.filter(id__in=final_course_ids) if final_course_ids else qs.none()
        except Exception as e:
            # #region agent log
            with open('/Users/ungdomsappen/the-youth-app/.cursor/debug.log', 'a') as f:
                f.write(json.dumps({'location':'views.py:get_queryset:error','message':'Error in get_queryset','data':{'error':str(e),'error_type':type(e).__name__,'traceback':traceback.format_exc()},'timestamp':int(__import__('time').time()*1000),'sessionId':'debug-session','runId':'run1','hypothesisId':'C'})+'\n')
            # #endregion
            raise

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseListSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        # If retrieving a single course, pass the user's progress object 
        # to the context so items can check "is_completed" efficiently
        if self.action == 'retrieve' and self.request.user.is_authenticated:
            course = self.get_object()
            try:
                progress = UserCourseProgress.objects.get(user=self.request.user, course=course)
                context['course_progress'] = progress
            except UserCourseProgress.DoesNotExist:
                context['course_progress'] = None
        return context

    @decorators.action(detail=True, methods=['post'])
    def start(self, request, slug=None):
        """User explicitly starts a course"""
        course = self.get_object()
        progress, created = UserCourseProgress.objects.get_or_create(
            user=request.user, course=course
        )
        if created:
            progress.status = UserCourseProgress.Status.IN_PROGRESS
            progress.save()
        return Response({'status': 'started'})

    @decorators.action(detail=True, methods=['post'], url_path='mark-item-complete')
    def mark_item_complete(self, request, slug=None):
        """Marks a specific item as complete and recalculates course %"""
        course = self.get_object()
        item_id = request.data.get('item_id')
        
        try:
            item = ContentItem.objects.get(id=item_id, chapter__course=course)
        except ContentItem.DoesNotExist:
            return Response({'error': 'Item not found in this course'}, status=404)

        # 1. Get/Create Course Progress
        course_prog, _ = UserCourseProgress.objects.get_or_create(
            user=request.user, course=course,
            defaults={'status': UserCourseProgress.Status.IN_PROGRESS}
        )
        
        # 2. Mark Item Complete
        UserItemProgress.objects.get_or_create(
            user_progress=course_prog, content_item=item,
            defaults={'is_completed': True}
        )

        # 3. Recalculate Totals
        total_items = ContentItem.objects.filter(chapter__course=course).count()
        completed_items = UserItemProgress.objects.filter(
            user_progress=course_prog, is_completed=True
        ).count()

        if total_items > 0:
            percentage = int((completed_items / total_items) * 100)
            course_prog.percent_completed = percentage
            
            if percentage == 100:
                course_prog.status = UserCourseProgress.Status.COMPLETED
                course_prog.completed_at = timezone.now()
            
            course_prog.save()

        return Response({
            'item_id': item_id,
            'is_completed': True,
            'course_percent': course_prog.percent_completed,
            'course_status': course_prog.status
        })
    
    @decorators.action(detail=True, methods=['post'])
    def rate(self, request, slug=None):
        course = self.get_object()
        score = request.data.get('score')
        
        # Simple validation
        if not score or not (1 <= int(score) <= 5):
            return Response({'error': 'Score must be between 1 and 5'}, status=400)
            
        rating, created = CourseRating.objects.update_or_create(
            user=request.user, course=course,
            defaults={'score': score}
        )
        return Response({'status': 'rated', 'score': rating.score})

    @decorators.action(detail=True, methods=['get'])
    def analytics(self, request, slug=None):
        """Returns stats for the specific course (Super Admin only)"""
        if request.user.role != 'SUPER_ADMIN':
            return Response({'error': 'Unauthorized'}, status=403)
            
        course = self.get_object()
        
        # Total users who have any progress record (started or viewed)
        total_with_progress = UserCourseProgress.objects.filter(course=course).count()
        
        # Users who started (IN_PROGRESS or COMPLETED)
        total_started = UserCourseProgress.objects.filter(
            course=course
        ).exclude(status=UserCourseProgress.Status.NOT_STARTED).count()
        
        # Users who completed
        total_completed = UserCourseProgress.objects.filter(
            course=course, status=UserCourseProgress.Status.COMPLETED
        ).count()
        
        # Users who viewed but didn't start (NOT_STARTED)
        total_viewed = UserCourseProgress.objects.filter(
            course=course, status=UserCourseProgress.Status.NOT_STARTED
        ).count()
        
        ratings_qs = course.ratings.all()
        total_ratings = ratings_qs.count()
        avg_rating = ratings_qs.aggregate(Avg('score'))['score__avg'] or 0
        
        return Response({
            'total_students': total_started,
            'completions': total_completed,
            'viewed': total_viewed,
            'completion_rate': int((total_completed / total_started * 100)) if total_started > 0 else 0,
            'average_rating': round(avg_rating, 1),
            'total_ratings': total_ratings
        })

class ChapterViewSet(viewsets.ModelViewSet):
    queryset = CourseChapter.objects.all()
    serializer_class = CourseChapterSerializer
    permission_classes = [IsSuperAdminOrReadOnly]

class ContentItemViewSet(viewsets.ModelViewSet):
    queryset = ContentItem.objects.all()
    serializer_class = ContentItemSerializer
    permission_classes = [IsSuperAdminOrReadOnly]


@decorators.api_view(['POST'])
@decorators.permission_classes([permissions.IsAuthenticated])
def upload_image(request):
    """
    Upload an image for use in rich text content.
    Returns the URL of the uploaded image.
    """
    if 'image' not in request.FILES:
        return Response({'error': 'No image file provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    image_file = request.FILES['image']
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if image_file.content_type not in allowed_types:
        return Response({'error': 'Invalid file type. Only images are allowed.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate file size (max 5MB)
    if image_file.size > 5 * 1024 * 1024:
        return Response({'error': 'File size exceeds 5MB limit'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Save the file using Django's FileField pattern
    from django.core.files.storage import default_storage
    from django.utils import timezone
    import os
    import uuid
    from django.utils.text import slugify
    
    # Sanitize filename to avoid encoding issues
    original_name = image_file.name
    name, ext = os.path.splitext(original_name)
    # Remove special characters and normalize
    safe_name = slugify(name) or 'image'
    # Generate unique filename
    timestamp = int(timezone.now().timestamp())
    unique_id = str(uuid.uuid4())[:8]
    filename = f"courses/images/{timestamp}_{unique_id}_{safe_name}{ext}"
    
    # Save file - default_storage.save() returns the relative path from MEDIA_ROOT
    file_path = default_storage.save(filename, image_file)
    
    # Return the URL - use MEDIA_URL which is '/media/'
    from django.conf import settings
    # file_path is relative to MEDIA_ROOT, so we prepend MEDIA_URL
    # Example: file_path = "courses/images/file.png", MEDIA_URL = "/media/"
    # Result: "/media/courses/images/file.png"
    relative_path = file_path  # Already relative to MEDIA_ROOT
    media_url = f"{settings.MEDIA_URL.rstrip('/')}/{relative_path}".replace('//', '/')
    
    return Response({
        'url': media_url,  # Full URL path like "/media/courses/images/file.png"
        'image': relative_path  # Relative path like "courses/images/file.png"
    }, status=status.HTTP_201_CREATED)