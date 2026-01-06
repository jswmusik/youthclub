# backend/seo/views.py
"""
API views for SEO app.
"""

import logging
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.db.models import Q, Count
from django.utils import timezone
from django.shortcuts import get_object_or_404

logger = logging.getLogger(__name__)

from core.permissions import IsSuperUser
from core.pagination import StandardResultsSetPagination

from .models import (
    Keyword,
    SwedishLocation,
    LocalLandingPage,
    SEOArticle,
    InternalLink,
    SEOCampaign,
)
from .serializers import (
    KeywordSerializer,
    KeywordListSerializer,
    SwedishLocationSerializer,
    SwedishLocationListSerializer,
    LocalLandingPageSerializer,
    LocalLandingPageListSerializer,
    LocalLandingPagePublicSerializer,
    SEOArticleSerializer,
    SEOArticleListSerializer,
    SEOArticlePublicSerializer,
    InternalLinkSerializer,
    SEOCampaignSerializer,
    SEOCampaignListSerializer,
    GenerateLocalPageContentSerializer,
    GenerateArticleContentSerializer,
    SEODashboardStatsSerializer,
    NearbyContentSerializer,
)
from .geo_service import get_geo_service, get_keyword_analyzer
from .ai_agents import ContentAgent, get_available_personas


# =============================================================================
# KEYWORD VIEWSET
# =============================================================================

class KeywordViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing keywords.
    Super Admin only.
    """
    queryset = Keyword.objects.all()
    permission_classes = [IsAuthenticated, IsSuperUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['keyword', 'notes']
    ordering_fields = ['keyword', 'search_volume', 'difficulty', 'current_ranking', 'created_at']
    ordering = ['-search_volume']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return KeywordListSerializer
        return KeywordSerializer
    
    def get_queryset(self):
        qs = super().get_queryset()
        
        # Filter by language
        lang = self.request.query_params.get('lang')
        if lang:
            qs = qs.filter(language=lang)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        # Filter by intent
        intent = self.request.query_params.get('intent')
        if intent:
            qs = qs.filter(intent=intent)
        
        # Filter by audience
        audience = self.request.query_params.get('audience')
        if audience:
            qs = qs.filter(target_audience=audience)
        
        return qs
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get keyword statistics."""
        qs = self.get_queryset()
        
        return Response({
            'total': qs.count(),
            'by_status': {
                'active': qs.filter(status='ACTIVE').count(),
                'paused': qs.filter(status='PAUSED').count(),
                'archived': qs.filter(status='ARCHIVED').count(),
            },
            'by_intent': {
                'informational': qs.filter(intent='INFORMATIONAL').count(),
                'local': qs.filter(intent='LOCAL').count(),
                'transactional': qs.filter(intent='TRANSACTIONAL').count(),
                'navigational': qs.filter(intent='NAVIGATIONAL').count(),
            },
            'with_ranking': qs.exclude(current_ranking__isnull=True).count(),
        })
    
    @action(detail=True, methods=['get'])
    def analyze(self, request, pk=None):
        """
        Analyze a keyword to detect location and suggest page type.
        Used before generating a page.
        """
        keyword = self.get_object()
        analyzer = get_keyword_analyzer()
        
        analysis = analyzer.analyze_keyword(keyword.keyword)
        
        return Response({
            'keyword': keyword.keyword,
            'keyword_id': keyword.id,
            'detected_location': {
                'id': analysis['location_id'],
                'name': analysis['location_name'],
            } if analysis['has_location'] else None,
            'suggested_page_type': analysis['page_type'],
            'suggested_title': analysis['suggested_title'],
            'has_existing_page': keyword.generated_page is not None,
            'has_existing_article': keyword.generated_article is not None,
        })
    
    @action(detail=True, methods=['post'])
    def generate_page(self, request, pk=None):
        """
        Generate a complete local landing page from this keyword.
        
        This is the main UX improvement - one click to generate an entire page!
        
        Flow:
        1. Analyze keyword to detect location
        2. Create LocalLandingPage with keyword's slug
        3. Generate AI content using appropriate persona
        4. Link keyword to generated page
        5. Return the created page for review
        """
        keyword = self.get_object()
        
        # Check if page already exists
        if keyword.generated_page:
            return Response({
                'error': 'En sida har redan genererats för detta sökord',
                'existing_page_id': keyword.generated_page.id,
                'existing_page_slug': keyword.generated_page.slug,
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Analyze keyword
        analyzer = get_keyword_analyzer()
        analysis = analyzer.analyze_keyword(keyword.keyword)
        
        # Require a location for local pages
        if not analysis['detected_location']:
            return Response({
                'error': 'Kunde inte identifiera en plats i sökordet. Lägg till platsnamn (t.ex. "fritidsgård stockholm")',
                'suggestion': 'Lägg till ett kommunnamn eller stadsnamn i sökordet',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        location = analysis['detected_location']
        page_type = analysis['page_type']
        
        # Get geo data
        geo = get_geo_service()
        nearby_clubs = geo.get_nearby_clubs(location.latitude, location.longitude)
        nearby_events = geo.get_nearby_events(location.latitude, location.longitude)
        platform_stats = geo.get_aggregated_platform_stats()
        
        # Create the page with keyword's slug
        try:
            page = LocalLandingPage.objects.create(
                location=location,
                primary_keyword=keyword,
                slug=keyword.slug,  # KEY: Use keyword slug for SEO!
                page_type=page_type,
                target_audience=keyword.target_audience,
                # Placeholder content - will be overwritten by AI
                title=analysis['suggested_title'],
                meta_description='',
                h1_title=analysis['suggested_title'],
                hero_tagline='',
                intro_content='',
                main_content='',
                cta_content='',
                focus_keyphrase=keyword.keyword,
                status='DRAFTING',
            )
        except Exception as e:
            return Response({
                'error': f'Kunde inte skapa sida: {str(e)}',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Generate AI content
        persona = keyword.target_audience if keyword.target_audience != 'GENERAL' else 'YOUTH'
        
        try:
            agent = ContentAgent(persona, provider_name='openai')
            content = agent.generate_local_page_content(
                location={
                    'name': location.name,
                    'name_genitive': location.name_genitive,
                    'region': location.region,
                    'population': location.population,
                    'lat': location.latitude,
                    'lng': location.longitude,
                },
                keyword=keyword.keyword,
                page_type=page_type,
                nearby_clubs=nearby_clubs,
                nearby_events=nearby_events,
                platform_stats=platform_stats,
            )
            
            # Update page with AI content
            page.title = content.get('title', page.title)[:70]
            page.meta_description = content.get('meta_description', '')[:160]
            page.h1_title = content.get('h1_title', page.h1_title)
            page.hero_tagline = content.get('hero_tagline', '')
            page.intro_content = content.get('intro_content', '')
            page.main_content = content.get('main_content', '')
            page.cta_content = content.get('cta_content', '')
            
            # Set OG fields from content
            page.og_title = content.get('og_title', page.title)[:100]
            page.og_description = content.get('og_description', page.meta_description)[:200]
            
            # Set Twitter fields (use AI-generated if available, else default to OG)
            page.twitter_title = content.get('twitter_title', page.og_title)[:70]
            page.twitter_description = content.get('twitter_description', page.og_description)[:200]
            
            # Hero image alt text
            page.hero_image_alt = content.get('hero_image_alt', f"Fritidsgårdar i {location.name}")[:200]
            
            # Generate FAQ items for rich snippets
            if content.get('faq_items'):
                page.faq_items = content['faq_items']
            
            # Calculate word count and reading time
            word_count = len(page.main_content.split()) + len(page.intro_content.split())
            page.word_count = word_count
            page.reading_time_minutes = max(1, word_count // 200)  # ~200 words per minute
            
            # AI tracking
            page.ai_generated_at = timezone.now()
            page.ai_model_used = 'gpt-4-turbo'
            page.ai_persona_used = persona
            page.status = 'REVIEW'
            page.save()
            
            # Link keyword to page
            keyword.generated_page = page
            keyword.detected_location = location
            keyword.save()
            
            return Response({
                'success': True,
                'message': f'Sida skapad för "{keyword.keyword}"',
                'page': LocalLandingPageSerializer(page).data,
                'page_url': f'/kommun/{page.slug}',
                'admin_url': f'/admin/super/seo/local-pages/{page.slug}',
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            # If AI generation fails, delete the page and return error
            page.delete()
            return Response({
                'error': f'AI-generering misslyckades: {str(e)}',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def generate_article(self, request, pk=None):
        """
        Generate an SEO article from this keyword.
        Best for informational keywords.
        """
        keyword = self.get_object()
        
        # Check if article already exists
        if keyword.generated_article:
            return Response({
                'error': 'En artikel har redan genererats för detta sökord',
                'existing_article_id': keyword.generated_article.id,
                'existing_article_slug': keyword.generated_article.slug,
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the article
        try:
            article = SEOArticle.objects.create(
                target_keyword=keyword,
                slug=keyword.slug,
                target_audience=keyword.target_audience,
                title=keyword.keyword.title()[:70],
                meta_description='',
                h1_title=keyword.keyword.title(),
                excerpt='',
                content='',
                status='DRAFTING',
            )
        except Exception as e:
            return Response({
                'error': f'Kunde inte skapa artikel: {str(e)}',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Generate AI content
        persona = keyword.target_audience if keyword.target_audience != 'GENERAL' else 'YOUTH'
        
        try:
            agent = ContentAgent(persona, provider_name='openai')
            content = agent.generate_article(
                keyword=keyword.keyword,
                title_suggestion=keyword.keyword.title(),
                outline=[],
            )
            
            # Update article with AI content
            article.title = content.get('title', article.title)[:70]
            article.meta_description = content.get('meta_description', '')[:160]
            article.h1_title = content.get('h1_title', article.h1_title)
            article.excerpt = content.get('excerpt', '')[:300]
            article.content = content.get('content', '')
            article.og_title = content.get('og_title', article.title)[:100]
            article.og_description = content.get('og_description', article.meta_description)[:200]
            
            # AI tracking
            article.ai_draft = article.content
            article.ai_model_used = 'claude-3-5-sonnet'
            article.ai_persona_used = persona
            article.status = 'REVIEW'
            article.save()
            
            # Link keyword to article
            keyword.generated_article = article
            keyword.save()
            
            return Response({
                'success': True,
                'message': f'Artikel skapad för "{keyword.keyword}"',
                'article': SEOArticleSerializer(article).data,
                'article_url': f'/artiklar/{article.slug}',
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            article.delete()
            return Response({
                'error': f'AI-generering misslyckades: {str(e)}',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# SWEDISH LOCATION VIEWSET
# =============================================================================

class SwedishLocationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Swedish locations.
    Read access for all authenticated users, write for Super Admin.
    """
    queryset = SwedishLocation.objects.all()
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'region', 'scb_code']
    ordering_fields = ['name', 'population', 'region', 'priority']
    ordering = ['-population']
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsSuperUser()]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return SwedishLocationListSerializer
        return SwedishLocationSerializer
    
    def get_queryset(self):
        qs = super().get_queryset()
        
        # Filter by language (via country->language mapping)
        lang = self.request.query_params.get('lang')
        if lang:
            from core.languages import COUNTRY_TO_LANGUAGE
            # Find countries that map to this language
            countries = [c for c, l in COUNTRY_TO_LANGUAGE.items() if l == lang]
            if countries:
                qs = qs.filter(country__in=countries)
        
        # Filter by country
        country = self.request.query_params.get('country')
        if country:
            qs = qs.filter(country=country)
        
        # Filter by type
        location_type = self.request.query_params.get('type')
        if location_type:
            qs = qs.filter(location_type=location_type)
        
        # Filter by region
        region = self.request.query_params.get('region')
        if region:
            qs = qs.filter(region__icontains=region)
        
        # Filter by customer status
        is_customer = self.request.query_params.get('is_customer')
        if is_customer == 'true':
            qs = qs.filter(linked_municipality__isnull=False)
        elif is_customer == 'false':
            qs = qs.filter(linked_municipality__isnull=True)
        
        return qs
    
    @action(detail=False, methods=['get'])
    def regions(self, request):
        """Get list of all regions."""
        regions = SwedishLocation.objects.values('region', 'region_code').annotate(
            count=Count('id')
        ).order_by('region')
        
        return Response(list(regions))
    
    @action(detail=True, methods=['get'])
    def nearby(self, request, pk=None):
        """Get nearby clubs and events for a location."""
        location = self.get_object()
        geo = get_geo_service()
        
        radius = int(request.query_params.get('radius', 50))
        
        nearby_clubs = geo.get_nearby_clubs(
            location.latitude, 
            location.longitude,
            radius_km=radius
        )
        nearby_events = geo.get_nearby_events(
            location.latitude,
            location.longitude,
            radius_km=radius
        )
        platform_stats = geo.get_aggregated_platform_stats()
        
        return Response({
            'nearby_clubs': nearby_clubs,
            'nearby_events': nearby_events,
            'platform_stats': platform_stats,
        })


# =============================================================================
# LOCAL LANDING PAGE VIEWSET
# =============================================================================

class LocalLandingPageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for local landing pages.
    Super Admin only for write operations.
    """
    queryset = LocalLandingPage.objects.all()
    permission_classes = [IsAuthenticated, IsSuperUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['h1_title', 'title', 'location__name']
    ordering_fields = ['created_at', 'published_at', 'location__name']
    ordering = ['-created_at']
    lookup_field = 'slug'
    
    def get_serializer_class(self):
        if self.action == 'list':
            return LocalLandingPageListSerializer
        return LocalLandingPageSerializer
    
    def get_queryset(self):
        qs = super().get_queryset().select_related('location', 'primary_keyword')
        
        # Filter by language
        lang = self.request.query_params.get('lang')
        if lang:
            qs = qs.filter(language=lang)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        # Filter by page type
        page_type = self.request.query_params.get('page_type')
        if page_type:
            qs = qs.filter(page_type=page_type)
        
        # Filter by audience
        audience = self.request.query_params.get('audience')
        if audience:
            qs = qs.filter(target_audience=audience)
        
        # Filter by region
        region = self.request.query_params.get('region')
        if region:
            qs = qs.filter(location__region__icontains=region)
        
        return qs
    
    @action(detail=False, methods=['post'])
    def generate_content(self, request):
        """Generate AI content for a local page."""
        serializer = GenerateLocalPageContentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        # Get location
        location = get_object_or_404(SwedishLocation, id=data['location_id'])
        
        # Get keyword
        keyword_text = data.get('keyword_text', '')
        if data.get('keyword_id'):
            keyword = get_object_or_404(Keyword, id=data['keyword_id'])
            keyword_text = keyword.keyword
        
        # Get nearby content
        geo = get_geo_service()
        nearby_clubs = geo.get_nearby_clubs(location.latitude, location.longitude)
        nearby_events = geo.get_nearby_events(location.latitude, location.longitude)
        platform_stats = geo.get_aggregated_platform_stats()
        
        # Generate content with AI
        persona = data['target_audience']
        if persona == 'GENERAL':
            persona = 'YOUTH'  # Default persona
        
        try:
            agent = ContentAgent(persona, provider_name='openai')
            content = agent.generate_local_page_content(
                location={
                    'name': location.name,
                    'region': location.region,
                    'population': location.population,
                    'lat': location.latitude,
                    'lng': location.longitude,
                },
                keyword=keyword_text,
                page_type=data['page_type'],
                nearby_clubs=nearby_clubs,
                nearby_events=nearby_events,
                platform_stats=platform_stats,
            )
            
            return Response({
                'success': True,
                'content': content,
                'location': SwedishLocationListSerializer(location).data,
                'nearby_clubs_count': len(nearby_clubs),
                'nearby_events_count': len(nearby_events),
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def regenerate_content(self, request, slug=None):
        """Regenerate AI content for an existing page."""
        page = self.get_object()
        location = page.location
        
        # Get keyword text
        keyword_text = ''
        if page.primary_keyword:
            keyword_text = page.primary_keyword.keyword
        
        # Get nearby content
        geo = get_geo_service()
        nearby_clubs = geo.get_nearby_clubs(location.latitude, location.longitude)
        nearby_events = geo.get_nearby_events(location.latitude, location.longitude)
        platform_stats = geo.get_aggregated_platform_stats()
        
        # Determine persona
        persona = page.target_audience
        if persona == 'GENERAL':
            persona = 'YOUTH'
        
        try:
            agent = ContentAgent(persona, provider_name='openai')
            content = agent.generate_local_page_content(
                location={
                    'name': location.name,
                    'name_genitive': location.name_genitive,
                    'region': location.region,
                    'population': location.population,
                    'lat': location.latitude,
                    'lng': location.longitude,
                },
                keyword=keyword_text,
                page_type=page.page_type,
                nearby_clubs=nearby_clubs,
                nearby_events=nearby_events,
                platform_stats=platform_stats,
            )
            
            # Update the page with generated content
            page.title = content.get('title', page.title)[:70]
            page.meta_description = content.get('meta_description', page.meta_description)[:160]
            page.h1_title = content.get('h1_title', page.h1_title)
            page.hero_tagline = content.get('hero_tagline', '')
            page.intro_content = content.get('intro_content', '')
            page.main_content = content.get('main_content', '')
            page.cta_content = content.get('cta_content', '')
            
            # Update OG fields
            page.og_title = content.get('og_title', page.title)[:100]
            page.og_description = content.get('og_description', page.meta_description)[:200]
            
            # Update Twitter fields
            page.twitter_title = content.get('twitter_title', page.og_title)[:70]
            page.twitter_description = content.get('twitter_description', page.og_description)[:200]
            
            # Hero image alt text
            page.hero_image_alt = content.get('hero_image_alt', f"Fritidsgårdar i {location.name}")[:200]
            
            # FAQ items for rich snippets
            if content.get('faq_items'):
                page.faq_items = content['faq_items']
            
            # Calculate word count and reading time
            word_count = len(page.main_content.split()) + len(page.intro_content.split())
            page.word_count = word_count
            page.reading_time_minutes = max(1, word_count // 200)
            
            page.ai_generated_at = timezone.now()
            page.ai_model_used = 'gpt-4-turbo' if agent.ai_provider else 'unknown'
            page.status = 'REVIEW'
            page.save()
            
            return Response(LocalLandingPageSerializer(page).data)
            
        except Exception as e:
            return Response({
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def publish(self, request, slug=None):
        """Publish a page (can be DRAFT, APPROVED, or REVIEW status)."""
        page = self.get_object()
        
        if page.status not in ['DRAFT', 'APPROVED', 'REVIEW']:
            return Response({
                'error': 'Page must be draft, approved or in review to publish'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        page.status = 'PUBLISHED'
        page.published_at = timezone.now()
        page.published_by = request.user
        page.save()
        
        return Response(LocalLandingPageSerializer(page).data)
    
    @action(detail=True, methods=['post'])
    def unpublish(self, request, slug=None):
        """Unpublish a page."""
        page = self.get_object()
        page.status = 'DRAFT'
        page.published_at = None
        page.save()
        
        return Response(LocalLandingPageSerializer(page).data)
    
    @action(detail=True, methods=['post'])
    def generate_image(self, request, slug=None):
        """
        Generate a hero image for the page using DALL-E.
        Accepts optional 'prompt' in request body for custom prompts.
        """
        import requests
        import uuid
        from django.core.files.base import ContentFile
        from analytics.ai_service import OpenAIProvider
        
        page = self.get_object()
        location = page.location
        
        # Check if custom prompt is provided
        custom_prompt = request.data.get('prompt', '').strip()
        
        # Build image prompt
        location_name = location.name
        keyword = page.primary_keyword.keyword if page.primary_keyword else ''
        
        if custom_prompt:
            # Use custom prompt but add safety requirements
            image_prompt = f"""{custom_prompt}

Additional requirements:
- High quality, professional photography style
- No text overlays
- Suitable as a website hero image (wide landscape format)
- Safe for all ages"""
        else:
            # Default prompt for a hero image
            image_prompt = f"""A modern, vibrant photograph of a Swedish youth center (fritidsgård) scene.
The setting should be warm and inviting, showing diverse young people aged 13-19 enjoying activities.
Location context: {location_name}, Sweden.
Theme: {keyword or 'youth activities, community, friendship'}.

Style requirements:
- Modern Scandinavian aesthetic with clean design
- Warm lighting suggesting afternoon/evening
- Show engaged, happy young people (teens)
- Activities could include: gaming, music, art, sports, socializing
- High quality, professional photography style
- No text overlays
- Suitable as a website hero image (wide landscape format)
- Colors: warm tones with hints of purple/pink (brand colors)"""
        
        try:
            provider = OpenAIProvider()
            
            if not provider.is_available():
                return Response({
                    'error': 'OpenAI API key not configured'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate image
            image_url = provider.generate_image(
                prompt=image_prompt,
                size="1792x1024",  # Wide landscape for hero
                quality="standard",
                style="vivid"
            )
            
            if not image_url:
                return Response({
                    'error': 'Failed to generate image'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Download the image
            response = requests.get(image_url, timeout=30)
            if response.status_code != 200:
                return Response({
                    'error': 'Failed to download generated image'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Save to model
            filename = f"hero_{page.slug}_{uuid.uuid4().hex[:8]}.png"
            page.hero_image.save(filename, ContentFile(response.content), save=False)
            page.hero_image_alt = f"Fritidsgårdar och ungdomsaktiviteter i {location_name}"
            page.save()
            
            # Also set as OG image if not set
            if not page.og_image:
                page.og_image.save(f"og_{filename}", ContentFile(response.content), save=True)
            
            return Response({
                'success': True,
                'message': 'Hero image generated successfully',
                'hero_image': page.hero_image.url if page.hero_image else None,
                'page': LocalLandingPageSerializer(page).data
            })
            
        except Exception as e:
            import traceback
            logger.error(f"Image generation error: {str(e)}\n{traceback.format_exc()}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def delete_image(self, request, slug=None):
        """
        Delete the hero image from the page.
        """
        page = self.get_object()
        
        if page.hero_image:
            # Delete the file from storage
            page.hero_image.delete(save=False)
            page.hero_image_alt = ''
            page.save()
            
            return Response({
                'success': True,
                'message': 'Hero image deleted successfully',
                'page': LocalLandingPageSerializer(page).data
            })
        
        return Response({
            'error': 'No hero image to delete'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def upload_image(self, request, slug=None):
        """
        Upload a custom hero image for the page.
        """
        page = self.get_object()
        
        if 'image' not in request.FILES:
            return Response({
                'error': 'No image file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        image_file = request.FILES['image']
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/webp']
        if image_file.content_type not in allowed_types:
            return Response({
                'error': 'Invalid file type. Allowed: JPEG, PNG, WebP'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Delete old image if exists
        if page.hero_image:
            page.hero_image.delete(save=False)
        
        # Save new image
        import uuid
        ext = image_file.name.split('.')[-1] if '.' in image_file.name else 'png'
        filename = f"hero_{page.slug}_{uuid.uuid4().hex[:8]}.{ext}"
        page.hero_image.save(filename, image_file, save=False)
        
        # Update alt text if provided
        if 'alt_text' in request.data:
            page.hero_image_alt = request.data['alt_text'][:200]
        
        page.save()
        
        return Response({
            'success': True,
            'message': 'Hero image uploaded successfully',
            'hero_image': page.hero_image.url if page.hero_image else None,
            'page': LocalLandingPageSerializer(page).data
        })
    
    @action(detail=True, methods=['patch'])
    def update_image_alt(self, request, slug=None):
        """
        Update the alt text for the hero image.
        """
        page = self.get_object()
        
        if 'alt_text' not in request.data:
            return Response({
                'error': 'No alt_text provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        page.hero_image_alt = request.data['alt_text'][:200]
        page.save()
        
        return Response({
            'success': True,
            'message': 'Alt text updated successfully',
            'hero_image_alt': page.hero_image_alt,
            'page': LocalLandingPageSerializer(page).data
        })


# =============================================================================
# SEO ARTICLE VIEWSET
# =============================================================================

class SEOArticleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for SEO articles.
    Super Admin only for write operations.
    """
    queryset = SEOArticle.objects.all()
    permission_classes = [IsAuthenticated, IsSuperUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'h1_title', 'content']
    ordering_fields = ['created_at', 'published_at', 'title']
    ordering = ['-created_at']
    lookup_field = 'slug'
    
    def get_serializer_class(self):
        if self.action == 'list':
            return SEOArticleListSerializer
        return SEOArticleSerializer
    
    def get_queryset(self):
        qs = super().get_queryset().select_related('target_keyword')
        
        # Filter by language
        lang = self.request.query_params.get('lang')
        if lang:
            qs = qs.filter(language=lang)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        # Filter by audience
        audience = self.request.query_params.get('audience')
        if audience:
            qs = qs.filter(target_audience=audience)
        
        return qs
    
    @action(detail=False, methods=['post'])
    def generate_content(self, request):
        """Generate AI content for an article."""
        serializer = GenerateArticleContentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        # Get keyword
        keyword_text = data.get('keyword_text', '')
        if data.get('keyword_id'):
            keyword = get_object_or_404(Keyword, id=data['keyword_id'])
            keyword_text = keyword.keyword
        
        # Generate content with AI
        persona = data['target_audience']
        if persona == 'GENERAL':
            persona = 'YOUTH'
        
        try:
            agent = ContentAgent(persona, provider_name='openai')
            content = agent.generate_article(
                keyword=keyword_text,
                title_suggestion=data.get('title_suggestion'),
                outline=data.get('outline', []),
            )
            
            return Response({
                'success': True,
                'content': content,
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def regenerate_content(self, request, slug=None):
        """Regenerate AI content for an existing article."""
        article = self.get_object()
        
        # Get keyword text
        keyword_text = ''
        if article.target_keyword:
            keyword_text = article.target_keyword.keyword
        
        # Determine persona
        persona = article.target_audience
        if persona == 'GENERAL':
            persona = 'YOUTH'
        
        try:
            agent = ContentAgent(persona, provider_name='openai')
            content = agent.generate_article(
                keyword=keyword_text,
                title_suggestion=article.title,
                outline=[],
            )
            
            # Update the article with generated content
            article.h1_title = content.get('h1_title', article.h1_title or article.title)
            article.content = content.get('content', '')
            article.excerpt = content.get('excerpt', '')
            if not article.meta_description and content.get('meta_description'):
                article.meta_description = content.get('meta_description')
            article.ai_draft = content.get('content', '')
            article.ai_model_used = 'claude-3-5-sonnet' if agent.ai_provider else 'unknown'
            article.ai_persona_used = persona
            article.status = 'REVIEW'
            article.save()
            
            return Response(SEOArticleSerializer(article).data)
            
        except Exception as e:
            return Response({
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def publish(self, request, slug=None):
        """Publish an article."""
        article = self.get_object()
        
        if article.status not in ['IDEA', 'DRAFTING', 'APPROVED', 'REVIEW']:
            return Response({
                'error': 'Article must be in idea, drafting, approved or review status to publish'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        article.status = 'PUBLISHED'
        article.published_at = timezone.now()
        article.published_by = request.user
        article.save()
        
        return Response(SEOArticleSerializer(article).data)
    
    @action(detail=True, methods=['post'])
    def unpublish(self, request, slug=None):
        """Unpublish an article."""
        article = self.get_object()
        article.status = 'IDEA'
        article.published_at = None
        article.save()
        
        return Response(SEOArticleSerializer(article).data)
    
    @action(detail=True, methods=['post'])
    def generate_image(self, request, slug=None):
        """
        Generate a featured image for the article using DALL-E.
        Accepts optional 'prompt' in request body for custom prompts.
        """
        import requests
        import uuid
        from django.core.files.base import ContentFile
        from analytics.ai_service import OpenAIProvider
        
        article = self.get_object()
        
        # Get custom prompt or build default
        custom_prompt = request.data.get('prompt', '')
        
        if custom_prompt:
            prompt = custom_prompt
        else:
            # Build prompt from article content
            keyword_text = article.target_keyword.keyword if article.target_keyword else ''
            prompt = f"A modern, professional photograph for an article about {article.title}. "
            if keyword_text:
                prompt += f"Related to: {keyword_text}. "
            prompt += "Swedish youth activities, community center, positive atmosphere. High quality, editorial style, vibrant colors, natural lighting."
        
        try:
            provider = OpenAIProvider()
            if not provider.is_available():
                return Response({
                    'error': 'OpenAI API key not configured'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate image with DALL-E
            image_url = provider.generate_image(
                prompt=prompt,
                size="1792x1024",
                quality="standard"
            )
            
            if not image_url:
                return Response({
                    'error': 'Failed to generate image'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Download the image
            image_response = requests.get(image_url, timeout=30)
            if image_response.status_code != 200:
                return Response({
                    'error': 'Failed to download generated image'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Save to article
            filename = f"featured_{article.slug}_{uuid.uuid4().hex[:8]}.png"
            article.featured_image.save(
                filename,
                ContentFile(image_response.content),
                save=False
            )
            
            # Set alt text
            article.featured_image_alt = f"{article.title}"
            article.save()
            
            return Response({
                'success': True,
                'image_url': article.featured_image.url if article.featured_image else None,
                'alt_text': article.featured_image_alt,
            })
            
        except Exception as e:
            return Response({
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def delete_image(self, request, slug=None):
        """Delete the featured image from an article."""
        article = self.get_object()
        
        if article.featured_image:
            article.featured_image.delete(save=False)
            article.featured_image = None
            article.featured_image_alt = ''
            article.save()
        
        return Response({
            'success': True,
            'message': 'Image deleted'
        })
    
    @action(detail=True, methods=['post'])
    def upload_image(self, request, slug=None):
        """Upload a custom featured image for an article."""
        article = self.get_object()
        
        if 'image' not in request.FILES:
            return Response({
                'error': 'No image file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        image_file = request.FILES['image']
        alt_text = request.data.get('alt_text', article.title)
        
        # Delete old image if exists
        if article.featured_image:
            article.featured_image.delete(save=False)
        
        # Save new image
        article.featured_image = image_file
        article.featured_image_alt = alt_text
        article.save()
        
        return Response({
            'success': True,
            'image_url': article.featured_image.url if article.featured_image else None,
            'alt_text': article.featured_image_alt,
        })
    
    @action(detail=True, methods=['patch'])
    def update_image_alt(self, request, slug=None):
        """Update the alt text for an article's featured image."""
        article = self.get_object()
        
        alt_text = request.data.get('alt_text', '')
        article.featured_image_alt = alt_text
        article.save()
        
        return Response({
            'success': True,
            'alt_text': article.featured_image_alt,
        })


# =============================================================================
# SEO CAMPAIGN VIEWSET
# =============================================================================

class SEOCampaignViewSet(viewsets.ModelViewSet):
    """ViewSet for SEO campaigns."""
    queryset = SEOCampaign.objects.all()
    permission_classes = [IsAuthenticated, IsSuperUser]
    pagination_class = StandardResultsSetPagination
    lookup_field = 'slug'
    
    def get_serializer_class(self):
        if self.action == 'list':
            return SEOCampaignListSerializer
        return SEOCampaignSerializer


# =============================================================================
# INTERNAL LINK VIEWSET
# =============================================================================

class InternalLinkViewSet(viewsets.ModelViewSet):
    """ViewSet for internal links."""
    queryset = InternalLink.objects.all()
    serializer_class = InternalLinkSerializer
    permission_classes = [IsAuthenticated, IsSuperUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['source_url', 'target_url', 'anchor_text']
    
    @action(detail=False, methods=['post'])
    def generate_for_local_page(self, request):
        """Generate internal links for a local page."""
        from .linking_service import get_linking_service
        
        page_id = request.data.get('page_id')
        if not page_id:
            return Response({'error': 'page_id krävs'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            page = LocalLandingPage.objects.get(id=page_id)
        except LocalLandingPage.DoesNotExist:
            return Response({'error': 'Sidan hittades inte'}, status=status.HTTP_404_NOT_FOUND)
        
        service = get_linking_service()
        links = service.generate_links_for_local_page(page_id)
        source_url = f'/kommun/{page.slug}'
        count = service.save_links_for_page(source_url, 'local_page', links)
        
        return Response({
            'success': True,
            'message': f'{count} länkar genererade för {page.h1_title or page.slug}',
            'links_generated': count,
            'links': links
        })
    
    @action(detail=False, methods=['post'])
    def generate_for_article(self, request):
        """Generate internal links for an article."""
        from .linking_service import get_linking_service
        
        article_id = request.data.get('article_id')
        if not article_id:
            return Response({'error': 'article_id krävs'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            article = SEOArticle.objects.get(id=article_id)
        except SEOArticle.DoesNotExist:
            return Response({'error': 'Artikeln hittades inte'}, status=status.HTTP_404_NOT_FOUND)
        
        service = get_linking_service()
        links = service.generate_links_for_article(article_id)
        source_url = f'/artiklar/{article.slug}'
        count = service.save_links_for_page(source_url, 'article', links)
        
        return Response({
            'success': True,
            'message': f'{count} länkar genererade för {article.title or article.slug}',
            'links_generated': count,
            'links': links
        })
    
    @action(detail=False, methods=['post'])
    def generate_all(self, request):
        """Generate links for all published pages and articles."""
        from .linking_service import get_linking_service
        
        service = get_linking_service()
        total = 0
        local_page_count = 0
        article_count = 0
        
        # Generate for all published local pages
        for page in LocalLandingPage.objects.filter(status='PUBLISHED'):
            links = service.generate_links_for_local_page(page.id)
            count = service.save_links_for_page(f'/kommun/{page.slug}', 'local_page', links)
            total += count
            local_page_count += 1
        
        # Generate for all published articles
        for article in SEOArticle.objects.filter(status='PUBLISHED'):
            links = service.generate_links_for_article(article.id)
            count = service.save_links_for_page(f'/artiklar/{article.slug}', 'article', links)
            total += count
            article_count += 1
        
        return Response({
            'success': True,
            'message': f'{total} länkar genererade för {local_page_count} lokala sidor och {article_count} artiklar',
            'total_links_generated': total,
            'local_pages_processed': local_page_count,
            'articles_processed': article_count,
        })


# =============================================================================
# PUBLIC API VIEWS
# =============================================================================

class PublicLocalPageView(APIView):
    """
    Public endpoint for fetching a local landing page by slug.
    Used by the frontend for rendering local SEO pages.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, slug):
        try:
            page = LocalLandingPage.objects.select_related(
                'location'
            ).get(slug=slug, status='PUBLISHED')
        except LocalLandingPage.DoesNotExist:
            return Response(
                {'error': 'Page not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get nearby content
        geo = get_geo_service()
        
        data = LocalLandingPagePublicSerializer(page).data
        
        # Add dynamic content if enabled
        if page.show_nearby_clubs:
            data['nearby_clubs'] = geo.get_nearby_clubs(
                page.location.latitude,
                page.location.longitude,
                radius_km=page.nearby_radius_km,
                limit=6
            )
        
        if page.show_nearby_events:
            data['nearby_events'] = geo.get_nearby_events(
                page.location.latitude,
                page.location.longitude,
                radius_km=page.nearby_radius_km,
                limit=6
            )
        
        if page.show_platform_stats:
            data['platform_stats'] = geo.get_aggregated_platform_stats()
        
        return Response(data)


class PublicArticleView(APIView):
    """
    Public endpoint for fetching an article by slug.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, slug):
        try:
            article = SEOArticle.objects.get(slug=slug, status='PUBLISHED')
        except SEOArticle.DoesNotExist:
            return Response(
                {'error': 'Article not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        data = SEOArticlePublicSerializer(article).data
        
        # Add related articles
        data['related_articles'] = SEOArticleListSerializer(
            article.related_articles.filter(status='PUBLISHED')[:3],
            many=True
        ).data
        
        return Response(data)


class PublicArticleListView(APIView):
    """
    Public endpoint for listing published articles.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        articles = SEOArticle.objects.filter(
            status='PUBLISHED'
        ).order_by('-published_at')[:20]
        
        return Response(SEOArticleListSerializer(articles, many=True).data)


class PublicLocalPageListView(APIView):
    """
    Public endpoint for listing published local pages.
    Used for sitemap and navigation.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        pages = LocalLandingPage.objects.filter(
            status='PUBLISHED'
        ).select_related('location').order_by('location__name')
        
        return Response(LocalLandingPageListSerializer(pages, many=True).data)


# =============================================================================
# DASHBOARD VIEWS
# =============================================================================

class SEODashboardView(APIView):
    """
    Dashboard stats for the SEO admin panel.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    
    def get(self, request):
        stats = {
            'total_keywords': Keyword.objects.count(),
            'active_keywords': Keyword.objects.filter(status='ACTIVE').count(),
            'total_local_pages': LocalLandingPage.objects.count(),
            'published_local_pages': LocalLandingPage.objects.filter(status='PUBLISHED').count(),
            'draft_local_pages': LocalLandingPage.objects.filter(status='DRAFT').count(),
            'review_local_pages': LocalLandingPage.objects.filter(status='REVIEW').count(),
            'total_articles': SEOArticle.objects.count(),
            'published_articles': SEOArticle.objects.filter(status='PUBLISHED').count(),
            'locations_covered': SwedishLocation.objects.count(),
            'locations_with_customers': SwedishLocation.objects.filter(
                linked_municipality__isnull=False
            ).count(),
            'internal_links': InternalLink.objects.filter(is_active=True).count(),
            'campaigns_active': SEOCampaign.objects.filter(status='ACTIVE').count(),
        }
        
        return Response(stats)


class AIPersonasView(APIView):
    """
    Get available AI personas for content generation.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    
    def get(self, request):
        personas = get_available_personas()
        return Response(personas)
