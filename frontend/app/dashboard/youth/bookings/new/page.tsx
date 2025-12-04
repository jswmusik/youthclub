'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../../../../lib/api';
import BookingResourceCard from '../../../../components/bookings/youth/BookingResourceCard';
import { ArrowLeft } from 'lucide-react';

export default function BrowseResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'CLUB' | 'ALL'>('CLUB'); // Simple client-side filter for now

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      // The backend viewset filters 'is_active=True' automatically for youth.
      // We fetch all available to this user and filter client-side for the Tabs
      const res = await api.get('/bookings/resources/');
      setResources(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic:
  // "My Club" = resources where scope is CLUB (backend ensures we only see our own club's CLUB-scoped items)
  // "Municipality" = resources where scope is MUNICIPALITY or GLOBAL
  const displayedResources = resources.filter(res => {
    if (filter === 'CLUB') return res.allowed_user_scope === 'CLUB';
    return res.allowed_user_scope !== 'CLUB'; 
  });

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/youth/bookings" className="p-2 -ml-2 text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-black text-gray-900">New Booking</h1>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 rounded-xl">
        <button 
          onClick={() => setFilter('CLUB')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${filter === 'CLUB' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
        >
          My Club
        </button>
        <button 
          onClick={() => setFilter('ALL')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${filter === 'ALL' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
        >
          Other Places
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading resources...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {displayedResources.map(res => (
            <BookingResourceCard key={res.id} resource={res} />
          ))}
          {displayedResources.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              No bookable resources found here.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

