'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { visits } from '@/lib/api';
import NavBar from '@/app/components/NavBar';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import { X } from 'lucide-react';

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
  const pathname = usePathname();
  const [history, setHistory] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    <div className="min-h-screen bg-[var(--dark-900)]">
      <NavBar darkMode={true} showBackButton={true} onMenuToggle={() => setIsSidebarOpen(true)} />
      
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/70 z-40 md:hidden transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      
      {/* Mobile Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-screen w-64 z-50 bg-[var(--dark-800)] transform transition-transform duration-300 md:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 sm:h-16 px-4 border-b border-[var(--dark-500)]">
          <h1 className="text-xl font-bold text-[var(--brand-primary)]">Menu</h1>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]">
          <YouthSidebar activePath={pathname} darkMode />
        </div>
      </aside>
      
      <div className="max-w-7xl mx-auto px-4 py-8 pt-16 sm:pt-20">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar - Filters */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-6 sticky top-20">
              <h2 className="text-lg font-bold text-[var(--brand-light)] mb-4">Filter Visits</h2>
              
              <div className="space-y-2">
                <button
                  onClick={() => { setFilter('all'); setCustomDate(''); }}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                    filter === 'all'
                      ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] font-medium border border-[var(--brand-green)]/30'
                      : 'text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)]'
                  }`}
                >
                  All Visits
                </button>
                
                <button
                  onClick={() => { setFilter('today'); setCustomDate(''); }}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                    filter === 'today'
                      ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] font-medium border border-[var(--brand-green)]/30'
                      : 'text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)]'
                  }`}
                >
                  Today
                </button>
                
                <button
                  onClick={() => { setFilter('last_week'); setCustomDate(''); }}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                    filter === 'last_week'
                      ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] font-medium border border-[var(--brand-green)]/30'
                      : 'text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)]'
                  }`}
                >
                  Last Week
                </button>
                
                <button
                  onClick={() => { setFilter('last_month'); setCustomDate(''); }}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                    filter === 'last_month'
                      ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] font-medium border border-[var(--brand-green)]/30'
                      : 'text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)]'
                  }`}
                >
                  Last Month
                </button>
                
                <div className="pt-2 border-t border-[var(--dark-600)]">
                  <label className="block text-xs font-semibold text-[var(--brand-light)]/60 uppercase tracking-wider mb-2">
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
                    className="w-full px-3 py-2 border border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-light)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] outline-none"
                  />
                  {filter === 'custom' && customDate && (
                    <button
                      onClick={() => { setFilter('all'); setCustomDate(''); }}
                      className="mt-2 text-xs text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80"
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
                <h1 className="text-2xl font-bold text-[var(--brand-light)]">My Visit History</h1>
                {filter !== 'all' && (
                  <p className="text-sm text-[var(--brand-light)]/60 mt-1">
                    Showing {filteredHistory.length} of {history.length} visits
                  </p>
                )}
              </div>
              <button 
                onClick={() => router.push('/dashboard/youth/scan')}
                className="px-4 py-2 bg-[var(--brand-primary)] text-[var(--dark-900)] rounded-lg hover:bg-[var(--brand-primary)]/90 shadow-sm text-sm font-bold"
              >
                Scan New Visit
              </button>
            </div>

            <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-[var(--brand-light)]/60">Loading history...</div>
              ) : filteredHistory.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto w-16 h-16 bg-[var(--dark-700)] rounded-full flex items-center justify-center mb-4 text-2xl">📍</div>
                  <h3 className="text-lg font-medium text-[var(--brand-light)]">
                    {filter === 'all' ? 'No visits yet' : 'No visits found'}
                  </h3>
                  <p className="text-[var(--brand-light)]/60 mt-1">
                    {filter === 'all' 
                      ? 'Visit a club and scan the code to check in!'
                      : 'Try adjusting your filter to see more visits.'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--dark-600)]">
                  {filteredHistory.map((visit) => {
                    const visitDate = new Date(visit.check_in_at);
                    const weekday = visitDate.toLocaleDateString('en-US', { weekday: 'long' });
                    const dateStr = visitDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                    
                    return (
                    <div key={visit.id} className="p-4 flex items-center justify-between hover:bg-[var(--dark-700)]">
                      <div>
                        <p className="font-semibold text-[var(--brand-light)]">
                          {visit.club_name || 'Club Visit'}
                        </p>
                        <p className="text-sm text-[var(--brand-light)]/60">
                          {weekday}, {dateStr}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-[var(--brand-green)]">
                          In: {new Date(visit.check_in_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        {visit.check_out_at ? (
                           <div className="text-xs text-[var(--brand-light)]/60">
                             Out: {new Date(visit.check_out_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </div>
                        ) : (
                           <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--brand-green)]/20 text-[var(--brand-green)]">
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
