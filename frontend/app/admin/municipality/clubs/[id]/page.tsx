'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GoogleMap, Marker, LoadScript } from '@react-google-maps/api';
import api from '../../../../../lib/api';
import { getMediaUrl } from '../../../../utils';

const WEEKDAYS = [
  { id: 1, name: 'Monday' }, { id: 2, name: 'Tuesday' }, { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' }, { id: 5, name: 'Friday' }, { id: 6, name: 'Saturday' }, { id: 7, name: 'Sunday' },
];

const CYCLES = [
  { id: 'ALL', name: 'Every Week' },
  { id: 'ODD', name: 'Odd Weeks' },
  { id: 'EVEN', name: 'Even Weeks' },
];

function ClubViewPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const clubId = params?.id as string;

  const [club, setClub] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildUrlWithParams = (path: string) => {
    const urlParams = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    
    if (page && page !== '1') urlParams.set('page', page);
    if (search) urlParams.set('search', search);
    
    const queryString = urlParams.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  useEffect(() => {
    if (clubId) {
      fetchClub();
    }
  }, [clubId]);

  const fetchClub = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // The backend automatically checks if this club belongs to the municipality admin
      const res = await api.get(`/clubs/${clubId}/`);
      setClub(res.data);
    } catch (err: any) {
      setError(err?.response?.status === 404 ? 'Club not found or access denied' : 'Failed to load club');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
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
        <Link href={buildUrlWithParams("/admin/municipality/clubs")} className="text-purple-600 hover:text-purple-800">
          ← Back to Clubs
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <Link href={buildUrlWithParams("/admin/municipality/clubs")} className="text-purple-600 hover:text-purple-800 font-medium">
          ← Back to My Clubs
        </Link>
        <div className="flex gap-4">
          <button
            onClick={() => router.push(buildUrlWithParams(`/admin/municipality/clubs/edit/${club.id}`))}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow"
          >
            Edit Club
          </button>
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

          {/* CONTACT INFO */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Contact Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase">Email</p>
                <p className="font-medium">{club.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-bold uppercase">Phone</p>
                <p className="font-medium">{club.phone || '-'}</p>
              </div>
              {club.address && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 font-bold uppercase">Address</p>
                  <p className="font-medium">{club.address}</p>
                </div>
              )}
              {(club.latitude && club.longitude) && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 font-bold uppercase mb-2">Location</p>
                  <p className="text-sm text-gray-600 mb-2">Coordinates: {club.latitude}, {club.longitude}</p>
                  <a
                    href={`https://www.google.com/maps?q=${club.latitude},${club.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-800 underline text-sm mb-3 inline-block"
                  >
                    Open in Google Maps →
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* GOOGLE MAP */}
          {club.latitude && club.longitude && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Map Location</h2>
              {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-200">
                  <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={{
                        lat: parseFloat(club.latitude),
                        lng: parseFloat(club.longitude)
                      }}
                      zoom={15}
                      options={{
                        zoomControl: true,
                        streetViewControl: true,
                        mapTypeControl: true,
                        fullscreenControl: true,
                      }}
                    >
                      <Marker
                        position={{
                          lat: parseFloat(club.latitude),
                          lng: parseFloat(club.longitude)
                        }}
                        title={club.name}
                      />
                    </GoogleMap>
                  </LoadScript>
                </div>
              ) : (
                <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
                  <div className="text-center p-4">
                    <p className="text-gray-600 mb-2">Google Maps API key not configured</p>
                    <p className="text-sm text-gray-500">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file</p>
                    <a
                      href={`https://www.google.com/maps?q=${club.latitude},${club.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-800 underline text-sm mt-2 inline-block"
                    >
                      Open in Google Maps instead →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OPENING HOURS */}
          {club.regular_hours && club.regular_hours.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Opening Hours</h2>
              <div className="space-y-3">
                {club.regular_hours.map((hour: any, idx: number) => {
                  const dayName = WEEKDAYS.find(d => d.id === hour.weekday)?.name;
                  const cycleName = CYCLES.find(c => c.id === hour.week_cycle)?.name;
                  const timeStr = `${hour.open_time.substring(0,5)} - ${hour.close_time.substring(0,5)}`;
                  
                  return (
                    <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-gray-900 w-28">{dayName}</span>
                            <span className="text-xs text-gray-500 uppercase bg-gray-100 px-2 py-1 rounded">{cycleName}</span>
                            <span className="text-gray-700 font-medium">{timeStr}</span>
                          </div>
                          {hour.title && (
                            <p className="text-sm text-gray-600 italic ml-28">{hour.title}</p>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          {hour.restriction_mode !== 'NONE' && hour.min_value && hour.max_value && (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">
                              {hour.restriction_mode === 'AGE' ? 'Age' : 'Grade'} {hour.min_value}-{hour.max_value}
                            </span>
                          )}
                          {hour.gender_restriction !== 'ALL' && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold">
                              {hour.gender_restriction}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LEGAL DOCUMENTS */}
          {(club.terms_and_conditions || club.club_policies) && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Legal Documents</h2>
              <div className="space-y-4">
                {club.terms_and_conditions && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">Terms & Conditions</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{club.terms_and_conditions}</p>
                  </div>
                )}
                {club.club_policies && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">Club Policies</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{club.club_policies}</p>
                  </div>
                )}
              </div>
            </div>
          )}
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
              <button
                onClick={() => router.push(buildUrlWithParams(`/admin/municipality/clubs/edit/${club.id}`))}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-center"
              >
                Edit Club
              </button>
              <Link
                href={buildUrlWithParams("/admin/municipality/clubs")}
                className="block w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-center"
              >
                Back to List
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClubViewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <ClubViewPageContent />
    </Suspense>
  );
}