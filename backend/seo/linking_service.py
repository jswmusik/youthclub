# backend/seo/linking_service.py
"""
Internal Linking Service

Manages internal linking strategy between pages to:
- Improve SEO through proper link distribution
- Help users discover related content
- Build topical authority clusters
"""

import logging
from typing import List, Dict, Any, Optional
from django.db.models import Q

logger = logging.getLogger(__name__)


class InternalLinkingService:
    """
    Manages internal linking strategy for SEO.
    """
    
    # Link strength multipliers based on relationship type
    LINK_WEIGHTS = {
        'same_municipality': 4,      # Strong local relevance
        'same_region': 3,            # Regional relevance
        'same_keyword': 5,           # Same topic
        'related_keyword': 3,        # Related topic
        'nearby_location': 3,        # Geographic proximity
        'same_audience': 2,          # Same target audience
        'hub_page': 4,               # Link from hub/index pages
    }
    
    # Maximum links per page (to avoid over-optimization)
    MAX_CONTEXTUAL_LINKS = 10
    MAX_RELATED_LINKS = 5
    
    def __init__(self):
        pass
    
    def generate_links_for_local_page(
        self,
        page_id: int
    ) -> List[Dict]:
        """
        Generate suggested internal links for a local landing page.
        
        Args:
            page_id: ID of the LocalLandingPage
        
        Returns:
            List of suggested link dicts
        """
        from seo.models import LocalLandingPage, SEOArticle, InternalLink
        
        try:
            page = LocalLandingPage.objects.select_related(
                'location', 'primary_keyword'
            ).get(id=page_id)
        except LocalLandingPage.DoesNotExist:
            return []
        
        links = []
        location = page.location
        
        # 1. Links to other local pages in the same region
        same_region_pages = LocalLandingPage.objects.filter(
            location__region=location.region,
            status='PUBLISHED'
        ).exclude(id=page_id)[:5]
        
        for p in same_region_pages:
            links.append({
                'target_url': f'/kommun/{p.slug}',
                'anchor_text': f'Fritidsgård i {p.location.name}',
                'link_type': 'RELATED',
                'strength': self.LINK_WEIGHTS['same_region'],
                'reason': 'same_region',
            })
        
        # 2. Links to nearby local pages (geographic)
        nearby_pages = self._get_nearby_local_pages(
            location.latitude,
            location.longitude,
            exclude_id=page_id,
            limit=5
        )
        
        for p in nearby_pages:
            if not any(l['target_url'] == f'/kommun/{p.slug}' for l in links):
                links.append({
                    'target_url': f'/kommun/{p.slug}',
                    'anchor_text': f'{p.location.name}',
                    'link_type': 'RELATED',
                    'strength': self.LINK_WEIGHTS['nearby_location'],
                    'reason': 'nearby_location',
                })
        
        # 3. Links to relevant articles
        relevant_articles = self._find_relevant_articles(
            keyword=page.primary_keyword.keyword if page.primary_keyword else None,
            audience=page.target_audience,
            limit=3
        )
        
        for article in relevant_articles:
            links.append({
                'target_url': f'/artiklar/{article.slug}',
                'anchor_text': article.title,
                'link_type': 'CONTEXTUAL',
                'strength': self.LINK_WEIGHTS['related_keyword'],
                'reason': 'relevant_content',
            })
        
        # 4. Link to hub page (municipality index)
        links.append({
            'target_url': '/kommuner',
            'anchor_text': 'Se alla kommuner',
            'link_type': 'NAVIGATION',
            'strength': self.LINK_WEIGHTS['hub_page'],
            'reason': 'hub_page',
        })
        
        # Sort by strength and limit
        links.sort(key=lambda x: x['strength'], reverse=True)
        return links[:self.MAX_CONTEXTUAL_LINKS]
    
    def generate_links_for_article(
        self,
        article_id: int
    ) -> List[Dict]:
        """
        Generate suggested internal links for an article.
        
        Args:
            article_id: ID of the SEOArticle
        
        Returns:
            List of suggested link dicts
        """
        from seo.models import SEOArticle, LocalLandingPage
        
        try:
            article = SEOArticle.objects.select_related(
                'target_keyword'
            ).get(id=article_id)
        except SEOArticle.DoesNotExist:
            return []
        
        links = []
        
        # 1. Links to other articles with same/related keywords
        if article.target_keyword:
            related_articles = SEOArticle.objects.filter(
                Q(target_keyword=article.target_keyword) |
                Q(secondary_keywords=article.target_keyword),
                status='PUBLISHED'
            ).exclude(id=article_id)[:3]
            
            for a in related_articles:
                links.append({
                    'target_url': f'/artiklar/{a.slug}',
                    'anchor_text': a.title,
                    'link_type': 'RELATED',
                    'strength': self.LINK_WEIGHTS['same_keyword'],
                    'reason': 'same_keyword',
                })
        
        # 2. Links to articles for same audience
        same_audience_articles = SEOArticle.objects.filter(
            target_audience=article.target_audience,
            status='PUBLISHED'
        ).exclude(id=article_id)[:3]
        
        for a in same_audience_articles:
            if not any(l['target_url'] == f'/artiklar/{a.slug}' for l in links):
                links.append({
                    'target_url': f'/artiklar/{a.slug}',
                    'anchor_text': a.title,
                    'link_type': 'RELATED',
                    'strength': self.LINK_WEIGHTS['same_audience'],
                    'reason': 'same_audience',
                })
        
        # 3. Links to relevant local pages (top cities)
        top_local_pages = LocalLandingPage.objects.filter(
            status='PUBLISHED',
            location__population__gte=50000  # Major cities
        ).order_by('-location__population')[:3]
        
        for p in top_local_pages:
            links.append({
                'target_url': f'/kommun/{p.slug}',
                'anchor_text': f'Fritidsgård i {p.location.name}',
                'link_type': 'CONTEXTUAL',
                'strength': self.LINK_WEIGHTS['hub_page'],
                'reason': 'major_city',
            })
        
        # Sort and limit
        links.sort(key=lambda x: x['strength'], reverse=True)
        return links[:self.MAX_CONTEXTUAL_LINKS]
    
    def save_links_for_page(
        self,
        source_url: str,
        source_type: str,
        links: List[Dict]
    ) -> int:
        """
        Save generated links to the database.
        
        Args:
            source_url: URL of the source page
            source_type: Type of source page
            links: List of link dicts
        
        Returns:
            Number of links saved
        """
        from seo.models import InternalLink
        
        # Remove existing auto-generated links for this source
        InternalLink.objects.filter(
            source_url=source_url,
            is_auto_generated=True
        ).delete()
        
        # Create new links
        count = 0
        for link in links:
            InternalLink.objects.create(
                source_url=source_url,
                source_page_type=source_type,
                target_url=link['target_url'],
                target_page_type=link.get('target_type', ''),
                anchor_text=link['anchor_text'],
                link_type=link.get('link_type', 'CONTEXTUAL'),
                link_strength=link.get('strength', 5),
                is_auto_generated=True,
            )
            count += 1
        
        return count
    
    def get_pages_that_should_link_to(
        self,
        target_url: str,
        limit: int = 10
    ) -> List[Dict]:
        """
        Find existing pages that should link TO a new page.
        Useful when creating new content.
        
        Args:
            target_url: URL of the target page
            limit: Maximum results
        
        Returns:
            List of page dicts that should add links
        """
        from seo.models import LocalLandingPage, SEOArticle
        
        # This would analyze content and find relevant pages
        # For now, return basic suggestions based on URL pattern
        
        suggestions = []
        
        # If it's a local page, suggest other pages in same region
        if '/kommun/' in target_url:
            slug = target_url.split('/kommun/')[-1].rstrip('/')
            try:
                page = LocalLandingPage.objects.get(slug=slug)
                same_region = LocalLandingPage.objects.filter(
                    location__region=page.location.region,
                    status='PUBLISHED'
                ).exclude(slug=slug)[:limit]
                
                for p in same_region:
                    suggestions.append({
                        'page_url': f'/kommun/{p.slug}',
                        'page_title': p.h1_title,
                        'reason': 'Same region - should cross-link',
                    })
            except LocalLandingPage.DoesNotExist:
                pass
        
        return suggestions
    
    def analyze_link_distribution(self) -> Dict[str, Any]:
        """
        Analyze the overall internal link distribution.
        Useful for SEO audits.
        
        Returns:
            Analysis dict with metrics and issues
        """
        from seo.models import InternalLink, LocalLandingPage, SEOArticle
        
        # Count links per page type
        local_pages = LocalLandingPage.objects.filter(status='PUBLISHED').count()
        articles = SEOArticle.objects.filter(status='PUBLISHED').count()
        total_links = InternalLink.objects.filter(is_active=True).count()
        
        # Find orphan pages (no incoming links)
        all_targets = set(InternalLink.objects.values_list('target_url', flat=True))
        
        orphan_local_pages = LocalLandingPage.objects.filter(
            status='PUBLISHED'
        ).exclude(
            slug__in=[t.split('/kommun/')[-1].rstrip('/') for t in all_targets if '/kommun/' in t]
        )
        
        orphan_articles = SEOArticle.objects.filter(
            status='PUBLISHED'
        ).exclude(
            slug__in=[t.split('/artiklar/')[-1].rstrip('/') for t in all_targets if '/artiklar/' in t]
        )
        
        return {
            'total_published_pages': local_pages + articles,
            'local_pages': local_pages,
            'articles': articles,
            'total_internal_links': total_links,
            'avg_links_per_page': round(total_links / max(local_pages + articles, 1), 1),
            'orphan_local_pages': orphan_local_pages.count(),
            'orphan_articles': orphan_articles.count(),
            'issues': self._identify_link_issues(),
        }
    
    def _get_nearby_local_pages(
        self,
        lat: float,
        lng: float,
        exclude_id: int,
        limit: int = 5
    ) -> List:
        """Get local pages near a location."""
        from seo.models import LocalLandingPage
        from seo.geo_service import get_geo_service
        
        geo = get_geo_service()
        
        # Get pages with locations
        pages = LocalLandingPage.objects.filter(
            status='PUBLISHED',
            location__latitude__isnull=False,
        ).exclude(id=exclude_id).select_related('location')
        
        # Calculate distances
        pages_with_distance = []
        for page in pages:
            distance = geo.haversine(lat, lng, page.location.latitude, page.location.longitude)
            pages_with_distance.append((page, distance))
        
        # Sort and return
        pages_with_distance.sort(key=lambda x: x[1])
        return [p for p, d in pages_with_distance[:limit]]
    
    def _find_relevant_articles(
        self,
        keyword: str = None,
        audience: str = None,
        limit: int = 3
    ) -> List:
        """Find articles relevant to given criteria."""
        from seo.models import SEOArticle
        
        qs = SEOArticle.objects.filter(status='PUBLISHED')
        
        if audience:
            qs = qs.filter(target_audience=audience)
        
        if keyword:
            qs = qs.filter(
                Q(target_keyword__keyword__icontains=keyword) |
                Q(title__icontains=keyword) |
                Q(content__icontains=keyword)
            )
        
        return qs[:limit]
    
    def _identify_link_issues(self) -> List[Dict]:
        """Identify potential linking issues."""
        from seo.models import InternalLink
        
        issues = []
        
        # Check for broken links (targets that don't exist)
        # This would need to verify URLs exist
        
        # Check for pages with too many outgoing links
        from django.db.models import Count
        
        over_linked = InternalLink.objects.values('source_url').annotate(
            link_count=Count('id')
        ).filter(link_count__gt=20)
        
        for item in over_linked:
            issues.append({
                'type': 'over_linked',
                'url': item['source_url'],
                'message': f"Page has {item['link_count']} outgoing links (recommended max: 20)",
            })
        
        return issues


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

_linking_service = None

def get_linking_service() -> InternalLinkingService:
    """Get the singleton InternalLinkingService instance."""
    global _linking_service
    if _linking_service is None:
        _linking_service = InternalLinkingService()
    return _linking_service












