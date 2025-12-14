'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GoogleMap, Marker, LoadScript } from '@react-google-maps/api';
import { ArrowLeft, Edit, MapPin, Mail, Phone, Clock, FileText, Globe, Users, LogIn } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

// UI
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

  // Use custom paths if provided, otherwise use default pattern
  // If path is explicitly null, hide the button; if undefined, use default
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
  
  // Determine which buttons to show (show if path is not explicitly null)
  const showVisits = visitsPath !== null;
  const showFollowers = followersPath !== null;
  const showEdit = editPath !== null;

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400 animate-pulse">Loading details...</div>
    );
  }

  if (!club) {
    return (
      <div className="py-20 text-center text-red-600">Club not found.</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link href={buildUrlWithParams(basePath)}>
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2">
          {showVisits && (
            <Link href={getVisitsPath()}>
              <Button variant="outline" size="sm" className="gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                <LogIn className="h-4 w-4" /> View Visitors
              </Button>
            </Link>
          )}
          {showFollowers && (
            <Link href={getFollowersPath()}>
              <Button variant="outline" size="sm" className="gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                <Users className="h-4 w-4" /> View Followers
              </Button>
            </Link>
          )}
          {showEdit && (
            <Link href={getEditPath()}>
              <Button size="sm" className="gap-2 bg-[#4D4DA4] hover:bg-[#4D4DA4]/90 text-white shadow-sm">
                <Edit className="h-4 w-4" /> Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Hero Card */}
      <div className="relative rounded-2xl overflow-hidden bg-[#121213] text-white shadow-md">
        {/* Background Image Layer */}
        <div className="absolute inset-0 opacity-40">
          {club.hero_image && (
            <img src={getMediaUrl(club.hero_image) || ''} className="w-full h-full object-cover" alt="Hero" />
          )}
        </div>
        <div className="relative p-6 sm:p-10 flex flex-col sm:flex-row items-center sm:items-end gap-6">
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl border-4 border-[#121213] shadow-xl bg-white flex-shrink-0">
            <AvatarImage src={getMediaUrl(club.avatar) || undefined} className="object-cover" />
            <AvatarFallback className="text-4xl font-bold text-[#4D4DA4]">C</AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left flex-1 space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{club.name}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm">
                {club.municipality_name}
              </Badge>
              {club.club_categories && (
                <Badge variant="outline" className="text-gray-300 border-white/20">
                  {club.club_categories}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-1 h-6 bg-[#FF5485] rounded-full"></div>
                About
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap bg-white/60 p-5 rounded-xl border border-[#EBEBFE]">
                {club.description || <span className="italic text-gray-400">No description provided.</span>}
              </div>
            </CardContent>
          </Card>

          {/* Opening Hours */}
          <Card className="border-2 border-[#4D4DA4]/30 bg-gradient-to-br from-[#EBEBFE]/40 via-white to-[#EBEBFE]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#4D4DA4]/10 to-[#FF5485]/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <CardHeader className="flex flex-row items-center gap-3 pb-4 relative z-10">
              <div className="p-2.5 rounded-xl bg-[#4D4DA4]">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">Opening Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 relative z-10">
              {club.regular_hours && club.regular_hours.length > 0 ? (
                club.regular_hours.map((h: any, i: number) => {
                  const day = WEEKDAYS.find(d => d.id === h.weekday)?.name;
                  const today = new Date();
                  const todayWeekday = today.getDay() === 0 ? 7 : today.getDay();
                  const isToday = h.weekday === todayWeekday;
                  
                  // Build restriction labels
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
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        isToday 
                          ? 'bg-gradient-to-r from-[#4D4DA4]/10 to-[#FF5485]/10 border-[#4D4DA4]/50' 
                          : 'bg-white/70 border-[#EBEBFE] hover:border-[#4D4DA4]/30 hover:bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`font-bold text-sm ${isToday ? 'text-[#4D4DA4]' : 'text-gray-900'}`}>
                              {day}
                            </span>
                            {isToday && (
                              <Badge className="bg-[#4D4DA4] text-white border-0 text-[10px] px-2 py-0.5 font-semibold">
                                Today
                              </Badge>
                            )}
                            {h.week_cycle !== 'ALL' && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-[#4D4DA4]/30 text-[#4D4DA4] bg-[#EBEBFE]/50">
                                {h.week_cycle === 'ODD' ? 'Odd Weeks' : h.week_cycle === 'EVEN' ? 'Even Weeks' : h.week_cycle}
                              </Badge>
                            )}
                          </div>
                          {h.title && (
                            <p className="text-sm font-semibold text-gray-800 mb-2">{h.title}</p>
                          )}
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className={`px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${
                              isToday 
                                ? 'bg-[#4D4DA4] text-white' 
                                : 'bg-[#EBEBFE] text-[#4D4DA4]'
                            }`}>
                              {h.open_time.slice(0,5)} - {h.close_time.slice(0,5)}
                            </div>
                            {restrictions.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {restrictions.map((restriction, idx) => (
                                  <Badge key={idx} variant="outline" className="text-[10px] px-2 py-0.5 bg-yellow-50 text-yellow-700 border-yellow-300 font-medium">
                                    {restriction}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {h.description && (
                        <p className="text-xs text-gray-600 italic mt-2 pt-2 border-t border-gray-200">{h.description}</p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 italic text-center py-4">No opening hours defined.</p>
              )}
            </CardContent>
          </Card>

          {/* Legal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#4D4DA4]" />
                  Terms & Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32 overflow-y-auto text-xs text-gray-700 bg-white/60 p-4 rounded-xl border border-[#EBEBFE]">
                  {club.terms_and_conditions || <span className="italic text-gray-400">None</span>}
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#4D4DA4]" />
                  Club Policies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32 overflow-y-auto text-xs text-gray-700 bg-white/60 p-4 rounded-xl border border-[#EBEBFE]">
                  {club.club_policies || <span className="italic text-gray-400">None</span>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card className="border-2 border-gray-100 bg-gradient-to-br from-white to-[#EBEBFE]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-1 h-6 bg-[#FF5485] rounded-full"></div>
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {club.email && (
                <div className="flex items-center gap-3 text-sm p-3 rounded-xl bg-white/60 border border-[#EBEBFE] hover:border-[#4D4DA4]/30 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-[#4D4DA4] flex items-center justify-center text-white flex-shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="truncate text-gray-700 font-medium">{club.email}</span>
                </div>
              )}
              {club.phone && (
                <div className="flex items-center gap-3 text-sm p-3 rounded-xl bg-white/60 border border-[#EBEBFE] hover:border-[#4D4DA4]/30 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-[#4D4DA4] flex items-center justify-center text-white flex-shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span className="text-gray-700 font-medium">{club.phone}</span>
                </div>
              )}
              {club.address && (
                <div className="flex items-center gap-3 text-sm p-3 rounded-xl bg-white/60 border border-[#EBEBFE] hover:border-[#4D4DA4]/30 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-[#4D4DA4] flex items-center justify-center text-white flex-shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span className="text-gray-700 font-medium">{club.address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Map Card */}
          {(club.latitude && club.longitude && !isNaN(parseFloat(club.latitude)) && !isNaN(parseFloat(club.longitude))) && (
            <Card className="border-2 border-gray-100 overflow-hidden bg-gradient-to-br from-white to-[#EBEBFE]/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-1 h-6 bg-[#FF5485] rounded-full"></div>
                  Location
                </CardTitle>
              </CardHeader>
              <div className="h-64 bg-gray-100 relative w-full">
                {(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) ? (
                  <LoadScript 
                    googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''}
                    loadingElement={
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <div className="text-gray-500 text-sm">Loading map...</div>
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
                        fullscreenControl: false
                      }}
                    >
                      <Marker position={{ lat: parseFloat(club.latitude), lng: parseFloat(club.longitude) }} />
                    </GoogleMap>
                  </LoadScript>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    <MapPin className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-xs text-gray-500">Map Preview Unavailable</p>
                    <p className="text-xs text-gray-400 mb-2">API key not configured</p>
                    <a 
                      href={`https://www.google.com/maps?q=${club.latitude},${club.longitude}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[#4D4DA4] hover:underline text-xs mt-1"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
