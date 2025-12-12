from rest_framework import serializers
from .models import (
    LearningCategory, Course, CourseChapter, ContentItem, 
    UserCourseProgress, UserItemProgress, CourseRating
)

class LearningCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningCategory
        fields = ['id', 'name', 'slug']

class ContentItemSerializer(serializers.ModelSerializer):
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = ContentItem
        fields = [
            'id', 'chapter', 'type', 'title', 'order', 'estimated_duration',
            'video_url', 'text_content', 'file_upload', 'is_completed'
        ]

    def get_is_completed(self, obj):
        user = self.context['request'].user
        if not user.is_authenticated:
            return False
        
        # We need the parent Course Progress first
        # This is an optimization: ideally passed via context to avoid N+1 queries
        progress = self.context.get('course_progress')
        if progress:
            return UserItemProgress.objects.filter(
                user_progress=progress, content_item=obj, is_completed=True
            ).exists()
        return False

class CourseChapterSerializer(serializers.ModelSerializer):
    items = ContentItemSerializer(many=True, read_only=True)

    class Meta:
        model = CourseChapter
        fields = ['id', 'course', 'title', 'order', 'description', 'items']

class CourseListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views (no chapters/items)"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    user_progress = serializers.SerializerMethodField()
    rating_avg = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'description', 'cover_image',
            'category', 'category_name', 'visible_to_roles', 
            'status', 'published_at', 'user_progress', 'rating_avg'
        ]

    def get_user_progress(self, obj):
        user = self.context['request'].user
        if user.is_authenticated:
            try:
                progress = obj.user_progress.get(user=user)
                return {
                    'status': progress.status,
                    'percent_completed': progress.percent_completed
                }
            except UserCourseProgress.DoesNotExist:
                return None
        return None

    def get_rating_avg(self, obj):
        # simple average calculation
        ratings = obj.ratings.all()
        if ratings.exists():
            return sum(r.score for r in ratings) / ratings.count()
        return None

class CourseDetailSerializer(CourseListSerializer):
    """Full serializer including chapters and items"""
    chapters = CourseChapterSerializer(many=True, read_only=True)

    class Meta(CourseListSerializer.Meta):
        fields = CourseListSerializer.Meta.fields + ['chapters', 'meta_title', 'meta_description']

class UserCourseProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCourseProgress
        fields = ['id', 'status', 'percent_completed', 'last_accessed_at', 'completed_at']

class CourseRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseRating
        fields = ['id', 'course', 'score', 'created_at']
        read_only_fields = ['user']