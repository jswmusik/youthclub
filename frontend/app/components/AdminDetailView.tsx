'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

interface AdminDetailProps {
  userId: string;
  basePath: string;
}

interface Option { id: number; name: string; }

export default function AdminDetailView({ userId, basePath }: AdminDetailProps) {
  const searchParams = useSearchParams();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [municipalities, setMunicipalities] = useState<Option[]>([]);
  const [clubs, setClubs] = useState<Option[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [adminRes, muniRes, clubRes] = await Promise.all([
          api.get(`/users/${userId}/`),
          api.get('/municipalities/'),
          api.get('/clubs/?page_size=1000')
        ]);
        
        setAdmin(adminRes.data);
        setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
        setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userId]);

  const getInitials = (first?: string | null, last?: string | null) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || '?';
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const municipality = searchParams.get('assigned_municipality');
    const club = searchParams.get('assigned_club');
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    if (municipality) params.set('assigned_municipality', municipality);
    if (club) params.set('assigned_club', club);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!admin) return <div className="p-12 text-center text-red-500">Admin not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Link href={buildUrlWithParams(basePath)} className="text-gray-500 hover:text-gray-900 font-bold">← Back to List</Link>
        <Link href={buildUrlWithParams(`${basePath}/edit/${admin.id}`)} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">
          Edit Admin
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-6 mb-8 border-b pb-8">
          {admin.avatar ? (
            <img src={getMediaUrl(admin.avatar) || ''} className="w-24 h-24 rounded-full object-cover border-4 border-gray-100" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-500">
              {getInitials(admin.first_name, admin.last_name)}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{admin.first_name} {admin.last_name}</h1>
            <p className="text-gray-500">{admin.email}</p>
            <span className="inline-block mt-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
              {admin.role.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Phone</label>
            <p className="text-gray-900 font-medium">{admin.phone_number || '-'}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Gender</label>
            <p className="text-gray-900 font-medium">{admin.legal_gender}</p>
          </div>
          
          {admin.role === 'CLUB_ADMIN' && admin.nickname && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase">Nickname</label>
              <p className="text-gray-900 font-medium">{admin.nickname}</p>
            </div>
          )}
          
          {admin.role === 'CLUB_ADMIN' && admin.profession && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase">Profession</label>
              <p className="text-gray-900 font-medium">{admin.profession}</p>
            </div>
          )}
          
          {admin.assigned_municipality && (
             <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase">Municipality</label>
                <p className="text-gray-900 font-medium">
                  {(() => {
                    const muniId = typeof admin.assigned_municipality === 'object' 
                      ? admin.assigned_municipality.id 
                      : admin.assigned_municipality;
                    const municipality = municipalities.find(m => m.id === muniId);
                    return municipality?.name || `Municipality (ID: ${muniId})`;
                  })()}
                </p>
             </div>
          )}
          {admin.assigned_club && (
             <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase">Club</label>
                <p className="text-gray-900 font-medium">
                  {(() => {
                    const clubId = typeof admin.assigned_club === 'object' 
                      ? admin.assigned_club.id 
                      : admin.assigned_club;
                    const club = clubs.find(c => c.id === clubId);
                    return club?.name || `Club (ID: ${clubId})`;
                  })()}
                </p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}