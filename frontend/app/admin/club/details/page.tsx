'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GoogleMap, Marker, LoadScript } from '@react-google-maps/api';
import { useAuth } from '../../../../context/AuthContext';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';

const WEEKDAYS = [
  { id: 1, name: 'Monday' }, { id: 2, name: 'Tuesday' }, { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' }, { id: 5, name: 'Friday' }, { id: 6, name: 'Saturday' }, { id: 7, name: 'Sunday' },
];

const CYCLES = [
  { id: 'ALL', name: 'Every Week' },
  { id: 'ODD', name: 'Odd Weeks' },
  { id: 'EVEN', name: 'Even Weeks' },
];

function ClubDetailsPageContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [club, setClub] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      fetchClub();
    }
  }, [user, authLoading]);

  const fetchClub = async () => {
    // Get club ID from user's assigned_club or preferred_club
    const clubId = (user?.assigned_club as any)?.id || 
                   (typeof user?.assigned_club === 'number' ? user.assigned_club : null) || 
                   (user?.preferred_club as any)?.id || 
                   (typeof user?.preferred_club === 'number' ? user.preferred_club : null);

    if (!clubId) {
      setError('No club assigned');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/clubs/${clubId}/`);
      setClub(res.data);
    } catch (err: any) {
      setError(err?.response?.status === 404 ? 'Club not found' : 'Failed to load club');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Loading club details...</p>
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error || 'Club not found'}</p>
        </div>
        <Link href="/admin/club" className="text-blue-600 hover:text-blue-800">
          ← Back to Overview
        </Link>
      </div>
    );
  }

  const today = new Date().getDay() || 7; // Convert Sunday (0) to 7
  const todayHours = club.regular_hours?.filter((h: any) => h.weekday === today) || [];

  return (
    <div className="p-8">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/admin/club" className="text-blue-600 hover:text-blue-800 font-medium">
          ← Back to Overview
        </Link>
        <div className="flex gap-4">
          <Link 
            href="/admin/club/followers" 
            className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm font-medium"
          >
            View Followers
          </Link>
          <Link
            href="/admin/club/settings"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow"
          >
            Edit Club
          </Link>
        </div>
      </div>

      {/* CLUB HEADER */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="relative">
          {club.hero_image && (
            <img
              src={getMediaUrl(club.hero_image) || ''}
              alt={club.name}
              className="w-full h-64 object-cover"
              onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
            />
          )}
          <div className={`p-8 ${club.hero_image ? 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent' : ''}`}>
            <div className="flex items-end gap-6">
              {club.avatar && (
                <img
                  src={getMediaUrl(club.avatar) || ''}
                  alt={club.name}
                  className={`w-24 h-24 rounded-full object-cover border-4 ${club.hero_image ? 'border-white' : 'border-gray-200'}`}
                  onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                />
              )}
              <div className={club.hero_image ? 'text-white' : ''}>
                <h1 className="text-4xl font-bold mb-2">{club.name}</h1>
                <p className="text-lg opacity-90">{club.municipality_name}</p>
                {club.address && (
                  <p className="text-sm opacity-80 mt-2">📍 {club.address}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN CONTENT */}
        <div className="lg:col-span-2 space-y-6">
          {/* DESCRIPTION */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">About</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{club.description || 'No description provided.'}</p>
          </div>

          {/* OPENING HOURS */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Opening Hours</h2>
              <Link
                href="/admin/club/opening-hours"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm text-sm font-medium"
              >
                Edit Hours
              </Link>
            </div>
            {club.regular_hours && club.regular_hours.length > 0 ? (
              <div className="space-y-3">
                {WEEKDAYS.map((day) => {
                  const hours = club.regular_hours.filter((h: any) => h.weekday === day.id);
                  if (hours.length === 0) return null;
                  
                  const isToday = day.id === today;
                  
                  return (
                    <div
                      key={day.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${isToday ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                          {day.name}
                          {isToday && <span className="ml-2 text-xs">(Today)</span>}
                        </span>
                      </div>
                      <div className="text-right">
                        {hours.map((h: any, idx: number) => (
                          <div key={idx} className="text-sm">
                            <span className="font-medium">{h.open_time?.slice(0, 5)} - {h.close_time?.slice(0, 5)}</span>
                            {h.week_cycle !== 'ALL' && (
                              <span className="text-gray-500 ml-2">({CYCLES.find(c => c.id === h.week_cycle)?.name})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">No opening hours set yet.</p>
                <Link
                  href="/admin/club/opening-hours"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm text-sm font-medium"
                >
                  Add Opening Hours
                </Link>
              </div>
            )}
          </div>

          {/* POLICIES */}
          {(club.club_policies || club.terms_and_conditions) && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Policies & Terms</h2>
              {club.club_policies && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Club Policies</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{club.club_policies}</p>
                </div>
              )}
              {club.terms_and_conditions && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Terms & Conditions</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{club.terms_and_conditions}</p>
                </div>
              )}
            </div>
          )}

          {/* CONTACT */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Contact</h2>
            <div className="space-y-3">
              {club.email && (
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">📧</span>
                  <a href={`mailto:${club.email}`} className="text-blue-600 hover:text-blue-800">
                    {club.email}
                  </a>
                </div>
              )}
              {club.phone && (
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">📞</span>
                  <a href={`tel:${club.phone}`} className="text-blue-600 hover:text-blue-800">
                    {club.phone}
                  </a>
                </div>
              )}
              {club.address && (
                <div className="flex items-start gap-3">
                  <span className="text-gray-500">📍</span>
                  <span className="text-gray-700">{club.address}</span>
                </div>
              )}
            </div>
            
            {/* MAP */}
            {club.latitude && club.longitude && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Location</h3>
                <div className="h-64 rounded-lg overflow-hidden">
                  <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={{ lat: club.latitude, lng: club.longitude }}
                      zoom={15}
                    >
                      <Marker position={{ lat: club.latitude, lng: club.longitude }} />
                    </GoogleMap>
                  </LoadScript>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          {/* QUICK INFO */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Info</h3>
            <div className="space-y-3">
              {club.club_categories && (
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Categories</p>
                  <p className="text-sm font-medium">{club.club_categories}</p>
                </div>
              )}
              {club.allowed_age_groups && (
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Age Groups</p>
                  <p className="text-sm font-medium">{club.allowed_age_groups}</p>
                </div>
              )}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Actions</h3>
            <div className="space-y-2">
              <Link
                href="/admin/club/followers"
                className="block w-full bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 text-center font-medium"
              >
                View Followers
              </Link>
              <Link
                href="/admin/club/settings"
                className="block w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center"
              >
                Edit Club
              </Link>
              <Link
                href="/admin/club/opening-hours"
                className="block w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-center"
              >
                Manage Opening Hours
              </Link>
              <Link
                href="/admin/club"
                className="block w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-center"
              >
                Back to Overview
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClubDetailsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <ClubDetailsPageContent />
    </Suspense>
  );
}

