from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
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

class ChapterViewSet(viewsets.ModelViewSet):
    queryset = CourseChapter.objects.all()
    serializer_class = CourseChapterSerializer
    permission_classes = [IsSuperAdminOrReadOnly]

class ContentItemViewSet(viewsets.ModelViewSet):
    queryset = ContentItem.objects.all()
    serializer_class = ContentItemSerializer
    permission_classes = [IsSuperAdminOrReadOnly]