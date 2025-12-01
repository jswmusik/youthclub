'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { visits } from '@/lib/api';
import Toast from '@/app/components/Toast';
import Link from 'next/link';

export default function VisitHistoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'error',
    isVisible: false,
  });

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params: { search?: string; start_date?: string; end_date?: string } = {};
      const search = searchParams.get('search') || '';
      const startDate = searchParams.get('start_date') || '';
      const endDate = searchParams.get('end_date') || '';
      
      if (search && search.trim()) params.search = search.trim();
      if (startDate && startDate.trim()) params.start_date = startDate.trim();
      if (endDate && endDate.trim()) params.end_date = endDate.trim();
      
      const res = await visits.getHistory(params);
      setData(res.data.results || res.data || []);
      setToast({ message: '', type: 'error', isVisible: false });
    } catch (error: any) {
      setToast({ 
        message: error.response?.data?.error || "Failed to load history", 
        type: 'error', 
        isVisible: true 
      });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [searchParams]); // Fetch when URL params change

  return (
    <>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Visits & Attendance</h1>
            <p className="text-slate-500">Manage check-ins for your club</p>
          </div>
          
          <div className="flex space-x-3">
            {/* Button to open the Kiosk in a new tab */}
            <Link 
              href="/admin/club/visits/kiosk" 
              target="_blank"
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center shadow-sm"
            >
              Launch Kiosk Screen ↗
            </Link>
            
            {/* Button for Manual Entry */}
            <Link
              href="/admin/club/visits"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
            >
              + Manual Check-in
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-6">
          <nav className="flex space-x-8">
            <Link 
              href="/admin/club/visits"
              className="border-b-2 border-transparent pb-4 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300"
            >
              Live Attendance
            </Link>
            <button className="border-b-2 border-emerald-500 pb-4 px-1 text-sm font-medium text-emerald-600">
              History Log
            </button>
            <Link 
              href="/admin/club/visits/analytics"
              className="border-b-2 border-transparent pb-4 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300"
            >
              Analytics
            </Link>
          </nav>
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          {/* Toggle Button */}
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700">Filters</span>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Filter Fields - Collapsible */}
          <div 
            className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${
              filtersExpanded 
                ? 'max-h-[1000px] opacity-100' 
                : 'max-h-0 opacity-0'
            } overflow-hidden`}
          >
            <div className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
                  <input 
                    type="text" 
                    placeholder="Search by name or email..." 
                    className="w-full border rounded p-2 text-sm bg-gray-50"
                    value={searchParams.get('search') || ''} 
                    onChange={e => updateUrl('search', e.target.value)}
                  />
                </div>

                {/* Start Date */}
                <div className="w-48">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    className="w-full border rounded p-2 text-sm bg-gray-50"
                    value={searchParams.get('start_date') || ''}
                    onChange={e => updateUrl('start_date', e.target.value)}
                  />
                </div>

                {/* End Date */}
                <div className="w-48">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    className="w-full border rounded p-2 text-sm bg-gray-50"
                    value={searchParams.get('end_date') || ''}
                    onChange={e => updateUrl('end_date', e.target.value)}
                  />
                </div>

                {/* Clear Filters */}
                <button
                  onClick={() => router.push(pathname)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-red-500 font-medium"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="p-4">Member</th>
                <th className="p-4">Date</th>
                <th className="p-4">In / Out</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading records...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No records found matching your filters.</td></tr>
              ) : (
                data.map((visit: any) => {
                  const start = new Date(visit.check_in_at);
                  const checkOutAt = visit.check_out_at;
                  // Check if user has checked out (check_out_at exists and is not null/empty)
                  const hasCheckedOut = checkOutAt !== null && checkOutAt !== undefined && checkOutAt !== '';
                  
                  let duration: number | null = null;
                  let end: Date | null = null;
                  
                  if (hasCheckedOut) {
                    try {
                      end = new Date(checkOutAt);
                      // Validate the date is valid
                      if (!isNaN(end.getTime())) {
                        const diffMs = end.getTime() - start.getTime();
                        duration = Math.max(0, Math.round(diffMs / 60000)); // Convert to minutes, ensure non-negative
                      }
                    } catch (e) {
                      console.error('Error parsing check_out_at date:', e);
                    }
                  }

                  return (
                    <tr key={visit.id} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-900">
                        {visit.user_details?.first_name} {visit.user_details?.last_name}
                      </td>
                      <td className="p-4 text-slate-500">
                        {start.toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="text-emerald-700">IN: {start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                        {end && !isNaN(end.getTime()) && (
                          <div className="text-slate-500">OUT: {end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                        )}
                      </td>
                      <td className="p-4 text-slate-600">
                        {duration !== null ? (
                          `${Math.floor(duration/60)}h ${duration%60}m`
                        ) : (
                          <span className="text-emerald-500 font-bold">Active</span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {visit.method}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </>
  );
}

