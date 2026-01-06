from django.contrib import admin
from .models import Post, PostImage, PostComment, PostReaction, PostTemplate


class PostImageInline(admin.TabularInline):
    model = PostImage
    extra = 1
    fields = ('image', 'order')


class PostCommentInline(admin.TabularInline):
    model = PostComment
    extra = 0
    readonly_fields = ('author', 'content', 'parent', 'created_at')
    fields = ('author', 'content', 'parent', 'is_approved', 'created_at')
    can_delete = True
    show_change_link = True


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'status', 'post_type', 'owner_role', 'is_pinned', 'is_global', 'view_count', 'published_at', 'created_at')
    list_filter = ('status', 'post_type', 'owner_role', 'is_pinned', 'is_global', 'municipality', 'club', 'target_member_type')
    search_fields = ('title', 'content', 'author__email', 'author__first_name', 'author__last_name')
    readonly_fields = ('view_count', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('title', 'content', 'post_type', 'video_url')
        }),
        ('Ownership & Scope', {
            'fields': ('author', 'owner_role', 'municipality', 'club')
        }),
        ('Distribution', {
            'fields': ('is_global', 'target_municipalities', 'target_clubs'),
            'classes': ('collapse',)
        }),
        ('Publishing & Visibility', {
            'fields': ('status', 'published_at', 'visibility_start_date', 'visibility_end_date', 'is_pinned', 'pinned_until')
        }),
        ('Targeting', {
            'fields': ('target_member_type', 'target_groups', 'target_interests', 'target_genders', 'target_grades', 'target_min_age', 'target_max_age', 'target_custom_fields'),
            'classes': ('collapse',)
        }),
        ('Comment Settings', {
            'fields': ('allow_comments', 'require_moderation', 'limit_comments_per_user', 'allow_replies'),
            'classes': ('collapse',)
        }),
        ('Push Notification', {
            'fields': ('send_push_notification', 'push_title', 'push_message'),
            'classes': ('collapse',)
        }),
        ('Metrics & Metadata', {
            'fields': ('view_count', 'created_from_template', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    filter_horizontal = ('target_municipalities', 'target_clubs', 'target_groups', 'target_interests')
    inlines = [PostImageInline, PostCommentInline]
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('author', 'municipality', 'club')


@admin.register(PostImage)
class PostImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'post', 'order')
    list_filter = ('post',)
    search_fields = ('post__title',)


@admin.register(PostComment)
class PostCommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'post', 'author', 'content_preview', 'is_approved', 'parent', 'created_at')
    list_filter = ('is_approved', 'created_at')
    search_fields = ('content', 'author__email', 'post__title')
    readonly_fields = ('created_at', 'updated_at')
    list_editable = ('is_approved',)
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('author', 'post', 'parent')


@admin.register(PostReaction)
class PostReactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'post', 'user', 'reaction_type', 'created_at')
    list_filter = ('reaction_type', 'created_at')
    search_fields = ('user__email', 'post__title')
    readonly_fields = ('created_at',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'post')


@admin.register(PostTemplate)
class PostTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon', 'role_scope', 'created_by', 'usage_count', 'is_active', 'created_at')
    list_filter = ('role_scope', 'is_active', 'icon', 'municipality', 'club')
    search_fields = ('name', 'description', 'created_by__email')
    readonly_fields = ('usage_count', 'created_at', 'updated_at')
    list_editable = ('is_active',)
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'description', 'icon', 'is_active')
        }),
        ('Creator & Scope', {
            'fields': ('created_by', 'role_scope', 'municipality', 'club')
        }),
        ('Distribution', {
            'fields': ('is_global', 'target_municipalities', 'target_clubs'),
            'classes': ('collapse',)
        }),
        ('Default Post Type', {
            'fields': ('default_post_type',)
        }),
        ('Targeting', {
            'fields': ('target_member_type', 'target_groups', 'target_interests', 'target_min_age', 'target_max_age', 'target_grades', 'target_genders', 'target_custom_fields'),
            'classes': ('collapse',)
        }),
        ('Settings', {
            'fields': ('allow_comments', 'require_moderation', 'allow_replies', 'limit_comments_per_user', 'send_push_notification', 'default_push_title', 'default_push_message', 'is_pinned_default'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('usage_count', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    filter_horizontal = ('target_municipalities', 'target_clubs', 'target_groups', 'target_interests')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('created_by', 'municipality', 'club')
