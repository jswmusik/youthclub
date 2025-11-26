from rest_framework import viewsets, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from users.permissions import IsSuperAdmin
from .models import NewsTag, NewsArticle
from .serializers import NewsTagSerializer, NewsArticleSerializer

class NewsTagViewSet(viewsets.ModelViewSet):
    """
    Tags for categorizing news.
    """
    queryset = NewsTag.objects.all()
    serializer_class = NewsTagSerializer

    def get_permissions(self):
        # Anyone can read tags, only Super Admins can manage them
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsSuperAdmin()]

class NewsArticleViewSet(viewsets.ModelViewSet):
    """
    Main News Logic.
    """
    queryset = NewsArticle.objects.all()
    serializer_class = NewsArticleSerializer
    
    # Filters for the Archive page
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'excerpt', 'author__first_name', 'author__last_name']
    ordering_fields = ['published_at', 'title']
    ordering = ['-published_at'] # Default to newest first

    def get_permissions(self):
        # Only Super Admins can Create/Update/Delete
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsSuperAdmin()]
        # Anyone (authenticated) can read
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = NewsArticle.objects.all()

        # Check if we should only show published articles (for public feed views)
        published_only = self.request.query_params.get('published_only') == 'true'

        # 1. Super Admins see everything (Drafts, targeted to anyone) UNLESS published_only=true
        if getattr(user, 'role', None) == 'SUPER_ADMIN' and not published_only:
            pass # No filtering needed - super admin management view sees all articles
        else:
            # 2. Regular users OR super admins with published_only=true only see Published news
            queryset = queryset.filter(is_published=True)
            
            # 3. Filter by target_roles: users see news targeted to "ALL" or their specific role
            # This applies to both regular users AND super admins when viewing the feed (published_only=true)
            # Simple Logic: If JSON contains "ALL" or user.role
            # Note: This relies on JSON being stored as text in SQLite.
            role = getattr(user, 'role', None)
            if role:
                queryset = queryset.filter(
                    Q(target_roles__icontains="ALL") | 
                    Q(target_roles__icontains=role)
                )

        # 4. Filtering for the Dashboard (exclude_hero)
        # If frontend sends ?exclude_hero=true, we hide the hero article
        if self.request.query_params.get('exclude_hero') == 'true':
            queryset = queryset.filter(is_hero=False)
            
        # 5. Filtering by Tag (Archive page)
        tag_id = self.request.query_params.get('tag')
        if tag_id:
            queryset = queryset.filter(tags__id=tag_id)

        return queryset

    @action(detail=False, methods=['get'])
    def hero(self, request):
        """
        Specific endpoint to fetch ONLY the current Hero article.
        Usage: /api/news/hero/
        """
        # Re-use get_queryset to ensure role/published security applies to Hero too
        queryset = self.get_queryset()
        
        hero_article = queryset.filter(is_hero=True).first()
        
        if hero_article:
            serializer = self.get_serializer(hero_article)
            return Response(serializer.data)
        
        return Response(None) # No hero active