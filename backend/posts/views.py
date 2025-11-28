from rest_framework import viewsets, permissions, status, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta

from .models import Post, PostComment
from .serializers import PostSerializer, PostCommentSerializer

class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser)

    def get_queryset(self):
        """
        Filter posts based on Admin Role (Section 2 of Doc).
        """
        user = self.request.user
        queryset = Post.objects.all().annotate(comment_count=Count('comments'))

        # 1. Super Admin sees ALL posts
        if user.role == 'SUPER_ADMIN':
            return queryset.order_by('-is_pinned', '-created_at')

        # 2. Municipality Admin sees their Muni + Clubs inside it
        if user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            return queryset.filter(
                Q(municipality=user.assigned_municipality) |
                Q(club__municipality=user.assigned_municipality)
            ).order_by('-is_pinned', '-created_at')

        # 3. Club Admin sees ONLY their Club
        if user.role == 'CLUB_ADMIN' and user.assigned_club:
            return queryset.filter(club=user.assigned_club).order_by('-is_pinned', '-created_at')

        # 4. If regular user (Fallback), show nothing (Admins only in this view)
        return Post.objects.none()

    def perform_create(self, serializer):
        """
        Auto-assign Owner Role and Scope (Municipality/Club) based on who is creating.
        """
        user = self.request.user
        
        save_kwargs = {'author': user}

        if user.role == 'SUPER_ADMIN':
            save_kwargs['owner_role'] = 'SUPER_ADMIN'
            # Super admins can optionally set muni/club manually in the form, 
            # but for now we default to global if not provided.
            
        elif user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            save_kwargs['owner_role'] = 'MUNICIPALITY_ADMIN'
            save_kwargs['municipality'] = user.assigned_municipality
            
        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            save_kwargs['owner_role'] = 'CLUB_ADMIN'
            save_kwargs['club'] = user.assigned_club
            # Club admins can only post to their own club - automatically set target_clubs
            # Note: target_clubs will be set in the serializer's create method
        else:
            raise PermissionDenied("You do not have permission to create posts.")
            
        post = serializer.save(**save_kwargs)
        
        # For club admins, automatically add their club to target_clubs if not already set
        if user.role == 'CLUB_ADMIN' and user.assigned_club:
            if not post.target_clubs.filter(id=user.assigned_club.id).exists():
                post.target_clubs.add(user.assigned_club)
        
        return post

    @action(detail=False, methods=['get'])
    def analytics_overview(self, request):
        """
        Analytics for the Management Dashboard (Section 13).
        """
        queryset = self.get_queryset()
        now = timezone.now()
        
        total_posts = queryset.count()
        last_7_days = queryset.filter(created_at__gte=now - timedelta(days=7)).count()
        last_30_days = queryset.filter(created_at__gte=now - timedelta(days=30)).count()
        
        # Calculate Average Views (avoid division by zero)
        total_views = sum([p.view_count for p in queryset])
        avg_views = (total_views / total_posts) if total_posts > 0 else 0

        return Response({
            "total_posts": total_posts,
            "created_last_7_days": last_7_days,
            "created_last_30_days": last_30_days,
            "average_views": round(avg_views, 1)
        })

class PostCommentViewSet(viewsets.ModelViewSet):
    serializer_class = PostCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = PostComment.objects.all().order_by('-created_at')
        
        # Allow filtering by post ID (e.g. /api/post-comments/?post_id=1)
        post_id = self.request.query_params.get('post_id')
        if post_id:
            queryset = queryset.filter(post_id=post_id)
            
        return queryset

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)