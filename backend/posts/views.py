from rest_framework import viewsets, permissions, status, parsers, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import PermissionDenied, NotFound
from django.db.models import Q, Count, Exists, OuterRef, F
from django.db.models.functions import Sqrt, Power
from django.utils import timezone
from datetime import timedelta
from django_filters.rest_framework import DjangoFilterBackend

from .models import Post, PostComment, PostReaction, PostTemplate, PostImage
from .serializers import PostSerializer, PostCommentSerializer, PostTemplateSerializer, PostTemplateListSerializer
from .engine import PostEngine

# Import Reward models
from rewards.models import RewardUsage
from core.permissions import HasLicenseFeature
from users.models import User


class PublicPostsView(APIView):
    """
    Public endpoint for fetching posts for the homepage.
    Returns published posts with images, targeting youth members,
    not assigned to groups, sorted by distance if location provided.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        now = timezone.now()
        
        # Base query: Published posts from clubs, targeting youth (or both), not group-specific
        qs = Post.objects.filter(
            status=Post.Status.PUBLISHED,
            target_member_type__in=[Post.TargetMemberType.YOUTH, Post.TargetMemberType.BOTH],
            # Only posts from clubs (owner_role is CLUB_ADMIN and has a club)
            owner_role=Post.OwnerRole.CLUB_ADMIN,
            club__isnull=False,
        ).filter(
            # Published and within visibility window
            Q(published_at__isnull=True) | Q(published_at__lte=now),
            Q(visibility_start_date__isnull=True) | Q(visibility_start_date__lte=now),
            Q(visibility_end_date__isnull=True) | Q(visibility_end_date__gte=now),
        ).filter(
            # Only posts with at least one image
            images__isnull=False
        ).select_related('club', 'club__municipality', 'author').prefetch_related('images').distinct()
        
        # Exclude posts that target specific groups
        qs = qs.annotate(
            group_count=Count('target_groups')
        ).filter(group_count=0)
        
        # Exclude activity posts and auto-generated posts
        qs = qs.exclude(title__startswith='Borrowed ')
        qs = qs.exclude(title__startswith='Returned ')
        qs = qs.exclude(title__startswith='Completed Questionnaire: ')
        qs = qs.exclude(title__startswith='Joined ')
        qs = qs.exclude(title__startswith='Ny Grupp: ')  # Auto-generated group announcement posts
        
        # Geolocation filtering (sort by distance to club)
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        
        if lat and lng:
            try:
                lat = float(lat)
                lng = float(lng)
                # Filter posts from clubs with coordinates and annotate with distance
                qs = qs.filter(club__latitude__isnull=False, club__longitude__isnull=False)
                qs = qs.annotate(
                    distance=Sqrt(
                        Power(F('club__latitude') - lat, 2) +
                        Power(F('club__longitude') - lng, 2)
                    )
                ).order_by('distance', '-published_at', '-created_at')
            except ValueError:
                qs = qs.order_by('-is_pinned', '-published_at', '-created_at')
        else:
            qs = qs.order_by('-is_pinned', '-published_at', '-created_at')
        
        # Limit results
        limit = int(request.query_params.get('limit', 6))
        qs = qs[:limit]
        
        # Serialize
        posts_data = []
        for post in qs:
            first_image = post.images.first()
            # Get municipality from club if available
            municipality = post.club.municipality if post.club else post.municipality
            posts_data.append({
                'id': post.id,
                'title': post.title,
                'content': post.content[:200] + '...' if len(post.content) > 200 else post.content,
                'image': first_image.image.url if first_image else None,
                'post_type': post.post_type,
                'club_name': post.club.name if post.club else None,
                'club_slug': post.club.slug if post.club else None,
                'club_avatar': post.club.avatar.url if post.club and post.club.avatar else None,
                'municipality_name': municipality.name if municipality else None,
                'municipality_slug': municipality.slug if municipality else None,
                'published_at': post.published_at.isoformat() if post.published_at else post.created_at.isoformat(),
                'view_count': post.view_count,
                'distance': getattr(post, 'distance', None),
            })
        
        return Response({
            'results': posts_data,
            'count': len(posts_data)
        })

class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    parser_classes = (parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser)
    
    def get_permissions(self):
        """
        Apply license-based permissions for the posts feature.
        """
        permission_classes = [permissions.IsAuthenticated]
        permission_classes.append(HasLicenseFeature('posts')())
        return [permission() for permission in permission_classes]

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
        # Show posts where:
        # - The club field matches their assigned club (posts they own)
        # - OR their club is in target_clubs (posts targeted to their club)
        if user.role == 'CLUB_ADMIN' and user.assigned_club:
            return queryset.filter(
                Q(club=user.assigned_club) | 
                Q(target_clubs=user.assigned_club)
            ).distinct().order_by('-is_pinned', '-created_at')

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
        Personalized feed for Youth Members/Guardians.
        Youth: Sees all posts based on standard engine rules.
        Guardian: Sees posts from clubs their children belong to/follow + their own followed clubs.
                  Filters out Rewards and New Group notifications.
        """
        user = request.user
        
        if user.role not in ['YOUTH_MEMBER', 'GUARDIAN']:
            raise PermissionDenied("Feed is only available for Youth Members and Guardians.")
        
        # --- 1. Get Posts ---
        if user.role == 'YOUTH_MEMBER':
            # Standard logic for youth
            queryset = PostEngine.get_posts_for_user(user)
            # Exclude posts authored by the user
            queryset = queryset.exclude(author=user)
            # Exclude inventory/activity posts and auto-generated posts
            queryset = queryset.exclude(title__startswith='Borrowed ')
            queryset = queryset.exclude(title__startswith='Returned ')
            queryset = queryset.exclude(title__startswith='Completed Questionnaire: ')
            queryset = queryset.exclude(title__startswith='Joined ')
            queryset = queryset.exclude(title__istartswith='Ny Grupp')
            queryset = queryset.exclude(title__istartswith='New Group')
            
        elif user.role == 'GUARDIAN':
            # Guardian Logic: Aggregate from children
            # 1a. Get children IDs
            child_ids = user.youth_links.filter(status='ACTIVE').values_list('youth_id', flat=True)
            children = User.objects.filter(id__in=child_ids).prefetch_related('preferred_club', 'followed_clubs')
            
            # 1b. Collect Club IDs (Children's clubs + Guardian's followed clubs)
            club_ids = set()
            municipality_ids = set()
            
            # Add guardian's own followed clubs
            for fc in user.followed_clubs.all(): 
                club_ids.add(fc.id)
                if fc.municipality_id:
                    municipality_ids.add(fc.municipality_id)
            
            # Add children's clubs
            for child in children:
                if child.preferred_club: 
                    club_ids.add(child.preferred_club.id)
                    if child.preferred_club.municipality_id:
                        municipality_ids.add(child.preferred_club.municipality_id)
                for fc in child.followed_clubs.all(): 
                    club_ids.add(fc.id)
                    if fc.municipality_id:
                        municipality_ids.add(fc.municipality_id)
            
            # Also add guardian's assigned municipality
            if user.assigned_municipality_id:
                municipality_ids.add(user.assigned_municipality_id)
            
            # 1c. Filter Posts
            now = timezone.now()
            
            # Build the query to include:
            # - Posts from specific clubs (club_id in club_ids)
            # - Global posts (no club, no municipality - from super admin)
            # - Municipality posts (municipality in municipality_ids, no club)
            queryset = Post.objects.filter(
                status=Post.Status.PUBLISHED,
            ).filter(
                # Visibility window
                Q(published_at__isnull=True) | Q(published_at__lte=now),
                Q(visibility_start_date__isnull=True) | Q(visibility_start_date__lte=now),
                Q(visibility_end_date__isnull=True) | Q(visibility_end_date__gte=now),
            ).filter(
                # Only show posts targeting guardians or both
                target_member_type__in=[Post.TargetMemberType.GUARDIAN, Post.TargetMemberType.BOTH]
            ).filter(
                # Posts from: specific clubs OR global (super admin) OR municipality level
                Q(club_id__in=club_ids) |  # Club posts
                Q(club__isnull=True, municipality__isnull=True) |  # Global posts (super admin)
                Q(club__isnull=True, municipality_id__in=municipality_ids)  # Municipality posts
            ).exclude(
                # Explicitly exclude specific auto-generated types for Guardians
                # "New group", "rewards" etc.
                Q(title__istartswith='Ny Grupp') | 
                Q(title__istartswith='New Group') |
                Q(title__istartswith='Reward') |
                Q(title__istartswith='Belöning') |
                Q(title__startswith='Borrowed ') |
                Q(title__startswith='Returned ') |
                Q(title__startswith='Joined ')
            ).distinct().order_by('-is_pinned', '-published_at', '-created_at')
            
            # Annotate
            queryset = queryset.annotate(
                comment_count=Count('comments', filter=Q(comments__is_approved=True)),
                reaction_count=Count('reactions'),
                user_has_reacted=Exists(
                    PostReaction.objects.filter(post=OuterRef('pk'), user=user)
                )
            )
        
        # 2. Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={'request': request})
            feed_items = serializer.data
            for item in feed_items: 
                item['feed_type'] = 'POST'
        else:
            serializer = self.get_serializer(queryset, many=True, context={'request': request})
            feed_items = serializer.data
            for item in feed_items:
                item['feed_type'] = 'POST'

        # 3. Inject Rewards and Questionnaires (Only on Page 1)
        current_page = request.query_params.get('page', '1')
        is_first_page = str(current_page) == '1'
        
        import logging
        logger = logging.getLogger(__name__)
        
        # Initialize empty lists
        rewards_data = []
        questionnaires_data = []
        events_data = []
        
        if is_first_page:
            from questionnaires.models import Questionnaire, QuestionnaireResponse
            
            # --- Rewards (YOUTH ONLY) ---
            # Guardians don't earn rewards in this system (usually)
            if user.role == 'YOUTH_MEMBER':
                rewards = RewardUsage.objects.filter(
                    user=user, 
                    is_redeemed=False
                ).select_related('reward').order_by('-created_at')

                for usage in rewards:
                    rewards_data.append({
                        'id': f"reward_{usage.id}",
                        'feed_type': 'REWARD',
                        'title': usage.reward.name,
                        'description': usage.reward.description,
                        'image': usage.reward.image.url if usage.reward.image else None,
                        'created_at': usage.created_at.isoformat() if usage.created_at else None,
                        'usage_id': usage.id,
                        'sponsor': usage.reward.sponsor_name,
                    })
            
            # --- Questionnaires (YOUTH & GUARDIAN) ---
            now = timezone.now()
            
            # Base: Published, Started, Not Expired
            qs = Questionnaire.objects.filter(
                status=Questionnaire.Status.PUBLISHED,
                start_date__lte=now,
                expiration_date__gte=now
            ).select_related('municipality', 'club', 'visibility_group')
            
            # Targeting Logic
            # A. Group Targeting (Youth only usually, or Guardian if in specific parent groups)
            group_ids = user.group_memberships.values_list('group', flat=True)
            group_q = Q(visibility_group__in=group_ids) if group_ids.exists() else Q(pk__in=[])
            
            # B. Scope Targeting (Global / Muni / Club)
            global_q = Q(municipality__isnull=True, club__isnull=True)
            
            scope_q = Q()
            # For Youth: Use preferred_club
            if user.role == 'YOUTH_MEMBER' and user.preferred_club:
                if user.preferred_club.municipality:
                    scope_q |= Q(municipality=user.preferred_club.municipality, club__isnull=True, visibility_group__isnull=True)
                scope_q |= Q(club=user.preferred_club, visibility_group__isnull=True)
                
            # For Guardian: Aggregated scope from children + own assigned (if any)
            if user.role == 'GUARDIAN':
                # Get club_ids from the guardian logic above (if defined)
                # We need to recalculate here since we're in a new scope
                guardian_club_ids = set()
                for fc in user.followed_clubs.all(): 
                    guardian_club_ids.add(fc.id)
                child_ids = user.youth_links.filter(status='ACTIVE').values_list('youth_id', flat=True)
                children = User.objects.filter(id__in=child_ids).prefetch_related('preferred_club', 'followed_clubs')
                for child in children:
                    if child.preferred_club: 
                        guardian_club_ids.add(child.preferred_club.id)
                    for fc in child.followed_clubs.all(): 
                        guardian_club_ids.add(fc.id)
                
                if guardian_club_ids:
                    # Get municipalities for these clubs
                    from organization.models import Club
                    muni_ids = Club.objects.filter(id__in=guardian_club_ids).values_list('municipality_id', flat=True).distinct()
                    
                    scope_q |= Q(club_id__in=guardian_club_ids, visibility_group__isnull=True)
                    scope_q |= Q(municipality_id__in=muni_ids, club__isnull=True, visibility_group__isnull=True)

            # C. Role Targeting
            role_target_q = Q()
            if user.role == 'YOUTH_MEMBER':
                role_target_q = Q(target_audience__in=['YOUTH', 'BOTH'])
            elif user.role == 'GUARDIAN':
                role_target_q = Q(target_audience__in=['GUARDIAN', 'BOTH'])
            
            # Combine: (Group OR (Scope AND Role) OR (Global AND Role))
            if role_target_q:
                available_questionnaires = qs.filter(
                    group_q | 
                    (global_q & role_target_q) | 
                    (scope_q & role_target_q)
                ).distinct()
            else:
                available_questionnaires = Questionnaire.objects.none()
            
            # Exclude completed
            completed_ids = QuestionnaireResponse.objects.filter(
                user=user,
                status=QuestionnaireResponse.Status.COMPLETED
            ).values_list('questionnaire_id', flat=True)
            available_questionnaires = available_questionnaires.exclude(id__in=completed_ids)
            
            # Serialize Questionnaires
            for q in available_questionnaires.order_by('-created_at')[:5]:
                questionnaires_data.append({
                    'id': f"questionnaire_{q.id}",
                    'feed_type': 'QUESTIONNAIRE',
                    'questionnaire_id': q.id,
                    'title': q.title,
                    'description': q.description,
                    'created_at': q.created_at.isoformat() if q.created_at else None,
                    'has_rewards': q.rewards.exists(),
                    'is_started': False,
                    'progress': 0,
                })
            
            # --- Events (YOUTH & GUARDIAN) ---
            from events.services import get_events_for_user, filter_events_by_targeting
            from events.serializers import EventSerializer
            from events.models import Event
            
            try:
                if user.role == 'YOUTH_MEMBER':
                    user_events = get_events_for_user(user)
                elif user.role == 'GUARDIAN':
                    # Guardian sees events for ALL children
                    # Get base events (published)
                    base_events = Event.objects.filter(status='PUBLISHED', start_date__gte=now)
                    
                    # 1. Global events (visible to all)
                    visible_event_ids = set(base_events.filter(is_global=True).values_list('id', flat=True))
                    
                    # 2. Iterate children
                    child_ids = user.youth_links.filter(status='ACTIVE').values_list('youth_id', flat=True)
                    children = User.objects.filter(id__in=child_ids)
                    
                    for child in children:
                        # Use service to get IDs visible to this child
                        child_visible_ids = filter_events_by_targeting(base_events, child)
                        visible_event_ids.update(child_visible_ids)
                        
                    user_events = Event.objects.filter(id__in=visible_event_ids).order_by('start_date')

                # Limit to next 5
                user_events = user_events[:5]
                
                # Serialize
                event_serializer = EventSerializer(user_events, many=True, context={'request': request})
                events_data = event_serializer.data
                for event_item in events_data:
                    event_item['feed_type'] = 'EVENT'
                    
            except Exception as e:
                # Log error but don't crash feed
                logger.error(f"Error fetching events for feed: {e}")
                events_data = []
            
            # Combine and Sort
            all_items = rewards_data + questionnaires_data + events_data + feed_items
            
            def get_sort_key(item):
                date_str = item.get('published_at') or item.get('created_at') or ''
                if isinstance(date_str, str): return date_str
                if hasattr(date_str, 'isoformat'): return date_str.isoformat()
                return ''
            
            all_items.sort(key=get_sort_key, reverse=True)
            feed_items = all_items

        if page is not None:
            return self.get_paginated_response(feed_items)
        
        return Response(feed_items)
    
    @action(detail=True, methods=['get'])
    def club_feed(self, request, pk=None):
        """
        Returns the timeline for a SPECIFIC club (pk).
        It filters posts to only those CREATED BY this club (not just targeted to it),
        THEN applies security filters (member type, age, gender, etc.)
        but BYPASSES club targeting check since user is explicitly viewing this club's page.
        Only shows actual posts (excludes activity posts like borrowed/returned items, 
        completed questionnaires, joined groups, etc.)
        """
        user = request.user
        now = timezone.now()
        
        # 1. Initial Source Filter: Only posts CREATED BY this club
        # We only show posts where the club field matches AND owner_role is CLUB_ADMIN
        # This excludes posts from super admin or municipality admin that are just targeted to the club
        queryset = Post.objects.filter(
            club_id=pk,
            owner_role=Post.OwnerRole.CLUB_ADMIN,
            status=Post.Status.PUBLISHED
        ).filter(
            Q(published_at__isnull=True) | Q(published_at__lte=now)
        ).filter(
            Q(visibility_start_date__isnull=True) | Q(visibility_start_date__lte=now)
        ).filter(
            Q(visibility_end_date__isnull=True) | Q(visibility_end_date__gte=now)
        )
        
        # 2. Apply member type filter based on user role
        # Guardians see posts targeting GUARDIAN or BOTH
        # Youth see posts targeting YOUTH or BOTH
        if user.role == 'GUARDIAN':
            queryset = queryset.filter(
                target_member_type__in=[Post.TargetMemberType.GUARDIAN, Post.TargetMemberType.BOTH]
            )
        elif user.role == 'YOUTH_MEMBER':
            queryset = queryset.filter(
                target_member_type__in=[Post.TargetMemberType.YOUTH, Post.TargetMemberType.BOTH]
            )
        
        # 3. Exclude activity posts (only show actual posts)
        # These are auto-generated activity posts that should only appear in user's activity feed
        queryset = queryset.exclude(title__startswith='Borrowed ')
        queryset = queryset.exclude(title__startswith='Returned ')
        queryset = queryset.exclude(title__startswith='Completed Questionnaire: ')
        queryset = queryset.exclude(title__startswith='Joined ')
        queryset = queryset.exclude(title__istartswith='Ny Grupp')
        queryset = queryset.exclude(title__istartswith='New Group')
        
        # 4. Add annotations (same as feed)
        queryset = queryset.annotate(
            comment_count=Count('comments', filter=Q(comments__is_approved=True)),
            reaction_count=Count('reactions')
        )
        
        # Add user_has_reacted annotation
        queryset = queryset.annotate(
            user_has_reacted=Exists(
                PostReaction.objects.filter(
                    post=OuterRef('pk'),
                    user=user
                )
            )
        )
        
        # Order by published_at (or created_at as fallback)
        queryset = queryset.order_by('-is_pinned', '-published_at', '-created_at')
        
        # 5. Pagination & Serialization
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='group_feed')
    def group_feed(self, request):
        """
        Returns posts for a SPECIFIC group (group ID passed as query parameter).
        Filters posts that target this group, then applies PostEngine filters
        but bypasses group membership check (since we're already filtering by group).
        Also includes posts authored by the current user.
        """
        user = request.user
        group_id = request.query_params.get('group')
        
        if not group_id:
            return Response(
                {"error": "group query parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            group_id = int(group_id)
        except ValueError:
            return Response(
                {"error": "group must be a valid integer"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 1. Filter posts that target this group
        # Exclude activity posts (posts with titles starting with "Joined ") - these are personal activity posts
        group_posts = Post.objects.filter(
            Q(target_groups__id=group_id) & ~Q(title__startswith='Joined ')
        ).distinct()
        
        # 2. Apply PostEngine to get posts user can see (this includes group membership check)
        # Then manually add back posts that target this group but user might not be member of
        engine_posts = PostEngine.get_posts_for_user(user, queryset=group_posts)
        engine_post_ids = set(engine_posts.values_list('id', flat=True))
        
        # 3. Also include posts that target this group and pass other checks (age, gender, etc.)
        # but bypass group membership requirement
        # Exclude activity posts (posts with titles starting with "Joined ")
        now = timezone.now()
        additional_posts = group_posts.filter(
            status=Post.Status.PUBLISHED
        ).filter(
            Q(published_at__isnull=True) | Q(published_at__lte=now)
        ).filter(
            Q(visibility_start_date__isnull=True) | Q(visibility_start_date__lte=now)
        ).filter(
            Q(visibility_end_date__isnull=True) | Q(visibility_end_date__gte=now)
        ).filter(
            target_groups__id=group_id  # Must target this group
        ).exclude(
            title__startswith='Joined '  # Exclude activity posts
        )
        
        # Apply other PostEngine checks manually (member type, age, gender, interests)
        # but skip group membership check
        from users.models import User
        from datetime import date
        
        matching_additional_ids = []
        for post in additional_posts:
            if post.id in engine_post_ids:
                continue  # Already included
            
            # Check member type
            if user.role == User.Role.YOUTH_MEMBER:
                if post.target_member_type not in [Post.TargetMemberType.YOUTH, Post.TargetMemberType.BOTH]:
                    continue
            elif user.role == User.Role.GUARDIAN:
                if post.target_member_type not in [Post.TargetMemberType.GUARDIAN, Post.TargetMemberType.BOTH]:
                    continue
            
            # Check age (if specified)
            if user.date_of_birth and (post.target_min_age or post.target_max_age):
                today = date.today()
                age = today.year - user.date_of_birth.year - ((today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day))
                if post.target_min_age and age < post.target_min_age:
                    continue
                if post.target_max_age and age > post.target_max_age:
                    continue
            
            # Check gender (if specified)
            if post.target_genders and len(post.target_genders) > 0:
                if user.legal_gender not in post.target_genders:
                    continue
            
            # Check interests (if specified)
            if post.target_interests.exists():
                user_interest_ids = set(user.interests.values_list('id', flat=True))
                post_interest_ids = set(post.target_interests.values_list('id', flat=True))
                if not user_interest_ids.intersection(post_interest_ids):
                    continue
            
            # Check grades (if specified)
            if post.target_grades and len(post.target_grades) > 0:
                if user.grade not in post.target_grades:
                    continue
            
            matching_additional_ids.append(post.id)
        
        # Combine both sets of posts
        all_post_ids = list(engine_post_ids) + matching_additional_ids
        
        # If no posts found, return empty queryset
        if not all_post_ids:
            queryset = Post.objects.none()
        else:
            queryset = Post.objects.filter(id__in=all_post_ids)
        
        # 4. Add annotations (same as feed)
        queryset = queryset.annotate(
            comment_count=Count('comments', filter=Q(comments__is_approved=True)),
            reaction_count=Count('reactions')
        )
        
        # Add user_has_reacted annotation
        queryset = queryset.annotate(
            user_has_reacted=Exists(
                PostReaction.objects.filter(
                    post=OuterRef('pk'),
                    user=user
                )
            )
        )
        
        # Order by published_at (or created_at as fallback)
        queryset = queryset.order_by('-is_pinned', '-published_at', '-created_at')
        
        # 5. Pagination & Serialization
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def interacted(self, request):
        """
        Returns posts that the current user has interacted with (reacted or commented).
        Falls back to standard feed if no interacted posts exist.
        """
        user = request.user
        
        # Only allow Youth Members and Guardians to use this endpoint
        if user.role not in ['YOUTH_MEMBER', 'GUARDIAN']:
            raise PermissionDenied("Interacted posts are only available for Youth Members and Guardians.")
        
        # Get posts where user has reacted OR commented
        posts_interacted = Post.objects.filter(
            Q(reactions__user=user) | Q(comments__author=user)
        ).distinct()
        
        # Apply PostEngine filtering to ensure user can see these posts
        posts_interacted = PostEngine.get_posts_for_user(user, queryset=posts_interacted)
        
        # If no interacted posts exist, fallback to standard feed
        if not posts_interacted.exists():
            queryset = PostEngine.get_posts_for_user(user)
        else:
            queryset = posts_interacted
        
        # Order by published_at (or created_at as fallback)
        queryset = queryset.order_by('-published_at', '-created_at')
        
        # Add annotations (same as feed)
        queryset = queryset.annotate(
            comment_count=Count('comments', filter=Q(comments__is_approved=True)),
            reaction_count=Count('reactions')
        )
        
        # Add user_has_reacted annotation
        queryset = queryset.annotate(
            user_has_reacted=Exists(
                PostReaction.objects.filter(
                    post=OuterRef('pk'),
                    user=user
                )
            )
        )
        
        # Paginate the results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def interactions(self, request):
        """
        Return posts the user has interacted with (Reacted or Commented).
        If no interactions found, falls back to the standard feed.
        Supports time_filter query parameter: 'day', 'week', 'month', or 'forever' (default).
        """
        user = request.user
        if not user.is_authenticated:
            raise PermissionDenied()

        # Get time filter from query params
        time_filter = request.query_params.get('time_filter', 'forever')
        now = timezone.now()
        
        # Calculate date threshold based on filter
        if time_filter == 'day':
            threshold_date = now - timedelta(days=1)
        elif time_filter == 'week':
            threshold_date = now - timedelta(days=7)
        elif time_filter == 'month':
            threshold_date = now - timedelta(days=30)
        else:  # 'forever' or invalid
            threshold_date = None

        # 1. Query for interactions (Reacted OR Commented OR Authored)
        # IMPORTANT: Posts authored by the user should ALWAYS be visible to them,
        # regardless of PostEngine filtering, so we handle them separately
        
        # Get posts the user authored (activity posts like group joins)
        # These are ALWAYS visible to the author, no PostEngine filtering needed
        authored_posts = Post.objects.filter(
            author=user,
            status=Post.Status.PUBLISHED
        )
        
        # Get posts the user interacted with (reacted or commented)
        # These need PostEngine filtering to ensure user can see them
        interacted_posts = Post.objects.filter(
            Q(reactions__user=user) | 
            Q(comments__author=user)
        ).distinct()
        
        # Apply PostEngine filtering to interacted posts only
        interacted_posts = PostEngine.get_posts_for_user(user, queryset=interacted_posts)
        
        # Combine both querysets - use Q objects for proper OR logic
        queryset = Post.objects.filter(
            Q(id__in=authored_posts.values_list('id', flat=True)) |
            Q(id__in=interacted_posts.values_list('id', flat=True))
        ).distinct()
        
        # Exclude "Joined" posts that are NOT authored by the current user
        # (User should only see their own group join activity, not others')
        queryset = queryset.exclude(
            Q(title__startswith='Joined ') & ~Q(author=user)
        )
        # Exclude "New Group" announcement posts entirely (these are system posts)
        queryset = queryset.exclude(title__istartswith='Ny Grupp')
        queryset = queryset.exclude(title__istartswith='New Group')
        
        # Apply time filter if specified
        if threshold_date:
            queryset = queryset.filter(
                Q(published_at__gte=threshold_date) | 
                Q(published_at__isnull=True, created_at__gte=threshold_date)
            )
        
        queryset = queryset.order_by('-published_at', '-created_at')

        # 2. Fallback: If no interactions, show standard feed
        if not queryset.exists():
            # Use the engine to get relevant posts (same as /feed/)
            queryset = PostEngine.get_posts_for_user(user)
            # Exclude "Joined" posts that are NOT authored by the current user
            queryset = queryset.exclude(
                Q(title__startswith='Joined ') & ~Q(author=user)
            )
            # Exclude "New Group" announcement posts entirely
            queryset = queryset.exclude(title__istartswith='Ny Grupp')
            queryset = queryset.exclude(title__istartswith='New Group')
            # Apply time filter to fallback feed as well
            if threshold_date:
                queryset = queryset.filter(
                    Q(published_at__gte=threshold_date) | 
                    Q(published_at__isnull=True, created_at__gte=threshold_date)
                )
        
        # 3. Apply Annotations (Critical for the PostCard to show like status)
        queryset = queryset.annotate(
            comment_count=Count('comments', filter=Q(comments__is_approved=True)),
            reaction_count=Count('reactions'),
            user_has_reacted=Exists(
                PostReaction.objects.filter(
                    post=OuterRef('pk'),
                    user=user
                )
            )
        )

        # 4. Pagination
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
    
    def get_permissions(self):
        """
        Apply license-based permissions for the posts feature.
        """
        permission_classes = [permissions.IsAuthenticated]
        permission_classes.append(HasLicenseFeature('posts')())
        return [permission() for permission in permission_classes]

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


class PostTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Post Templates.
    Admins can create, edit, and delete templates for quick post creation.
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'usage_count', 'created_at', 'updated_at']
    ordering = ['-usage_count', '-created_at']
    
    def get_permissions(self):
        """
        Apply license-based permissions for the posts feature.
        """
        permission_classes = [permissions.IsAuthenticated]
        permission_classes.append(HasLicenseFeature('posts')())
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        """Use list serializer for list action, full serializer otherwise."""
        if self.action == 'list':
            return PostTemplateListSerializer
        return PostTemplateSerializer
    
    def get_queryset(self):
        """
        Filter templates based on Admin Role.
        Each admin level only sees templates created by admins at their same level and organization:
        - Super Admin: only sees templates created by super admins (role_scope='SUPER')
        - Municipality Admin: only sees templates created by municipality admins from the same municipality
        - Club Admin: only sees templates created by club admins from the same club
        """
        user = self.request.user
        
        # Only admins can access templates
        if user.role not in ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN']:
            return PostTemplate.objects.none()
        
        queryset = PostTemplate.objects.all()
        
        # For detail actions (retrieve, update, destroy, toggle_active), include inactive templates
        # so admins can edit/delete/view inactive templates
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy', 'toggle_active', 'duplicate']:
            pass  # Don't filter by is_active for these actions
        else:
            # Filter by is_active unless explicitly requested (for list action)
            show_inactive = self.request.query_params.get('show_inactive', 'false').lower() == 'true'
            if not show_inactive:
                queryset = queryset.filter(is_active=True)
        
        # Super Admin sees only SUPER scope templates
        if user.role == 'SUPER_ADMIN':
            return queryset.filter(role_scope='SUPER')
        
        # Municipality Admin sees only templates from their municipality (created by municipality admins)
        if user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            return queryset.filter(
                role_scope='MUNICIPALITY',
                municipality=user.assigned_municipality
            )
        
        # Club Admin sees only templates from their club (created by club admins)
        if user.role == 'CLUB_ADMIN' and user.assigned_club:
            return queryset.filter(
                role_scope='CLUB',
                club=user.assigned_club
            )
        
        return PostTemplate.objects.none()
    
    def perform_create(self, serializer):
        """
        Auto-assign creator, role_scope, and ownership context.
        """
        user = self.request.user
        
        save_kwargs = {'created_by': user}
        
        if user.role == 'SUPER_ADMIN':
            save_kwargs['role_scope'] = 'SUPER'
        elif user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            save_kwargs['role_scope'] = 'MUNICIPALITY'
            save_kwargs['municipality'] = user.assigned_municipality
        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            save_kwargs['role_scope'] = 'CLUB'
            save_kwargs['club'] = user.assigned_club
        else:
            raise PermissionDenied("You do not have permission to create templates.")
        
        serializer.save(**save_kwargs)
    
    def perform_update(self, serializer):
        """
        Only allow editing own templates or templates in their scope.
        """
        user = self.request.user
        template = self.get_object()
        
        # Super Admin can edit any template
        if user.role == 'SUPER_ADMIN':
            serializer.save()
            return
        
        # Others can only edit their own templates
        if template.created_by != user:
            raise PermissionDenied("You can only edit templates you created.")
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Only allow deleting own templates.
        """
        user = self.request.user
        
        # Super Admin can delete any template
        if user.role == 'SUPER_ADMIN':
            instance.delete()
            return
        
        # Others can only delete their own templates
        if instance.created_by != user:
            raise PermissionDenied("You can only delete templates you created.")
        
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Duplicate an existing template.
        The duplicated template belongs to the current user's scope.
        """
        template = self.get_object()
        user = request.user
        
        # Determine role_scope and organization based on current user
        if user.role == 'SUPER_ADMIN':
            role_scope = 'SUPER'
            municipality = None
            club = None
        elif user.role == 'MUNICIPALITY_ADMIN' and user.assigned_municipality:
            role_scope = 'MUNICIPALITY'
            municipality = user.assigned_municipality
            club = None
        elif user.role == 'CLUB_ADMIN' and user.assigned_club:
            role_scope = 'CLUB'
            municipality = None
            club = user.assigned_club
        else:
            raise PermissionDenied("You do not have permission to duplicate templates.")
        
        # Create a copy of the template with the current user's scope
        new_template = PostTemplate.objects.create(
            name=f"{template.name} (Copy)",
            description=template.description,
            icon=template.icon,
            created_by=user,
            role_scope=role_scope,
            municipality=municipality,
            club=club,
            is_global=template.is_global if user.role == 'SUPER_ADMIN' else False,
            default_post_type=template.default_post_type,
            target_member_type=template.target_member_type,
            target_min_age=template.target_min_age,
            target_max_age=template.target_max_age,
            target_grades=template.target_grades,
            target_genders=template.target_genders,
            target_custom_fields=template.target_custom_fields,
            allow_comments=template.allow_comments,
            require_moderation=template.require_moderation,
            allow_replies=template.allow_replies,
            limit_comments_per_user=template.limit_comments_per_user,
            send_push_notification=template.send_push_notification,
            default_push_title=template.default_push_title,
            is_pinned_default=template.is_pinned_default,
            usage_count=0,  # Reset usage count for the copy
            is_active=True
        )
        
        # Copy ManyToMany relationships
        new_template.target_municipalities.set(template.target_municipalities.all())
        new_template.target_clubs.set(template.target_clubs.all())
        new_template.target_groups.set(template.target_groups.all())
        new_template.target_interests.set(template.target_interests.all())
        
        serializer = PostTemplateSerializer(new_template, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Toggle the is_active status of a template.
        """
        template = self.get_object()
        user = request.user
        
        # Only creator or super admin can toggle
        if template.created_by != user and user.role != 'SUPER_ADMIN':
            raise PermissionDenied("You can only toggle templates you created.")
        
        template.is_active = not template.is_active
        template.save(update_fields=['is_active'])
        
        return Response({
            'id': template.id,
            'is_active': template.is_active,
            'message': f"Template {'activated' if template.is_active else 'deactivated'} successfully."
        })
    
    @action(detail=True, methods=['post'])
    def increment_usage(self, request, pk=None):
        """
        Increment the usage count when a post is created from this template.
        Called by the frontend after successfully creating a post.
        """
        template = self.get_object()
        template.increment_usage()
        
        return Response({
            'id': template.id,
            'usage_count': template.usage_count
        })
    
    @action(detail=False, methods=['get'])
    def icons(self, request):
        """
        Return available icon choices.
        """
        icons = [
            {'value': choice[0], 'label': choice[1]}
            for choice in PostTemplate.TemplateIcon.choices
        ]
        return Response(icons)