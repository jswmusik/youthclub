'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GoogleMap, Marker, LoadScript } from '@react-google-maps/api';
import { 
  ArrowLeft, Edit, MapPin, Mail, Phone, Clock, FileText, 
  Users, LogIn, Building2, Tag, ExternalLink, Shield, ChevronRight
} from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import { Badge } from '@/components/ui/badge';

interface ClubDetailProps {
  clubId: string;
  basePath: string;
  editPath?: string | null;
  followersPath?: string | null;
  visitsPath?: string | null;
  backLabel?: string;
}

const WEEKDAYS = [
    { id: 1, name: 'Monday' }, { id: 2, name: 'Tuesday' }, { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' }, { id: 5, name: 'Friday' }, { id: 6, name: 'Saturday' }, { id: 7, name: 'Sunday' },
];

export default function ClubDetailView({ 
  clubId, 
  basePath, 
  editPath,
  followersPath,
  visitsPath,
  backLabel = 'Back to List'
}: ClubDetailProps) {
  const searchParams = useSearchParams();
  const [club, setClub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/clubs/${clubId}/`).then(res => {
      setClub(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [clubId]);

  const buildUrlWithParams = (path: string) => {
    const queryString = searchParams.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const getEditPath = () => {
    if (editPath === null) return null;
    return editPath !== undefined ? editPath : buildUrlWithParams(`${basePath}/edit/${clubId}`);
  };
  const getFollowersPath = () => {
    if (followersPath === null) return null;
    return followersPath !== undefined ? followersPath : `${basePath}/${clubId}/followers`;
  };
  const getVisitsPath = () => {
    if (visitsPath === null) return null;
    return visitsPath !== undefined ? visitsPath : `${basePath}/${clubId}/visits`;
  };
  
  const showVisits = visitsPath !== null;
  const showFollowers = followersPath !== null;
  const showEdit = editPath !== null;

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-[var(--brand-light)]/60 animate-pulse">Loading club details...</span>
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--brand-red)]/10 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-[var(--brand-red)]" />
          </div>
          <p className="text-[var(--brand-red)]">Club not found.</p>
          <Link 
            href={buildUrlWithParams(basePath)}
            className="text-sm text-[var(--brand-primary)] hover:underline"
          >
            ← Back to clubs list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0 sm:space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-0 mb-6">
        <Link 
          href={buildUrlWithParams(basePath)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
        <div className="flex flex-wrap gap-2">
          {showVisits && (
            <Link 
              href={getVisitsPath()!}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">View Visitors</span>
              <span className="sm:hidden">Visitors</span>
            </Link>
          )}
          {showFollowers && (
            <Link 
              href={getFollowersPath()!}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">View Followers</span>
              <span className="sm:hidden">Followers</span>
            </Link>
          )}
          {showEdit && (
            <Link 
              href={getEditPath()!}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all text-sm shadow-lg shadow-[var(--brand-primary)]/20"
            >
              <Edit className="h-4 w-4" /> Edit Club
            </Link>
          )}
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        {/* Header Banner with Hero Image */}
        <div className="relative h-36 sm:h-48 bg-gradient-to-br from-[var(--brand-purple)]/30 via-[var(--dark-700)] to-[var(--brand-primary)]/20">
          {/* Background Image */}
          {club.hero_image && (
            <div className="absolute inset-0">
              <img 
                src={getMediaUrl(club.hero_image) || ''} 
                className="w-full h-full object-cover opacity-40" 
                alt="Hero" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-800)] via-transparent to-transparent" />
            </div>
          )}
          
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
            <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-[var(--brand-purple)]/20 blur-2xl" />
          </div>
          
          {/* Municipality Badge - Top Right */}
          <div className="absolute top-4 right-4 px-4 py-2 rounded-xl bg-[var(--dark-800)]/80 backdrop-blur-sm border border-[var(--dark-500)] flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--brand-primary)]" />
            <span className="text-sm font-semibold text-[var(--brand-light)]">{club.municipality_name}</span>
          </div>

          {/* Category Badge */}
          {club.club_categories && (
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-[var(--dark-800)]/80 backdrop-blur-sm border border-[var(--dark-500)] flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-[var(--brand-purple)]" />
              <span className="text-xs font-bold text-[var(--brand-purple)]">{club.club_categories}</span>
            </div>
          )}
        </div>
        
        {/* Avatar & Title Section */}
        <div className="relative z-10 px-4 sm:px-6 pb-6 -mt-14 sm:-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative z-20 w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-[var(--dark-800)] shadow-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden flex-shrink-0">
              {club.avatar ? (
                <img 
                  src={getMediaUrl(club.avatar) || ''} 
                  alt={club.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center">
                  <Building2 className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                </div>
              )}
            </div>

            {/* Title & Info */}
            <div className="flex-1 space-y-2 pt-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{club.name}</h1>
              <div className="flex flex-wrap items-center gap-3">
                {club.address && (
                  <div className="flex items-center gap-2 text-[var(--brand-light)]/50 text-sm">
                    <MapPin className="h-4 w-4" />
                    <span>{club.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 sm:gap-6 px-0 sm:px-0">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-0 sm:space-y-6">
          
          {/* About Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">About</h2>
            </div>
            <div className="p-6">
              <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                {club.description ? (
                  <p className="text-sm leading-relaxed text-[var(--brand-light)]/80 whitespace-pre-wrap">{club.description}</p>
                ) : (
                  <p className="text-sm italic text-[var(--brand-light)]/30">No description provided.</p>
                )}
              </div>
            </div>
          </div>

          {/* Opening Hours Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">Opening Hours</h2>
            </div>
            <div className="p-6 space-y-3">
              {club.regular_hours && club.regular_hours.length > 0 ? (
                club.regular_hours.map((h: any, i: number) => {
                  const day = WEEKDAYS.find(d => d.id === h.weekday)?.name;
                  const today = new Date();
                  const todayWeekday = today.getDay() === 0 ? 7 : today.getDay();
                  const isToday = h.weekday === todayWeekday;
                  
                  const restrictions = [];
                  if (h.gender_restriction && h.gender_restriction !== 'ALL') {
                    restrictions.push(
                      h.gender_restriction === 'GIRLS' ? 'Girls Only' : 
                      h.gender_restriction === 'BOYS' ? 'Boys Only' : 'Other Gender'
                    );
                  }
                  if (h.restriction_mode === 'AGE' && h.min_value && h.max_value) {
                    restrictions.push(`Age ${h.min_value}-${h.max_value}`);
                  } else if (h.restriction_mode === 'GRADE' && h.min_value && h.max_value) {
                    restrictions.push(`Grades ${h.min_value}-${h.max_value}`);
                  }
                  
                  return (
                    <div 
                      key={i} 
                      className={`p-4 rounded-xl border transition-all ${
                        isToday 
                          ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/40' 
                          : 'bg-[var(--dark-700)]/50 border-[var(--dark-500)] hover:border-[var(--dark-400)]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`font-bold text-sm ${isToday ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-light)]'}`}>
                              {day}
                            </span>
                            {isToday && (
                              <span className="bg-[var(--brand-primary)] text-[var(--dark-900)] text-[10px] px-2 py-0.5 rounded-full font-bold">
                                Today
                              </span>
                            )}
                            {h.week_cycle !== 'ALL' && (
                              <span className="bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30 text-[10px] px-2 py-0.5 rounded-full">
                                {h.week_cycle === 'ODD' ? 'Odd Weeks' : h.week_cycle === 'EVEN' ? 'Even Weeks' : h.week_cycle}
                              </span>
                            )}
                          </div>
                          {h.title && (
                            <p className="text-sm font-medium text-[var(--brand-light)]/80 mb-2">{h.title}</p>
                          )}
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className={`px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${
                              isToday 
                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                : 'bg-[var(--dark-600)] text-[var(--brand-third)]'
                            }`}>
                              {h.open_time.slice(0,5)} - {h.close_time.slice(0,5)}
                            </div>
                            {restrictions.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {restrictions.map((restriction, idx) => (
                                  <span key={idx} className="bg-[var(--brand-third)]/20 text-[var(--brand-third)] border border-[var(--brand-third)]/30 text-[10px] px-2 py-0.5 rounded-full">
                                    {restriction}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {h.description && (
                        <p className="text-xs text-[var(--brand-light)]/50 italic mt-3 pt-3 border-t border-[var(--dark-500)]">
                          {h.description}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-[var(--brand-light)]/40">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="italic">No opening hours defined</p>
                </div>
              )}
            </div>
          </div>

          {/* Legal Documents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 sm:gap-6">
            {/* Terms & Conditions */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--brand-peach)]" />
                  <h3 className="text-sm font-semibold text-[var(--brand-light)]">Terms & Conditions</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="h-32 overflow-y-auto text-xs text-[var(--brand-light)]/70 bg-[var(--dark-700)]/50 p-4 rounded-xl border border-[var(--dark-500)]">
                  {club.terms_and_conditions || <span className="italic text-[var(--brand-light)]/40">None provided</span>}
                </div>
              </div>
            </div>

            {/* Club Policies */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[var(--brand-blue)]" />
                  <h3 className="text-sm font-semibold text-[var(--brand-light)]">Club Policies</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="h-32 overflow-y-auto text-xs text-[var(--brand-light)]/70 bg-[var(--dark-700)]/50 p-4 rounded-xl border border-[var(--dark-500)]">
                  {club.club_policies || <span className="italic text-[var(--brand-light)]/40">None provided</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-0 sm:space-y-6">
          
          {/* Contact Card */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
              <h2 className="text-lg font-semibold text-[var(--brand-light)]">Contact</h2>
            </div>
            <div className="p-6 space-y-3">
              {club.email && (
                <a 
                  href={`mailto:${club.email}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-[var(--brand-blue)]" />
                  </div>
                  <span className="text-sm text-[var(--brand-light)] truncate flex-1">{club.email}</span>
                  <ChevronRight className="w-4 h-4 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] transition-colors" />
                </a>
              )}
              {club.phone && (
                <a 
                  href={`tel:${club.phone}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-third)]/20 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-[var(--brand-third)]" />
                  </div>
                  <span className="text-sm text-[var(--brand-light)] flex-1">{club.phone}</span>
                  <ChevronRight className="w-4 h-4 text-[var(--brand-light)]/40 group-hover:text-[var(--brand-primary)] transition-colors" />
                </a>
              )}
              {club.address && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-peach)]/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-[var(--brand-peach)]" />
                  </div>
                  <span className="text-sm text-[var(--brand-light)]">{club.address}</span>
                </div>
              )}
              {!club.email && !club.phone && !club.address && (
                <div className="text-center py-6 text-[var(--brand-light)]/40">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="italic text-sm">No contact information</p>
                </div>
              )}
            </div>
          </div>

          {/* Map Card */}
          {(club.latitude && club.longitude && !isNaN(parseFloat(club.latitude)) && !isNaN(parseFloat(club.longitude))) && (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                <h2 className="text-lg font-semibold text-[var(--brand-light)]">Location</h2>
              </div>
              <div className="h-64 bg-[var(--dark-700)] relative">
                {(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) ? (
                  <LoadScript 
                    googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''}
                    loadingElement={
                      <div className="w-full h-full flex items-center justify-center bg-[var(--dark-700)]">
                        <div className="text-[var(--brand-light)]/50 text-sm">Loading map...</div>
                      </div>
                    }
                  >
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%', minHeight: '256px' }}
                      center={{ lat: parseFloat(club.latitude), lng: parseFloat(club.longitude) }}
                      zoom={15}
                      options={{ 
                        disableDefaultUI: true,
                        zoomControl: true,
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                        styles: [
                          { elementType: 'geometry', stylers: [{ color: '#1a1a1d' }] },
                          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1d' }] },
                          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
                          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a2d' }] },
                          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e10' }] },
                        ]
                      }}
                    >
                      <Marker position={{ lat: parseFloat(club.latitude), lng: parseFloat(club.longitude) }} />
                    </GoogleMap>
                  </LoadScript>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    <MapPin className="w-10 h-10 text-[var(--brand-light)]/30 mb-3" />
                    <p className="text-sm text-[var(--brand-light)]/50 mb-1">Map Preview Unavailable</p>
                    <p className="text-xs text-[var(--brand-light)]/30 mb-4">API key not configured</p>
                    <a 
                      href={`https://www.google.com/maps?q=${club.latitude},${club.longitude}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-4 py-2 bg-[var(--brand-primary)] text-[var(--dark-900)] text-sm font-semibold rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in Google Maps
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
