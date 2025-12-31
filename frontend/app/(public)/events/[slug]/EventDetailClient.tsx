// frontend/app/(public)/events/[slug]/EventDetailClient.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Calendar, Clock, MapPin, Users, Share2, 
  ChevronLeft, ExternalLink, Phone, Mail,
  Navigation, Check, Copy, X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { getMediaUrl } from '../../../utils';
import { sanitizeHtml } from '../../../../lib/sanitize';
import OrganizerInfoModal from '../../components/OrganizerInfoModal';

interface PublicEvent {
  id: number;
  title: string;
  description: string;
  slug: string;
  cover_image?: string;
  video_url?: string;
  start_date: string;
  end_date: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  location_name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  is_map_visible?: boolean;
  municipality_detail?: {
    id: number;
    name: string;
    avatar?: string;
    hero_image?: string;
    description?: string;
    email?: string;
    phone?: string;
  };
  club_detail?: {
    id: number;
    name: string;
    avatar?: string;
    hero_image?: string;
    email?: string;
    phone?: string;
    address?: string;
    description?: string;
  };
  organizer_name?: string;
  organizer_display_name: string;
  allow_registration: boolean;
  is_registration_open: boolean;
  registration_open_date?: string;
  registration_close_date?: string;
  max_seats: number;
  confirmed_participants_count: number;
  spots_available: number | null;
  is_free: boolean;
  cost?: string;
  images?: Array<{ id: number; image: string; caption?: string }>;
  distance_km?: number;
}

interface EventDetailClientProps {
  event: PublicEvent;
}

export default function EventDetailClient({ event }: EventDetailClientProps) {
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const startDate = parseISO(event.start_date);
  const endDate = parseISO(event.end_date);
  const coverUrl = getMediaUrl(event.cover_image);
  
  const organizerAvatar = event.club_detail?.avatar 
    ? getMediaUrl(event.club_detail.avatar) 
    : event.municipality_detail?.avatar 
      ? getMediaUrl(event.municipality_detail.avatar) 
      : null;

  const handleShare = async () => {
    const shareData = {
      title: event.title,
      text: `Kolla in ${event.title} på Ungdomsappen!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      setShowShareMenu(!showShareMenu);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openGoogleMaps = () => {
    const query = event.latitude && event.longitude 
      ? `${event.latitude},${event.longitude}`
      : encodeURIComponent(event.address || event.location_name);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[var(--dark-900)] pt-20">
      {/* Hero Section */}
      <div className="relative h-64 sm:h-80 md:h-96 bg-[var(--dark-800)]">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20 flex items-center justify-center">
            <Calendar className="w-24 h-24 text-[var(--brand-light)]/10" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-900)] via-[var(--dark-900)]/50 to-transparent" />
        
        {/* Back Button */}
        <Link
          href="/#events"
          className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-900)]/80 backdrop-blur-sm text-[var(--brand-light)] hover:bg-[var(--dark-800)] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Tillbaka</span>
        </Link>

        {/* Share Button */}
        <div className="absolute top-4 right-4">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-900)]/80 backdrop-blur-sm text-[var(--brand-light)] hover:bg-[var(--dark-800)] transition-colors"
          >
            <Share2 className="w-5 h-5" />
            <span className="hidden sm:inline">Dela</span>
          </button>
          
          {/* Share Menu Dropdown */}
          {showShareMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-600)] shadow-xl overflow-hidden">
              <button
                onClick={copyLink}
                className="w-full flex items-center gap-3 px-4 py-3 text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-[var(--brand-green)]" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Kopierad!' : 'Kopiera länk'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-20 relative z-10 pb-20">
        {/* Main Card */}
        <div className="bg-[var(--dark-700)] rounded-3xl border border-[var(--dark-600)] overflow-hidden">
          <div className="p-6 sm:p-8">
            {/* Date Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 mb-6">
              <Calendar className="w-4 h-4 text-[var(--brand-primary)]" />
              <span className="text-[var(--brand-primary)] font-medium">
                {format(startDate, 'EEEE d MMMM yyyy', { locale: sv })}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--brand-light)] mb-4 font-heading">
              {event.title}
            </h1>

            {/* Organizer */}
            <button
              onClick={() => setShowOrganizerModal(true)}
              className="flex items-center gap-3 mb-6 group"
            >
              {organizerAvatar ? (
                <img 
                  src={organizerAvatar} 
                  alt={event.organizer_display_name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--dark-600)] group-hover:ring-[var(--brand-primary)] transition-all"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center ring-2 ring-[var(--dark-600)] group-hover:ring-[var(--brand-primary)] transition-all">
                  <span className="text-sm font-bold text-[var(--dark-900)]">
                    {event.organizer_display_name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="text-left">
                <p className="text-[var(--brand-light)] font-medium group-hover:text-[var(--brand-primary)] transition-colors">
                  {event.organizer_display_name}
                </p>
                <p className="text-[var(--brand-light)]/50 text-sm">
                  Klicka för mer info
                </p>
              </div>
            </button>

            {/* Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {/* Time */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--dark-600)]/50">
                <Clock className="w-5 h-5 text-[var(--brand-primary)] mt-0.5" />
                <div>
                  <p className="text-[var(--brand-light)]/50 text-sm mb-1">Tid</p>
                  <p className="text-[var(--brand-light)] font-medium">
                    {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                  </p>
                </div>
              </div>

              {/* Location */}
              <button
                onClick={openGoogleMaps}
                className="flex items-start gap-3 p-4 rounded-xl bg-[var(--dark-600)]/50 text-left hover:bg-[var(--dark-600)] transition-colors group"
              >
                <MapPin className="w-5 h-5 text-[var(--brand-primary)] mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--brand-light)]/50 text-sm mb-1">Plats</p>
                  <p className="text-[var(--brand-light)] font-medium truncate group-hover:text-[var(--brand-primary)] transition-colors">
                    {event.location_name}
                  </p>
                  {event.address && (
                    <p className="text-[var(--brand-light)]/50 text-sm truncate">
                      {event.address}
                    </p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--brand-light)]/30 group-hover:text-[var(--brand-primary)] transition-colors" />
              </button>

              {/* Spots */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--dark-600)]/50">
                <Users className="w-5 h-5 text-[var(--brand-primary)] mt-0.5" />
                <div>
                  <p className="text-[var(--brand-light)]/50 text-sm mb-1">Platser</p>
                  <p className={`font-medium ${
                    event.spots_available === 0 
                      ? 'text-[var(--brand-coral)]' 
                      : 'text-[var(--brand-light)]'
                  }`}>
                    {event.max_seats === 0 
                      ? 'Obegränsat antal platser'
                      : event.spots_available === 0 
                        ? 'Fullbokat' 
                        : `${event.spots_available} av ${event.max_seats} platser kvar`}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--dark-600)]/50">
                <div className="w-5 h-5 rounded-full bg-[var(--brand-green)]/20 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-[var(--brand-green)]">kr</span>
                </div>
                <div>
                  <p className="text-[var(--brand-light)]/50 text-sm mb-1">Pris</p>
                  <p className={`font-medium ${
                    event.is_free ? 'text-[var(--brand-green)]' : 'text-[var(--brand-light)]'
                  }`}>
                    {event.is_free ? 'Gratis' : `${event.cost} kr`}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[var(--brand-light)] mb-4">
                Om evenemanget
              </h2>
              <div 
                className="event-description-content max-w-none leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description) }}
              />
            </div>

            {/* Gallery */}
            {event.images && event.images.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-[var(--brand-light)] mb-4">
                  Bilder
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {event.images.map((img) => {
                    const imageUrl = getMediaUrl(img.image);
                    return (
                      <div 
                        key={img.id} 
                        className="aspect-square rounded-xl overflow-hidden bg-[var(--dark-600)]"
                      >
                        {imageUrl && (
                          <img 
                            src={imageUrl} 
                            alt={img.caption || event.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Map */}
            {event.is_map_visible && event.latitude && event.longitude && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-[var(--brand-light)] mb-4">
                  Hitta hit
                </h2>
                <div className="rounded-xl overflow-hidden border border-[var(--dark-600)]">
                  {/* Embedded OpenStreetMap */}
                  <iframe
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.longitude - 0.01}%2C${event.latitude - 0.01}%2C${event.longitude + 0.01}%2C${event.latitude + 0.01}&layer=mapnik&marker=${event.latitude}%2C${event.longitude}`}
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="w-full"
                    title={`Karta för ${event.location_name}`}
                  />
                  <button
                    onClick={openGoogleMaps}
                    className="w-full py-3 bg-[var(--dark-600)] flex items-center justify-center gap-2 hover:bg-[var(--dark-500)] transition-colors group"
                  >
                    <Navigation className="w-5 h-5 text-[var(--brand-primary)]" />
                    <span className="text-[var(--brand-light)]/70 group-hover:text-[var(--brand-light)] transition-colors text-sm font-medium">
                      Öppna i Google Maps
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* CTA */}
            {event.allow_registration && (
              <div className="pt-6 border-t border-[var(--dark-600)]">
                {event.is_registration_open ? (
                  <Link
                    href={`/register/youth?redirect=/events/${event.slug}`}
                    className="block w-full py-4 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-[var(--dark-900)] font-semibold text-lg text-center hover:opacity-90 transition-all shadow-xl hover:shadow-[var(--brand-primary)]/30"
                  >
                    Anmäl dig nu
                  </Link>
                ) : (
                  <div className="text-center py-4 rounded-xl bg-[var(--dark-600)] text-[var(--brand-light)]/50">
                    {event.spots_available === 0 
                      ? 'Evenemanget är fullbokat'
                      : 'Anmälan är inte öppen ännu'}
                  </div>
                )}
                
                <p className="text-center text-sm text-[var(--brand-light)]/50 mt-4">
                  Du behöver ett konto för att anmäla dig.{' '}
                  <Link href="/login" className="text-[var(--brand-primary)] hover:underline">
                    Logga in
                  </Link>
                  {' '}eller{' '}
                  <Link href="/register/youth" className="text-[var(--brand-primary)] hover:underline">
                    skapa konto
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Organizer Modal */}
      <OrganizerInfoModal
        isOpen={showOrganizerModal}
        onClose={() => setShowOrganizerModal(false)}
        organizer={{
          name: event.organizer_display_name,
          avatar: organizerAvatar,
          heroImage: event.club_detail?.hero_image 
            ? getMediaUrl(event.club_detail.hero_image) 
            : event.municipality_detail?.hero_image 
              ? getMediaUrl(event.municipality_detail.hero_image) 
              : null,
          email: event.club_detail?.email || event.municipality_detail?.email,
          phone: event.club_detail?.phone || event.municipality_detail?.phone,
          address: event.club_detail?.address,
          description: event.club_detail?.description || event.municipality_detail?.description,
        }}
      />
    </div>
  );
}

