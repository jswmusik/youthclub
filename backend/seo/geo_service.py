# backend/seo/geo_service.py
"""
Geo Service for Local SEO

Handles:
- Finding nearby clubs and events based on coordinates
- Calculating distances between locations
- Aggregating platform-wide statistics for public display
"""

from math import radians, sin, cos, sqrt, atan2
from typing import List, Dict, Any, Optional, Tuple
from datetime import timedelta
import logging

from django.db.models import Count, Q
from django.utils import timezone

logger = logging.getLogger(__name__)


class GeoService:
    """
    Handles geographic calculations and nearby content discovery.
    """
    
    # Sweden's approximate boundaries for validation
    SWEDEN_BOUNDS = {
        'lat_min': 55.0,   # Southernmost (Smygehuk)
        'lat_max': 69.1,   # Northernmost (Treriksröset)
        'lng_min': 10.9,   # Westernmost
        'lng_max': 24.2,   # Easternmost
    }
    
    # Default search radius in km
    DEFAULT_RADIUS_KM = 50
    
    def __init__(self):
        pass
    
    def get_nearby_clubs(
        self,
        lat: float,
        lng: float,
        radius_km: float = None,
        limit: int = 10
    ) -> List[Dict]:
        """
        Find clubs within radius of a location.
        
        Args:
            lat: Latitude
            lng: Longitude
            radius_km: Search radius in kilometers (default 50)
            limit: Maximum number of results
        
        Returns:
            List of club dicts sorted by distance
        """
        from organization.models import Club
        
        radius_km = radius_km or self.DEFAULT_RADIUS_KM
        
        # Get all clubs with coordinates
        clubs = Club.objects.filter(
            latitude__isnull=False,
            longitude__isnull=False
        ).select_related('municipality')
        
        nearby = []
        for club in clubs:
            distance = self.haversine(lat, lng, club.latitude, club.longitude)
            if distance <= radius_km:
                # Strip HTML tags from description
                description = club.description or ''
                if description:
                    import re
                    description = re.sub(r'<[^>]+>', '', description)  # Remove HTML tags
                    description = description[:200].strip()
                
                nearby.append({
                    'id': club.id,
                    'name': club.name,
                    'slug': club.slug,
                    'municipality_name': club.municipality.name,
                    'municipality_slug': club.municipality.slug,
                    'distance_km': round(distance, 1),
                    'address': club.address or '',
                    'latitude': club.latitude,
                    'longitude': club.longitude,
                    'description': description,
                    # Images
                    'hero_image': club.hero_image.url if club.hero_image else None,
                    'avatar': club.avatar.url if club.avatar else None,
                })
        
        # Sort by distance
        nearby.sort(key=lambda x: x['distance_km'])
        return nearby[:limit]
    
    def get_nearby_events(
        self,
        lat: float,
        lng: float,
        radius_km: float = None,
        limit: int = 10,
        days_ahead: int = 30
    ) -> List[Dict]:
        """
        Find upcoming public events near a location.
        
        Args:
            lat: Latitude
            lng: Longitude
            radius_km: Search radius in kilometers
            limit: Maximum number of results
            days_ahead: How many days ahead to look
        
        Returns:
            List of event dicts sorted by distance, then date
        """
        from events.models import Event
        
        radius_km = radius_km or self.DEFAULT_RADIUS_KM
        now = timezone.now()
        
        # Get published events with coordinates
        events = Event.objects.filter(
            status='PUBLISHED',
            start_date__gte=now,
            start_date__lte=now + timedelta(days=days_ahead),
            latitude__isnull=False,
            longitude__isnull=False
        ).select_related('club', 'municipality')
        
        nearby = []
        for event in events:
            distance = self.haversine(lat, lng, event.latitude, event.longitude)
            if distance <= radius_km:
                nearby.append({
                    'id': event.id,
                    'title': event.title,
                    'slug': event.slug,
                    'start_date': event.start_date.isoformat(),
                    'start_date_formatted': event.start_date.strftime('%d %b %Y'),
                    'location_name': event.location_name,
                    'club_name': event.club.name if event.club else None,
                    'club_slug': event.club.slug if event.club else None,
                    'municipality_name': event.municipality.name,
                    'distance_km': round(distance, 1),
                })
        
        # Sort by distance, then by date
        nearby.sort(key=lambda x: (x['distance_km'], x['start_date']))
        return nearby[:limit]
    
    def get_aggregated_platform_stats(
        self,
        municipality_id: int = None,
        region: str = None
    ) -> Dict[str, Any]:
        """
        Get aggregated platform statistics for public display.
        
        IMPORTANT: This returns ONLY aggregated data.
        Never expose individual club performance.
        
        Args:
            municipality_id: Optional filter by municipality
            region: Optional filter by region/län
        
        Returns:
            Dict with aggregated statistics
        """
        from visits.models import CheckInSession
        from events.models import Event
        from users.models import User
        from organization.models import Club, Municipality
        
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        
        # Base querysets
        clubs_qs = Club.objects.all()
        events_qs = Event.objects.filter(status='PUBLISHED')
        visits_qs = CheckInSession.objects.filter(check_in_at__gte=thirty_days_ago)
        members_qs = User.objects.filter(role='YOUTH_MEMBER', is_active=True)
        
        # Apply regional filter if provided
        if municipality_id:
            clubs_qs = clubs_qs.filter(municipality_id=municipality_id)
            events_qs = events_qs.filter(
                Q(municipality_id=municipality_id) | 
                Q(club__municipality_id=municipality_id)
            )
            visits_qs = visits_qs.filter(club__municipality_id=municipality_id)
            members_qs = members_qs.filter(preferred_club__municipality_id=municipality_id)
        
        # Calculate stats
        total_clubs = clubs_qs.count()
        total_municipalities = Municipality.objects.filter(
            clubs__isnull=False
        ).distinct().count()
        
        total_visits = visits_qs.count()
        total_members = members_qs.count()
        
        # Upcoming events (next 7 days)
        upcoming_events = events_qs.filter(
            start_date__gte=now,
            start_date__lte=now + timedelta(days=7)
        ).count()
        
        # Events this month
        events_this_month = events_qs.filter(
            start_date__month=now.month,
            start_date__year=now.year
        ).count()
        
        return {
            'total_clubs': total_clubs,
            'total_municipalities': total_municipalities,
            'total_visits': total_visits,
            'total_members': total_members,
            'upcoming_events': upcoming_events,
            'events_this_month': events_this_month,
            'stats_period': 'senaste 30 dagarna',
            'generated_at': now.isoformat(),
        }
    
    def get_trending_interests(self, limit: int = 5) -> List[Dict]:
        """
        Get the most popular interests platform-wide.
        
        Returns:
            List of interests with counts
        """
        from users.models import User
        from organization.models import Interest
        
        # Count users per interest
        interests = Interest.objects.annotate(
            user_count=Count('user', filter=Q(user__role='YOUTH_MEMBER', user__is_active=True))
        ).filter(user_count__gt=0).order_by('-user_count')[:limit]
        
        return [
            {
                'id': i.id,
                'name': i.name,
                'icon': i.icon,
                'count': i.user_count,
            }
            for i in interests
        ]
    
    def find_closest_clubs_to_location(
        self,
        location_slug: str,
        limit: int = 5
    ) -> List[Dict]:
        """
        Find closest clubs to a SwedishLocation.
        
        Args:
            location_slug: Slug of the Swedish location
            limit: Number of clubs to return
        
        Returns:
            List of nearby clubs
        """
        from seo.models import SwedishLocation
        
        try:
            location = SwedishLocation.objects.get(slug=location_slug)
            return self.get_nearby_clubs(
                location.latitude,
                location.longitude,
                radius_km=100,  # Wider radius for non-customer areas
                limit=limit
            )
        except SwedishLocation.DoesNotExist:
            logger.warning(f"Location not found: {location_slug}")
            return []
    
    def is_within_sweden(self, lat: float, lng: float) -> bool:
        """Check if coordinates are within Sweden's boundaries."""
        return (
            self.SWEDEN_BOUNDS['lat_min'] <= lat <= self.SWEDEN_BOUNDS['lat_max'] and
            self.SWEDEN_BOUNDS['lng_min'] <= lng <= self.SWEDEN_BOUNDS['lng_max']
        )
    
    @staticmethod
    def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Calculate the great-circle distance between two points on Earth.
        
        Args:
            lat1, lng1: First point coordinates
            lat2, lng2: Second point coordinates
        
        Returns:
            Distance in kilometers
        """
        R = 6371  # Earth's radius in kilometers
        
        lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
        
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    @staticmethod
    def get_bounding_box(lat: float, lng: float, radius_km: float) -> Tuple[float, float, float, float]:
        """
        Get a bounding box for quick filtering before haversine calculation.
        
        Args:
            lat, lng: Center point
            radius_km: Radius in kilometers
        
        Returns:
            Tuple of (lat_min, lat_max, lng_min, lng_max)
        """
        # Approximate degrees per km
        lat_delta = radius_km / 111.0  # 1 degree latitude ≈ 111 km
        lng_delta = radius_km / (111.0 * cos(radians(lat)))  # Adjust for latitude
        
        return (
            lat - lat_delta,
            lat + lat_delta,
            lng - lng_delta,
            lng + lng_delta,
        )


# =============================================================================
# KEYWORD ANALYSIS HELPER
# =============================================================================

class KeywordAnalyzer:
    """
    Analyzes keywords to detect locations and determine content type.
    """
    
    # Keywords that indicate page type
    PAGE_TYPE_INDICATORS = {
        'CLUBS': [
            'fritidsgård', 'fritidsgard', 'fritidsgårdar', 'fritidsgardar',
            'ungdomsgård', 'ungdomsgard', 'ungdomsgårdar', 'ungdomsgardar',
            'fritids', 'ungdomsverksamhet', 'öppen verksamhet', 'oppen verksamhet',
        ],
        'EVENTS': [
            'evenemang', 'aktiviteter', 'event', 'events', 'händelser',
            'vad händer', 'vad hander', 'att göra', 'att gora',
        ],
        'GENERAL': [
            'ungdom', 'ung', 'unga', 'ungdomar', 'tonåring', 'tonaring',
        ],
    }
    
    # Common Swedish location suffixes to strip
    LOCATION_SUFFIXES = ['kommun', 'stad', 'city']
    
    def detect_location_from_keyword(self, keyword_text: str):
        """
        Detect a Swedish location from keyword text.
        
        Args:
            keyword_text: The keyword (e.g., "fritidsgård stockholm")
        
        Returns:
            SwedishLocation or None
        """
        from .models import SwedishLocation
        
        # Normalize keyword
        keyword_lower = keyword_text.lower().strip()
        
        # Get all locations ordered by population (larger first)
        locations = SwedishLocation.objects.order_by('-population')
        
        # Try to find location name in keyword
        for location in locations:
            location_name_lower = location.name.lower()
            
            # Check if location name appears in keyword
            if location_name_lower in keyword_lower:
                return location
            
            # Also check genitive form (e.g., "Stockholms")
            if location.name_genitive:
                genitive_lower = location.name_genitive.lower()
                if genitive_lower in keyword_lower:
                    return location
        
        return None
    
    def detect_page_type_from_keyword(self, keyword_text: str) -> str:
        """
        Detect the appropriate page type based on keyword.
        
        Args:
            keyword_text: The keyword
        
        Returns:
            Page type: 'CLUBS', 'EVENTS', or 'GENERAL'
        """
        keyword_lower = keyword_text.lower()
        
        # Check for page type indicators
        for page_type, indicators in self.PAGE_TYPE_INDICATORS.items():
            for indicator in indicators:
                if indicator in keyword_lower:
                    return page_type
        
        # Default to GENERAL
        return 'GENERAL'
    
    def suggest_title_from_keyword(self, keyword_text: str, location_name: str = None) -> str:
        """
        Generate a suggested SEO title from keyword.
        
        Args:
            keyword_text: The keyword
            location_name: Location name if detected
        
        Returns:
            Suggested title (max ~60 chars)
        """
        keyword_clean = keyword_text.strip()
        
        # Capitalize appropriately
        title = keyword_clean.title()
        
        # Add a compelling suffix if short enough
        suffix_options = [
            " – Hitta aktiviteter för unga",
            " – Allt du behöver veta",
            " – Din guide",
        ]
        
        for suffix in suffix_options:
            if len(title) + len(suffix) <= 60:
                return f"{title}{suffix}"
        
        return title[:60]
    
    def analyze_keyword(self, keyword_text: str) -> Dict[str, Any]:
        """
        Full analysis of a keyword for page generation.
        
        Args:
            keyword_text: The keyword
        
        Returns:
            Dict with analysis results
        """
        location = self.detect_location_from_keyword(keyword_text)
        page_type = self.detect_page_type_from_keyword(keyword_text)
        
        location_name = location.name if location else None
        suggested_title = self.suggest_title_from_keyword(keyword_text, location_name)
        
        return {
            'keyword': keyword_text,
            'detected_location': location,
            'location_name': location_name,
            'location_id': location.id if location else None,
            'page_type': page_type,
            'suggested_title': suggested_title,
            'has_location': location is not None,
        }


# =============================================================================
# SINGLETON INSTANCES
# =============================================================================

_geo_service = None
_keyword_analyzer = None

def get_geo_service() -> GeoService:
    """Get the singleton GeoService instance."""
    global _geo_service
    if _geo_service is None:
        _geo_service = GeoService()
    return _geo_service

def get_keyword_analyzer() -> KeywordAnalyzer:
    """Get the singleton KeywordAnalyzer instance."""
    global _keyword_analyzer
    if _keyword_analyzer is None:
        _keyword_analyzer = KeywordAnalyzer()
    return _keyword_analyzer

