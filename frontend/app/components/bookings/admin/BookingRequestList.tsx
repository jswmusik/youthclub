'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import BookingDetailModal from './BookingDetailModal';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';

// Accept scope prop
export default function BookingRequestList({ scope }: { scope?: 'CLUB' | 'MUNICIPALITY' | 'SUPER' }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  
  // Filter State
  const [clubs, setClubs] = useState<any[]>([]);
  const [selectedClub, setSelectedClub] = useState('');
  const [resources, setResources] = useState<any[]>([]);
  const [selectedResource, setSelectedResource] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Fetch clubs and resources
  useEffect(() => {
    if (scope === 'MUNICIPALITY' || scope === 'SUPER') {
      api.get('/clubs/?page_size=100').then(res => {
        setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
      });
    }
    
    // Fetch resources for filter
    api.get('/bookings/resources/?page_size=100').then(res => {
      setResources(Array.isArray(res.data) ? res.data : res.data.results || []);
    }).catch(err => console.error('Failed to load resources', err));
  }, [scope]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('status', 'PENDING');
      params.set('page', currentPage.toString());
      params.set('page_size', pageSize.toString());
      
      if (selectedClub) params.set('club', selectedClub);
      if (selectedResource) params.set('resource', selectedResource);
      
      const res = await api.get(`/bookings/bookings/?${params.toString()}`);
      const data = res.data;
      
      setRequests(Array.isArray(data) ? data : data.results || []);
      
      // Update pagination info
      if (data.count !== undefined) {
        setTotalCount(data.count);
        setTotalPages(Math.ceil(data.count / pageSize));
      } else {
        // If no pagination info, assume all results fit on one page
        const results = Array.isArray(data) ? data : data.results || [];
        setTotalCount(results.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error(err);
      setRequests([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when filters or page changes
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [selectedClub, selectedResource]);

  useEffect(() => {
    fetchRequests();
  }, [currentPage, selectedClub, selectedResource]);

  const getParticipantCount = (participants: any[]) => {
    if (!participants || participants.length === 0) return 1; // Just the user themselves
    return participants.length + 1; // User + participants
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">Pending Requests</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
              {totalCount}
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Resource Filter */}
            <select 
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedResource}
              onChange={e => setSelectedResource(e.target.value)}
            >
              <option value="">All Resources</option>
              {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>

            {/* Club Filter for High-Level Admins */}
            {(scope === 'MUNICIPALITY' || scope === 'SUPER') && (
              <select 
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 min-w-[150px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedClub}
                onChange={e => setSelectedClub(e.target.value)}
              >
                <option value="">All Clubs</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading && requests.length === 0 ? (
        <div className="p-8 text-center text-gray-400">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No pending requests 🎉</div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Resource</th>
              {scope !== 'CLUB' && (
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Club</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Guests</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Requested</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((req: any) => {
              const startDate = new Date(req.start_time);
              const endDate = new Date(req.end_time);
              const participantCount = getParticipantCount(req.participants || []);
              
              return (
                <tr 
                  key={req.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedBooking(req)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {req.user_detail?.first_name} {req.user_detail?.last_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {req.user_detail?.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{req.resource_name}</div>
                  </td>
                  {scope !== 'CLUB' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {req.club_name ? (
                        <span className="text-sm text-gray-900">{req.club_name}</span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{format(startDate, 'MMM d, yyyy')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-sm text-gray-900">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>{participantCount}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(req.created_at))} ago
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBooking(req);
                      }}
                      className="text-blue-600 hover:text-blue-900 font-semibold"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button 
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                {' '}(Total: {totalCount})
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {/* Page Numbers */}
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold 
                        ${pageNum === currentPage 
                          ? 'bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' 
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

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

