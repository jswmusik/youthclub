'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { visits } from '@/lib/api';
import NavBar from '@/app/components/NavBar';

interface Visit {
  id: number;
  club: number;
  club_name?: string;
  check_in_at: string;
  check_out_at: string | null;
  method: string;
}

type FilterType = 'all' | 'today' | 'last_week' | 'last_month' | 'custom';

export default function YouthVisitsPage() {
  const [history, setHistory] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const loadHistory = async () => {
      try {
        // Fetch all sessions for the current user (not just active ones)
        // The backend automatically filters by the current user
        const res = await visits.getMyVisits();
        setHistory(res.data.results || res.data || []); 
      } catch (error) {
        console.error("Failed to load history", error);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  // Filter visits based on selected filter
  const filteredHistory = useMemo(() => {
    if (filter === 'all') {
      return history;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    return history.filter((visit) => {
      const visitDate = new Date(visit.check_in_at);
      const visitDateOnly = new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate());

      switch (filter) {
        case 'today':
          return visitDateOnly.getTime() === today.getTime();
        case 'last_week':
          return visitDateOnly >= lastWeek && visitDateOnly <= today;
        case 'last_month':
          return visitDateOnly >= lastMonth && visitDateOnly <= today;
        case 'custom':
          if (!customDate) return true;
          const selectedDate = new Date(customDate);
          const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
          return visitDateOnly.getTime() === selectedDateOnly.getTime();
        default:
          return true;
      }
    });
  }, [history, filter, customDate]);

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar - Filters */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-20">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Filter Visits</h2>
              
              <div className="space-y-2">
                <button
                  onClick={() => { setFilter('all'); setCustomDate(''); }}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                    filter === 'all'
                      ? 'bg-emerald-50 text-emerald-700 font-medium border border-emerald-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Visits
                </button>
                
                <button
                  onClick={() => { setFilter('today'); setCustomDate(''); }}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                    filter === 'today'
                      ? 'bg-emerald-50 text-emerald-700 font-medium border border-emerald-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Today
                </button>
                
                <button
                  onClick={() => { setFilter('last_week'); setCustomDate(''); }}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                    filter === 'last_week'
                      ? 'bg-emerald-50 text-emerald-700 font-medium border border-emerald-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Last Week
                </button>
                
                <button
                  onClick={() => { setFilter('last_month'); setCustomDate(''); }}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                    filter === 'last_month'
                      ? 'bg-emerald-50 text-emerald-700 font-medium border border-emerald-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Last Month
                </button>
                
                <div className="pt-2 border-t border-gray-200">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Specific Date
                  </label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      if (e.target.value) {
                        setFilter('custom');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                  {filter === 'custom' && customDate && (
                    <button
                      onClick={() => { setFilter('all'); setCustomDate(''); }}
                      className="mt-2 text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      Clear date filter
                    </button>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Visit History</h1>
                {filter !== 'all' && (
                  <p className="text-sm text-gray-500 mt-1">
                    Showing {filteredHistory.length} of {history.length} visits
                  </p>
                )}
              </div>
              <button 
                onClick={() => router.push('/dashboard/youth/scan')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm text-sm font-medium"
              >
                Scan New Visit
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading history...</div>
              ) : filteredHistory.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-2xl">📍</div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {filter === 'all' ? 'No visits yet' : 'No visits found'}
                  </h3>
                  <p className="text-gray-500 mt-1">
                    {filter === 'all' 
                      ? 'Visit a club and scan the code to check in!'
                      : 'Try adjusting your filter to see more visits.'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredHistory.map((visit) => {
                    const visitDate = new Date(visit.check_in_at);
                    const weekday = visitDate.toLocaleDateString('en-US', { weekday: 'long' });
                    const dateStr = visitDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                    
                    return (
                    <div key={visit.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {visit.club_name || 'Club Visit'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {weekday}, {dateStr}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-emerald-600">
                          In: {new Date(visit.check_in_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        {visit.check_out_at ? (
                           <div className="text-xs text-gray-500">
                             Out: {new Date(visit.check_out_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </div>
                        ) : (
                           <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                             Active Now
                           </span>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

