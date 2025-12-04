'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';
import { getMediaUrl } from '../../utils';
import DeleteConfirmationModal from '../DeleteConfirmationModal';

interface BookingResourceManagerProps {
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB'; // Added Scope
}

export default function BookingResourceManager({ basePath, scope }: BookingResourceManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [resources, setResources] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]); // For Filter
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    fetchResources();
  }, [searchParams]);

  const fetchDropdowns = async () => {
    if (scope === 'CLUB') return; // Club admins don't need to filter clubs
    try {
        // API automatically filters clubs based on user role (Muni Admin gets their muni's clubs)
        const res = await api.get('/clubs/?page_size=100'); 
        setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
        console.error(err);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      const res = await api.get(`/bookings/resources/?${params.toString()}`);
      setResources(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/bookings/resources/${itemToDelete.id}/`);
      fetchResources();
      setItemToDelete(null);
    } catch (err) {
      alert('Failed to delete resource');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Resources</h1>
        <Link href={`${basePath}/create`} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700">
          + New Resource
        </Link>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-4">
        <input 
          type="text" 
          placeholder="Search resources..." 
          className="border rounded p-2 text-sm flex-1 min-w-[200px]"
          onChange={e => updateUrl('search', e.target.value)}
        />
        
        {/* Scope-based Club Filter */}
        {(scope === 'MUNICIPALITY' || scope === 'SUPER') && (
            <select 
                className="border rounded p-2 text-sm w-48"
                onChange={e => updateUrl('club', e.target.value)}
                value={searchParams.get('club') || ''}
            >
                <option value="">All Clubs</option>
                {clubs.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
        )}

        <select 
          className="border rounded p-2 text-sm w-40"
          onChange={e => updateUrl('resource_type', e.target.value)}
        >
          <option value="">All Types</option>
          <option value="ROOM">Rooms</option>
          <option value="EQUIPMENT">Equipment</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map(res => (
          <div key={res.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="h-40 bg-gray-100 relative">
              {(() => {
                const imageUrl = res.image ? getMediaUrl(res.image) : null;
                return imageUrl ? (
                  <img src={imageUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-4xl">📦</span>
                  </div>
                );
              })()}
              <span className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded ${res.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {res.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{res.name}</h3>
                    {/* Show Club Name if not in Club Scope */}
                    {scope !== 'CLUB' && (
                        <p className="text-xs text-gray-500 font-medium">{res.club_name}</p>
                    )}
                </div>
                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">{res.resource_type}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{res.description}</p>
              
              <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                <Link href={`${basePath}/${res.id}/schedule`} className="text-blue-600 text-sm font-bold hover:underline">
                  Schedule
                </Link>
                <div className="flex gap-2">
                  <Link href={`${basePath}/edit/${res.id}`} className="p-2 text-gray-500 hover:text-blue-600">✏️</Link>
                  <button onClick={() => setItemToDelete(res)} className="p-2 text-gray-500 hover:text-red-600">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <DeleteConfirmationModal 
        isVisible={!!itemToDelete} 
        onClose={() => setItemToDelete(null)} 
        onConfirm={handleDelete} 
        itemName={itemToDelete?.name} 
      />
    </div>
  );
}