'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import BookingDetailModal from './BookingDetailModal';

// Accept scope prop
export default function BookingRequestList({ scope }: { scope?: 'CLUB' | 'MUNICIPALITY' | 'SUPER' }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  
  // Filter State
  const [clubs, setClubs] = useState<any[]>([]);
  const [selectedClub, setSelectedClub] = useState('');

  // Fetch clubs only if needed
  useEffect(() => {
    if (scope === 'MUNICIPALITY' || scope === 'SUPER') {
      api.get('/clubs/?page_size=100').then(res => {
        setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
      });
    }
  }, [scope]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let url = '/bookings/bookings/?status=PENDING';
      if (selectedClub) url += `&club=${selectedClub}`;
      
      const res = await api.get(url);
      setRequests(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when filter changes
  useEffect(() => {
    fetchRequests();
  }, [selectedClub]);

  if (loading && requests.length === 0) return <div className="p-4 text-gray-400">Loading requests...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-4 justify-between items-center">
        <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-800">Pending Requests</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
            {requests.length}
            </span>
        </div>

        {/* Club Filter for High-Level Admins */}
        {(scope === 'MUNICIPALITY' || scope === 'SUPER') && (
            <select 
                className="text-sm border rounded p-1.5 min-w-[150px]"
                value={selectedClub}
                onChange={e => setSelectedClub(e.target.value)}
            >
                <option value="">All Clubs</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
        )}
      </div>
      
      <div className="divide-y divide-gray-100">
        {requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No pending requests 🎉</div>
        ) : (
          requests.map((req: any) => (
            <div 
              key={req.id} 
              onClick={() => setSelectedBooking(req)}
              className="p-4 hover:bg-blue-50 cursor-pointer transition-colors flex justify-between items-center group"
            >
              <div>
                <div className="font-bold text-gray-900">
                  {req.user_detail?.first_name} {req.user_detail?.last_name}
                </div>
                <div className="text-sm text-gray-600">
                  wants to book <span className="font-semibold text-blue-600">{req.resource_name}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Requested {formatDistanceToNow(new Date(req.created_at))} ago
                  {/* Show Club Name if dealing with multiple clubs */}
                  {scope !== 'CLUB' && req.club_name && (
                      <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-medium">
                          {req.club_name}
                      </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                 <button className="text-sm border border-gray-200 px-3 py-1 rounded bg-white font-medium text-gray-600 group-hover:border-blue-300 group-hover:text-blue-600">
                    Review
                 </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedBooking && (
        <BookingDetailModal 
          booking={selectedBooking} 
          onClose={() => setSelectedBooking(null)}
          onUpdate={fetchRequests}
        />
      )}
    </div>
  );
}

