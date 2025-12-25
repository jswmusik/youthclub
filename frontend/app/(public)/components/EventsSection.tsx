// frontend/app/(public)/components/EventsSection.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, MapPin, Clock, Users, ChevronRight, 
  Navigation, Loader2, ArrowRight 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { getMediaUrl } from '../../utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.208:8000/api';

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
  latitude?: number;
  longitude?: number;
  municipality_detail?: {
    id: number;
    name: string;
    avatar?: string;
  };
  club_detail?: {
    id: number;
    name: string;
    avatar?: string;
    email?: string;
    phone?: string;
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

function EventCard({ event }: { event: PublicEvent }) {
  const startDate = parseISO(event.start_date);
  const endDate = parseISO(event.end_date);
  const isSameDay = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');
  
  const coverUrl = getMediaUrl(event.cover_image);
  const organizerAvatar = event.club_detail?.avatar 
    ? getMediaUrl(event.club_detail.avatar) 
    : event.municipality_detail?.avatar 
      ? getMediaUrl(event.municipality_detail.avatar) 
      : null;

  return (
    <Link 
      href={`/events/${event.slug}`}
      className="group block bg-[var(--dark-700)] rounded-2xl overflow-hidden border border-[var(--dark-600)] hover:border-[var(--dark-500)] transition-all hover:shadow-xl hover:shadow-[var(--brand-primary)]/5"
    >
      {/* Cover Image */}
      <div className="relative h-48 bg-[var(--dark-600)] overflow-hidden">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20">
            <Calendar className="w-12 h-12 text-[var(--brand-light)]/20" />
          </div>
        )}
        
        {/* Date Badge */}
        <div className="absolute top-4 left-4 bg-[var(--dark-900)]/90 backdrop-blur-sm rounded-xl px-3 py-2 text-center">
          <div className="text-2xl font-bold text-[var(--brand-primary)]">
            {format(startDate, 'd')}
          </div>
          <div className="text-xs text-[var(--brand-light)]/70 uppercase">
            {format(startDate, 'MMM', { locale: sv })}
          </div>
        </div>

        {/* Distance Badge */}
        {event.distance_km !== undefined && (
          <div className="absolute top-4 right-4 bg-[var(--brand-sky)]/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
            <Navigation className="w-3 h-3 text-[var(--dark-900)]" />
            <span className="text-xs font-semibold text-[var(--dark-900)]">
              {event.distance_km < 1 
                ? `${Math.round(event.distance_km * 1000)}m` 
                : `${event.distance_km.toFixed(1)}km`}
            </span>
          </div>
        )}

        {/* Free Badge */}
        {event.is_free && (
          <div className="absolute bottom-4 left-4 bg-[var(--brand-green)]/90 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-xs font-semibold text-[var(--dark-900)]">Gratis</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Organizer */}
        <div className="flex items-center gap-2 mb-3">
          {organizerAvatar ? (
            <img 
              src={organizerAvatar} 
              alt={event.organizer_display_name}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[var(--brand-primary)]/20 flex items-center justify-center">
              <span className="text-xs font-bold text-[var(--brand-primary)]">
                {event.organizer_display_name.charAt(0)}
              </span>
            </div>
          )}
          <span className="text-sm text-[var(--brand-light)]/60 truncate">
            {event.organizer_display_name}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2 line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors">
          {event.title}
        </h3>

        {/* Meta Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-[var(--brand-light)]/60 text-sm">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>
              {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[var(--brand-light)]/60 text-sm">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{event.location_name}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--dark-600)]">
          {/* Spots */}
          {event.max_seats > 0 ? (
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-[var(--brand-light)]/40" />
              <span className={`font-medium ${
                event.spots_available === 0 
                  ? 'text-[var(--brand-coral)]' 
                  : event.spots_available && event.spots_available < 5 
                    ? 'text-[var(--brand-peach)]' 
                    : 'text-[var(--brand-light)]/70'
              }`}>
                {event.spots_available === 0 
                  ? 'Fullbokat' 
                  : event.spots_available === null 
                    ? 'Obegränsat' 
                    : `${event.spots_available} platser kvar`}
              </span>
            </div>
          ) : (
            <span className="text-sm text-[var(--brand-light)]/50">Öppet för alla</span>
          )}

          {/* Arrow */}
          <div className="w-8 h-8 rounded-full bg-[var(--dark-600)] flex items-center justify-center group-hover:bg-[var(--brand-primary)] transition-colors">
            <ChevronRight className="w-4 h-4 text-[var(--brand-light)]/60 group-hover:text-[var(--dark-900)] transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function EventsSection() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);

  // Try to get location on mount
  useEffect(() => {
    if (navigator.geolocation && !locationRequested) {
      setLocationRequested(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Silently fail - location is optional
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    }
  }, [locationRequested]);

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        let url = `${API_URL}/public/events/?upcoming=true`;
        if (userLocation) {
          url += `&lat=${userLocation.lat}&lng=${userLocation.lng}`;
        }
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          // Handle paginated response
          const eventsList = data.results || data;
          setEvents(eventsList.slice(0, 6)); // Show max 6 events
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [userLocation]);

  return (
    <section className="py-20 px-4 bg-[var(--dark-900)]">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-[var(--brand-primary)] text-sm font-semibold uppercase tracking-wider mb-2">
              Händer just nu
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--brand-light)] font-heading">
              Kommande aktiviteter
            </h2>
            {userLocation && (
              <p className="text-[var(--brand-light)]/50 text-sm mt-2 flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Sorterat efter avstånd från dig
              </p>
            )}
          </div>
          
          <Link 
            href="/events"
            className="inline-flex items-center gap-2 text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80 font-medium transition-colors group"
          >
            Se alla aktiviteter
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-[var(--dark-700)] rounded-2xl overflow-hidden animate-pulse">
                <div className="h-48 bg-[var(--dark-600)]" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-1/3 bg-[var(--dark-600)] rounded" />
                  <div className="h-6 w-3/4 bg-[var(--dark-600)] rounded" />
                  <div className="h-4 w-1/2 bg-[var(--dark-600)] rounded" />
                  <div className="h-4 w-2/3 bg-[var(--dark-600)] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 mx-auto text-[var(--brand-light)]/20 mb-4" />
            <h3 className="text-xl font-semibold text-[var(--brand-light)] mb-2">
              Inga kommande aktiviteter
            </h3>
            <p className="text-[var(--brand-light)]/60">
              Det finns inga publika aktiviteter just nu. Kom tillbaka snart!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {/* CTA */}
        {events.length > 0 && (
          <div className="text-center mt-12">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] font-medium hover:bg-[var(--dark-600)] transition-all"
            >
              Utforska fler aktiviteter
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

