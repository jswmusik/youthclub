'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GoogleMap, Marker, LoadScript } from '@react-google-maps/api';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

interface ClubDetailProps {
  clubId: string;
  basePath: string;
}

const WEEKDAYS = [
    { id: 1, name: 'Monday' }, { id: 2, name: 'Tuesday' }, { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' }, { id: 5, name: 'Friday' }, { id: 6, name: 'Saturday' }, { id: 7, name: 'Sunday' },
];

export default function ClubDetailView({ clubId, basePath }: ClubDetailProps) {
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
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const municipality = searchParams.get('municipality');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (municipality) params.set('municipality', municipality);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!club) return <div className="p-12 text-center text-red-500">Club not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Link href={buildUrlWithParams(basePath)} className="text-gray-500 hover:text-gray-900 font-bold">← Back to List</Link>
        <Link href={buildUrlWithParams(`${basePath}/edit/${club.id}`)} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">
          Edit Club
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Banner */}
        <div className="relative h-64 bg-gray-200">
            {club.hero_image ? (
                <img src={getMediaUrl(club.hero_image) || ''} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">No Hero Image</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            
            <div className="absolute bottom-6 left-8 flex items-end gap-6">
                {club.avatar ? (
                    <img src={getMediaUrl(club.avatar) || ''} className="w-24 h-24 rounded-xl object-cover bg-white border-4 border-white shadow-md" />
                ) : (
                    <div className="w-24 h-24 rounded-xl bg-white border-4 border-white flex items-center justify-center font-bold text-gray-400">No Logo</div>
                )}
                <div className="text-white pb-2">
                    <h1 className="text-4xl font-bold text-shadow">{club.name}</h1>
                    <p className="opacity-90">{club.municipality_name}</p>
                </div>
            </div>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Col */}
            <div className="lg:col-span-2 space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">About</h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{club.description || 'No description.'}</p>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Opening Hours</h3>
                    <div className="space-y-2">
                        {club.regular_hours && club.regular_hours.length > 0 ? (
                            club.regular_hours.map((h: any, i: number) => {
                                const day = WEEKDAYS.find(d => d.id === h.weekday)?.name;
                                return (
                                    <div key={i} className="flex justify-between border-b pb-2 last:border-b-0">
                                        <span className="font-medium text-gray-700 w-32">{day}</span>
                                        <span className="text-gray-600">{h.open_time.slice(0,5)} - {h.close_time.slice(0,5)}</span>
                                        {h.week_cycle !== 'ALL' && <span className="text-xs bg-gray-100 px-2 rounded ml-2 self-center">{h.week_cycle}</span>}
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-gray-500 italic">No opening hours defined.</p>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Legal</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded text-sm h-32 overflow-y-auto">
                            <p className="font-bold mb-1">Terms:</p>
                            {club.terms_and_conditions || 'None'}
                        </div>
                        <div className="bg-gray-50 p-4 rounded text-sm h-32 overflow-y-auto">
                            <p className="font-bold mb-1">Policies:</p>
                            {club.club_policies || 'None'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Col */}
            <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Contact Info</h3>
                    <div className="space-y-3 text-sm">
                        <div><span className="block font-bold text-gray-700">Email</span><span className="text-blue-600">{club.email}</span></div>
                        <div><span className="block font-bold text-gray-700">Phone</span><span className="text-gray-600">{club.phone}</span></div>
                        <div><span className="block font-bold text-gray-700">Address</span><span className="text-gray-600">{club.address || '-'}</span></div>
                        <div><span className="block font-bold text-gray-700">Categories</span><span className="text-gray-600">{club.club_categories || '-'}</span></div>
                    </div>
                </div>

                {/* Map */}
                {(club.latitude && club.longitude) && (
                    <div className="h-64 rounded-xl overflow-hidden border border-gray-200">
                        {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                            <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
                                <GoogleMap
                                    mapContainerStyle={{ width: '100%', height: '100%' }}
                                    center={{ lat: parseFloat(club.latitude), lng: parseFloat(club.longitude) }}
                                    zoom={15}
                                >
                                    <Marker position={{ lat: parseFloat(club.latitude), lng: parseFloat(club.longitude) }} />
                                </GoogleMap>
                            </LoadScript>
                        ) : (
                            <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-4 text-center">
                                <p className="text-sm text-gray-500 mb-2">Map Unavailable (No API Key)</p>
                                <a 
                                    href={`https://www.google.com/maps?q=${club.latitude},${club.longitude}`} 
                                    target="_blank" 
                                    className="text-blue-600 underline text-sm"
                                >
                                    Open in Google Maps
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>

        </div>
      </div>
    </div>
  );
}