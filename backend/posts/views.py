from rest_framework import viewsets, permissions, status, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound
from django.db.models import Q, Count, Exists, OuterRef
from django.utils import timezone
from datetime import timedelta

from .models import Post, PostComment, PostReaction
from .serializers import PostSerializer, PostCommentSerializer
from .engine import PostEngine

class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser)

    def get_queryset(self):
        """
        Filter posts based on Admin Role (Section 2 of Doc).
        """
        user = self.request.user
        queryset = Post.objects.all().annotate(
            comment_count=Count('comments', filter=Q(comments__is_approved=True)),
            reaction_count=Count('reactions')
        )
        
        # Add user_has_reacted annotation if user is authenticated
        if user.is_authenticated:
            queryset = queryset.annotate(
                user_has_reacted=Exists(
                    PostReaction.objects.filter(
                        post=OuterRef('pk'),
                        user=user
                    )
                )
            )

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
    
    @action(detail=False, methods=['get'])
    def feed(self, request):
        """
        Personalized feed endpoint for regular users (Youth Members and Guardians).
        Uses PostEngine to filter posts based on targeting criteria.
        """
        user = request.user
        
        # Only allow Youth Members and Guardians to use the feed
        if user.role not in ['YOUTH_MEMBER', 'GUARDIAN']:
            raise PermissionDenied("Feed is only available for Youth Members and Guardians.")
        
        # Get posts using the PostEngine
        queryset = PostEngine.get_posts_for_user(user)
        
        # Paginate the results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post', 'delete', 'put'], url_path='react')
    def react(self, request, pk=None):
        """
        Add, update, or remove a reaction to a post.
        POST: Add a reaction (defaults to LIKE if not specified)
        PUT: Update existing reaction to a different type
        DELETE: Remove reaction
        """
        # Get the post directly, bypassing get_queryset restrictions
        # This allows regular users to react to posts they can see
        try:
            post = Post.objects.get(pk=pk)
        except Post.DoesNotExist:
            raise NotFound("Post not found.")
        
        user = request.user
        
        # Check if user can see this post
        if not PostEngine.user_can_see_post(user, post):
            raise PermissionDenied("You do not have permission to react to this post.")
        
        # Get reaction type from request (defaults to LIKE)
        reaction_type = request.data.get('reaction_type', 'LIKE')
        if reaction_type not in [choice[0] for choice in PostReaction.ReactionType.choices]:
            reaction_type = 'LIKE'
        
        if request.method == 'POST':
            # Add a reaction (or update if user already reacted with different type)
            reaction, created = PostReaction.objects.get_or_create(
                post=post,
                user=user,
                defaults={'reaction_type': reaction_type}
            )
            
            if not created:
                # User already reacted, update the reaction type
                reaction.reaction_type = reaction_type
                reaction.save()
            
            # Get reaction breakdown
            from django.db.models import Count
            reaction_breakdown = post.reactions.values('reaction_type').annotate(count=Count('id'))
            reaction_dict = {r['reaction_type']: r['count'] for r in reaction_breakdown}
            
            return Response({
                "message": f"Reaction added successfully.",
                "reaction_type": reaction_type,
                "reaction_count": post.reactions.count(),
                "reaction_breakdown": reaction_dict,
                "user_reaction": reaction_type
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        
        elif request.method == 'PUT':
            # Update existing reaction
            try:
                reaction = PostReaction.objects.get(post=post, user=user)
                reaction.reaction_type = reaction_type
                reaction.save()
                
                # Get reaction breakdown
                from django.db.models import Count
                reaction_breakdown = post.reactions.values('reaction_type').annotate(count=Count('id'))
                reaction_dict = {r['reaction_type']: r['count'] for r in reaction_breakdown}
                
                return Response({
                    "message": "Reaction updated successfully.",
                    "reaction_type": reaction_type,
                    "reaction_count": post.reactions.count(),
                    "reaction_breakdown": reaction_dict,
                    "user_reaction": reaction_type
                }, status=status.HTTP_200_OK)
            except PostReaction.DoesNotExist:
                # Create new reaction if it doesn't exist
                reaction = PostReaction.objects.create(
                    post=post,
                    user=user,
                    reaction_type=reaction_type
                )
                
                from django.db.models import Count
                reaction_breakdown = post.reactions.values('reaction_type').annotate(count=Count('id'))
                reaction_dict = {r['reaction_type']: r['count'] for r in reaction_breakdown}
                
                return Response({
                    "message": "Reaction added successfully.",
                    "reaction_type": reaction_type,
                    "reaction_count": post.reactions.count(),
                    "reaction_breakdown": reaction_dict,
                    "user_reaction": reaction_type
                }, status=status.HTTP_201_CREATED)
        
        elif request.method == 'DELETE':
            # Remove reaction (optionally filter by reaction_type)
            delete_reaction_type = request.data.get('reaction_type', None)
            if delete_reaction_type:
                deleted = PostReaction.objects.filter(
                    post=post, 
                    user=user, 
                    reaction_type=delete_reaction_type
                ).delete()[0]
            else:
                # Delete all reactions from this user for this post
                deleted = PostReaction.objects.filter(post=post, user=user).delete()[0]
            
            if deleted:
                from django.db.models import Count
                reaction_breakdown = post.reactions.values('reaction_type').annotate(count=Count('id'))
                reaction_dict = {r['reaction_type']: r['count'] for r in reaction_breakdown}
                
                return Response({
                    "message": "Reaction removed successfully.",
                    "reaction_count": post.reactions.count(),
                    "reaction_breakdown": reaction_dict,
                    "user_reaction": None
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "message": "No reaction found to remove.",
                    "reaction_count": post.reactions.count(),
                    "reaction_breakdown": {},
                    "user_reaction": None
                }, status=status.HTTP_200_OK)

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
        # Get the post to check if moderation is required
        post = serializer.validated_data.get('post')
        
        # If the post requires moderation, set is_approved to False
        if post and post.require_moderation:
            serializer.save(author=self.request.user, is_approved=False)
        else:
            serializer.save(author=self.request.user, is_approved=True)