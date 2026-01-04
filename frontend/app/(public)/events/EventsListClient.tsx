// frontend/app/(public)/events/EventsListClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, MapPin, Clock, Users, ChevronRight, 
  Navigation, Loader2, Search, Filter, X, Sparkles
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { getMediaUrl } from '../../utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

interface PublicEvent {
  id: number;
  title: string;
  description: string;
  slug: string;
  cover_image?: string;
  start_date: string;
  end_date: string;
  location_name: string;
  address?: string;
  municipality_detail?: {
    id: number;
    name: string;
    avatar?: string;
  };
  club_detail?: {
    id: number;
    name: string;
    avatar?: string;
  };
  organizer_display_name: string;
  allow_registration: boolean;
  is_registration_open: boolean;
  max_seats: number;
  confirmed_participants_count: number;
  spots_available: number | null;
  is_free: boolean;
  cost?: string;
  distance_km?: number;
}

interface Municipality {
  id: number;
  name: string;
  slug: string;
}

interface Club {
  id: number;
  name: string;
  slug: string;
  municipality: number;
  municipality_name?: string;
  municipality_slug?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface Interest {
  id: number;
  name: string;
  icon?: string;
  avatar?: string;
}

function EventCard({ event }: { event: PublicEvent }) {
  const startDate = parseISO(event.start_date);
  const coverUrl = getMediaUrl(event.cover_image);
  const organizerAvatar = event.club_detail?.avatar 
    ? getMediaUrl(event.club_detail.avatar) 
    : event.municipality_detail?.avatar 
      ? getMediaUrl(event.municipality_detail.avatar) 
      : null;

  return (
    <Link 
      href={`/events/${event.slug}`}
      className="group flex flex-col sm:flex-row gap-4 p-4 bg-[var(--dark-700)] rounded-2xl border border-[var(--dark-600)] hover:border-[var(--dark-500)] transition-all"
    >
      {/* Cover Image */}
      <div className="relative w-full sm:w-48 h-32 sm:h-32 flex-shrink-0 rounded-xl overflow-hidden bg-[var(--dark-600)]">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20">
            <Calendar className="w-8 h-8 text-[var(--brand-light)]/20" />
          </div>
        )}
        
        {/* Distance Badge */}
        {event.distance_km !== undefined && (
          <div className="absolute top-2 right-2 bg-[var(--brand-sky)] backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 shadow-md">
            <Navigation className="w-3 h-3 text-white" />
            <span className="text-xs font-semibold text-white">
              {event.distance_km < 1 
                ? `${Math.round(event.distance_km * 1000)}m` 
                : `${event.distance_km.toFixed(1)}km`}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Date */}
        <div className="flex items-center gap-2 text-[var(--brand-primary)] text-sm font-medium mb-2">
          <Calendar className="w-4 h-4" />
          {format(startDate, 'EEEE d MMMM', { locale: sv })}
          <span className="text-[var(--brand-light)]/40">•</span>
          <Clock className="w-4 h-4" />
          {format(startDate, 'HH:mm')}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2 group-hover:text-[var(--brand-primary)] transition-colors line-clamp-1">
          {event.title}
        </h3>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--brand-light)]/60">
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {event.location_name}
          </span>
          
          {event.max_seats > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {event.spots_available === 0 
                ? 'Fullbokat' 
                : `${event.spots_available} platser kvar`}
            </span>
          )}
          
          {event.is_free && (
            <span className="text-[var(--brand-green)] font-medium">Gratis</span>
          )}
        </div>

        {/* Organizer */}
        <div className="flex items-center gap-2 mt-3">
          {organizerAvatar ? (
            <img 
              src={organizerAvatar} 
              alt={event.organizer_display_name}
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[var(--brand-primary)]/20 flex items-center justify-center">
              <span className="text-[10px] font-bold text-[var(--brand-primary)]">
                {event.organizer_display_name.charAt(0)}
              </span>
            </div>
          )}
          <span className="text-xs text-[var(--brand-light)]/50">
            {event.organizer_display_name}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <div className="hidden sm:flex items-center">
        <div className="w-10 h-10 rounded-full bg-[var(--dark-600)] flex items-center justify-center group-hover:bg-[var(--brand-primary)] transition-colors">
          <ChevronRight className="w-5 h-5 text-[var(--brand-light)]/60 group-hover:text-[var(--dark-900)] transition-colors" />
        </div>
      </div>
    </Link>
  );
}

interface EventsListClientProps {
  initialFilters?: {
    municipality_slug?: string;
    club_slug?: string;
    search?: string;
    lat?: string;
    lng?: string;
    date?: string;
    [key: string]: string | string[] | undefined;
  };
  showHeader?: boolean;
}

export default function EventsListClient({ 
  initialFilters = {}, 
  showHeader = true 
}: EventsListClientProps) {
  const searchParams = useSearchParams();
  
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  // Get initial values from URL params or initialFilters
  const urlSearch = searchParams.get('search') || '';
  const urlMunicipality = searchParams.get('municipality_slug') || searchParams.get('municipality') || '';
  const urlClub = searchParams.get('club_slug') || searchParams.get('club') || '';
  const urlLat = searchParams.get('lat');
  const urlLng = searchParams.get('lng');
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
    (initialFilters.lat && initialFilters.lng) 
      ? { lat: parseFloat(initialFilters.lat as string), lng: parseFloat(initialFilters.lng as string) }
      : (urlLat && urlLng)
        ? { lat: parseFloat(urlLat), lng: parseFloat(urlLng) }
        : null
  );
  const [searchQuery, setSearchQuery] = useState(
    (initialFilters.search as string) || urlSearch || ''
  );
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>(
    (initialFilters.municipality_slug as string) || urlMunicipality || ''
  );
  const [selectedClub, setSelectedClub] = useState<string>(
    (initialFilters.club_slug as string) || urlClub || ''
  );
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch municipalities, clubs, and interests
  useEffect(() => {
    // Fetch municipalities
    fetch(`${API_URL}/municipalities/`)
      .then(res => res.json())
      .then(data => {
        const muniList = data.results || data;
        setMunicipalities(muniList);
      })
      .catch(console.error);
    
    // Fetch clubs
    fetch(`${API_URL}/clubs/`)
      .then(res => res.json())
      .then(data => {
        const clubList = data.results || data;
        setClubs(clubList);
        setFilteredClubs(clubList);
      })
      .catch(console.error);
    
    // Fetch interests
    fetch(`${API_URL}/interests/`)
      .then(res => res.json())
      .then(data => {
        const interestList = data.results || data;
        setInterests(interestList);
      })
      .catch(console.error);
  }, []);

  // Filter clubs when municipality changes
  useEffect(() => {
    if (selectedMunicipality) {
      const muni = municipalities.find(m => m.slug === selectedMunicipality || m.id.toString() === selectedMunicipality);
      if (muni) {
        setFilteredClubs(clubs.filter(c => c.municipality === muni.id));
      } else {
        setFilteredClubs(clubs);
      }
    } else {
      setFilteredClubs(clubs);
    }
    // Clear club selection when municipality changes (unless it's from initial filters)
    if (!initialFilters.club_slug) {
      setSelectedClub('');
    }
  }, [selectedMunicipality, clubs, municipalities]);

  // Helper function to calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Find closest municipality based on clubs' coordinates
  const findClosestMunicipality = (userLat: number, userLng: number, clubsList: Club[]): string | null => {
    let closestMuniSlug: string | null = null;
    let closestClubName: string | null = null;
    let minDistance = Infinity;

    console.log(`🌍 User location: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}`);
    console.log(`📍 Checking ${clubsList.length} clubs for closest match...`);

    clubsList.forEach(club => {
      if (club.latitude && club.longitude && club.municipality_slug) {
        const distance = calculateDistance(userLat, userLng, club.latitude, club.longitude);
        console.log(`  - ${club.name}: ${distance.toFixed(1)} km (coords: ${club.latitude}, ${club.longitude})`);
        if (distance < minDistance) {
          minDistance = distance;
          closestMuniSlug = club.municipality_slug;
          closestClubName = club.name;
        }
      }
    });

    console.log(`✅ Closest: ${closestClubName} in ${closestMuniSlug} (${minDistance.toFixed(1)} km)`);
    return closestMuniSlug;
  };

  // State to track if we've already auto-selected municipality
  const [hasAutoSelectedMunicipality, setHasAutoSelectedMunicipality] = useState(false);

  // Function to refresh location (forces fresh GPS reading)
  const refreshLocation = () => {
    if (navigator.geolocation) {
      // Reset auto-selection so it can re-select based on new location
      setHasAutoSelectedMunicipality(false);
      setSelectedMunicipality('');
      setUserLocation(null);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Geolocation error:', error.message);
          alert('Kunde inte hämta din position. Kontrollera att platsåtkomst är aktiverad.');
        },
        { 
          enableHighAccuracy: true,  // Use GPS for accuracy
          timeout: 10000,            // 10 second timeout
          maximumAge: 0              // Force fresh location (no cache)
        }
      );
    }
  };

  // Try to get location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Geolocation denied or error - that's okay, we'll show all events
          console.log('Geolocation not available or denied');
        },
        { 
          enableHighAccuracy: true,  // Use GPS for better accuracy
          timeout: 10000,            // 10 second timeout
          maximumAge: 0              // Don't use cached location
        }
      );
    }
  }, []);

  // Auto-select closest municipality when we have both location and clubs
  useEffect(() => {
    // Don't auto-select if:
    // - User already has a filter from URL or initial filters
    // - We've already auto-selected
    // - We don't have location or clubs yet
    const hasExistingMunicipalityFilter = urlMunicipality || initialFilters.municipality_slug;
    
    if (
      !hasExistingMunicipalityFilter && 
      !hasAutoSelectedMunicipality && 
      userLocation && 
      clubs.length > 0
    ) {
      const closestMuniSlug = findClosestMunicipality(userLocation.lat, userLocation.lng, clubs);
      if (closestMuniSlug) {
        setSelectedMunicipality(closestMuniSlug);
        setHasAutoSelectedMunicipality(true);
      }
    }
  }, [userLocation, clubs, hasAutoSelectedMunicipality, urlMunicipality, initialFilters.municipality_slug]);

  // Fetch events
  const fetchEvents = async (pageNum: number, append: boolean = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      let url = `${API_URL}/public/events/?page=${pageNum}&upcoming=true`;
      if (userLocation) {
        url += `&lat=${userLocation.lat}&lng=${userLocation.lng}`;
      }
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      if (selectedMunicipality) {
        url += `&municipality_slug=${selectedMunicipality}`;
      }
      if (selectedClub) {
        url += `&club_slug=${selectedClub}`;
      }
      if (selectedInterests.length > 0) {
        url += `&interests=${selectedInterests.join(',')}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const eventsList = data.results || data;
        
        if (append) {
          setEvents(prev => [...prev, ...eventsList]);
        } else {
          setEvents(eventsList);
        }
        
        setHasMore(data.next !== null);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial fetch and refetch on filter change
  useEffect(() => {
    setPage(1);
    fetchEvents(1, false);
  }, [userLocation, searchQuery, selectedMunicipality, selectedClub, selectedInterests]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage, true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedInterests([]);
    // Don't clear municipality/club if they're from URL params (initial filters)
    if (!initialFilters.municipality_slug) setSelectedMunicipality('');
    if (!initialFilters.club_slug) setSelectedClub('');
  };

  const toggleInterest = (interestId: number) => {
    setSelectedInterests(prev => 
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const hasActiveFilters = searchQuery || 
    selectedInterests.length > 0 ||
    (selectedMunicipality && !initialFilters.municipality_slug) || 
    (selectedClub && !initialFilters.club_slug);

  return (
    <div className={showHeader ? "min-h-screen bg-[var(--dark-900)] pt-24 pb-20" : ""}>
      <div className={showHeader ? "max-w-4xl mx-auto px-4 sm:px-6" : ""}>
        {/* Header */}
        {showHeader && (
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--brand-light)] font-heading mb-2">
              Alla aktiviteter
            </h1>
            <p className="text-[var(--brand-light)]/60">
              Utforska kommande evenemang och aktiviteter
            </p>
          </div>
        )}

        {/* Search & Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--brand-light)]/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök aktiviteter..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          {/* Interests Pills */}
          {interests.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-[var(--brand-light)]/60">
                <Sparkles className="w-4 h-4" />
                <span>Filtrera efter intresse</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => {
                  const isSelected = selectedInterests.includes(interest.id);
                  const avatarUrl = interest.avatar ? getMediaUrl(interest.avatar) : null;
                  
                  return (
                                    <button
                                      key={interest.id}
                                      onClick={() => toggleInterest(interest.id)}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                                        isSelected
                                          ? 'bg-[var(--brand-primary)] text-gray-900 shadow-md'
                                          : 'bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)]/70 hover:border-[var(--brand-primary)] hover:text-[var(--brand-light)]'
                                      }`}
                                    >
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt={interest.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : interest.icon ? (
                        <span className="text-sm">{interest.icon}</span>
                      ) : null}
                      {interest.name}
                      {isSelected && (
                        <X className="w-3 h-3" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)] text-[var(--brand-primary)]'
                  : 'bg-[var(--dark-700)] border-[var(--dark-600)] text-[var(--brand-light)]/70 hover:border-[var(--dark-500)]'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filter
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)]" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] transition-colors"
              >
                <X className="w-4 h-4" />
                Rensa filter
              </button>
            )}

            {userLocation ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--brand-light)]/50">
                <Navigation className="w-4 h-4 text-[var(--brand-sky)]" />
                {hasAutoSelectedMunicipality && selectedMunicipality 
                  ? 'Visar din närmaste kommun'
                  : 'Sorterat efter avstånd'}
                <button
                  onClick={refreshLocation}
                  className="ml-2 text-[var(--brand-sky)] hover:text-[var(--brand-primary)] underline"
                  title="Uppdatera din position"
                >
                  Uppdatera
                </button>
              </div>
            ) : (
              <button
                onClick={refreshLocation}
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--brand-sky)] hover:text-[var(--brand-primary)]"
              >
                <Navigation className="w-4 h-4" />
                Hitta min position
              </button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="p-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Municipality Filter */}
                <div>
                  <label className="block text-sm text-[var(--brand-light)]/70 mb-2">
                    Kommun
                  </label>
                  <select
                    value={selectedMunicipality}
                    onChange={(e) => setSelectedMunicipality(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-[var(--dark-600)] border border-[var(--dark-500)] text-[var(--brand-light)] focus:outline-none focus:border-[var(--brand-primary)]"
                  >
                    <option value="">Alla kommuner</option>
                    {municipalities.map((muni) => (
                      <option key={muni.id} value={muni.slug}>
                        {muni.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Club Filter */}
                <div>
                  <label className="block text-sm text-[var(--brand-light)]/70 mb-2">
                    Fritidsgård
                  </label>
                  <select
                    value={selectedClub}
                    onChange={(e) => setSelectedClub(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-[var(--dark-600)] border border-[var(--dark-500)] text-[var(--brand-light)] focus:outline-none focus:border-[var(--brand-primary)]"
                  >
                    <option value="">Alla fritidsgårdar</option>
                    {filteredClubs.map((club) => (
                      <option key={club.id} value={club.slug}>
                        {club.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Events List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 bg-[var(--dark-700)] rounded-2xl animate-pulse">
                <div className="flex gap-4">
                  <div className="w-48 h-32 bg-[var(--dark-600)] rounded-xl" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-1/3 bg-[var(--dark-600)] rounded" />
                    <div className="h-6 w-3/4 bg-[var(--dark-600)] rounded" />
                    <div className="h-4 w-1/2 bg-[var(--dark-600)] rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 mx-auto text-[var(--brand-light)]/20 mb-4" />
            <h3 className="text-xl font-semibold text-[var(--brand-light)] mb-2">
              Inga aktiviteter hittades
            </h3>
            <p className="text-[var(--brand-light)]/60 mb-6">
              {hasActiveFilters 
                ? 'Prova att ändra dina filter'
                : 'Det finns inga kommande aktiviteter just nu'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-6 py-3 rounded-xl bg-[var(--dark-700)] text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-colors"
              >
                Rensa filter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="text-center pt-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Laddar...
                    </span>
                  ) : (
                    'Ladda fler'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

