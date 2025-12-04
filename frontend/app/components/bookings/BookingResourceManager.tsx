'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';
import { getMediaUrl } from '../../utils';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import { Calendar, Clock, Edit, Trash2 } from 'lucide-react';

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

  // Determine the bookings dashboard and calendar paths based on basePath
  const bookingsPath = basePath.replace('/resources', '');
  const calendarPath = `${bookingsPath}/calendar`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Resources</h1>
        <div className="flex gap-3">
          <Link href={bookingsPath} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50">
            Bookings Dashboard
          </Link>
          <Link href={calendarPath} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Calendar
          </Link>
          <Link href={`${basePath}/create`} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700">
            + New Resource
          </Link>
        </div>
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

      {/* Table List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading resources...</div>
        ) : resources.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-2">No resources found.</p>
            <Link href={`${basePath}/create`} className="text-blue-600 hover:underline font-bold">
              Create your first resource
            </Link>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                {scope !== 'CLUB' && (
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Club</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {resources.map(res => {
                const imageUrl = res.image ? getMediaUrl(res.image) : null;
                return (
                  <tr key={res.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={res.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400">
                            <span className="text-xl">📦</span>
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-gray-900">{res.name}</div>
                          <div className="text-xs text-gray-500">
                            Max {res.max_participants} {res.max_participants === 1 ? 'person' : 'people'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {res.resource_type}
                      </span>
                    </td>
                    {scope !== 'CLUB' && (
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{res.club_name || '-'}</span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        res.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {res.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 line-clamp-2 max-w-md">
                        {res.description || <span className="text-gray-400 italic">No description</span>}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`${basePath}/${res.id}/schedule`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-900 transition-colors"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Schedule
                        </Link>
                        <Link 
                          href={`${basePath}/edit/${res.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-900 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </Link>
                        <button 
                          onClick={() => setItemToDelete(res)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-md hover:bg-red-100 hover:text-red-900 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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