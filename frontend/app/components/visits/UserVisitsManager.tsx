'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { visits as visitsApi } from '@/lib/api';
import api from '@/lib/api';
import { VisitSession, VisitAnalytics } from '@/types/visit';
import { User } from '@/types/user';
import UserVisitsAnalytics from './UserVisitsAnalytics';
import UserVisitsFilter from './UserVisitsFilter';
import UserVisitsTable from './UserVisitsTable';
import Link from 'next/link';

interface Props {
  userId: string;
  basePath: string; // e.g. /admin/super/youth
  canFilterClubs?: boolean; // Only for Super/Municipality admins
}

export default function UserVisitsManager({ userId, basePath, canFilterClubs = false }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<VisitSession[]>([]);
  const [stats, setStats] = useState<VisitAnalytics | null>(null);
  const [clubs, setClubs] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  // URL Params
  const page = parseInt(searchParams.get('page') || '1');
  const startDate = searchParams.get('start_date') || undefined;
  const endDate = searchParams.get('end_date') || undefined;
  const clubId = searchParams.get('club_id') || undefined;

  // 1. Fetch User & Metadata (Once)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const userRes = await api.get(`/users/${userId}/`);
        setUser(userRes.data);

        // If filtering by club is allowed, fetch available clubs
        // (For brevity, fetching all clubs - in real app might want to scope this)
        if (canFilterClubs) {
          // This endpoint depends on permission level, assuming generic list exists
          const clubsRes = await api.get('/clubs/?page_size=100'); 
          const clubsData = Array.isArray(clubsRes.data) 
            ? clubsRes.data 
            : (clubsRes.data.results || []); 
          setClubs(clubsData.map((club: any) => ({ id: club.id, name: club.name })));
        }
      } catch (err) {
        console.error("Failed to load user metadata", err);
      }
    };
    if (userId) fetchMetadata();
  }, [userId, canFilterClubs]);

  // 2. Fetch Visits & Stats (On param change)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Parallel fetch for efficiency
        const [historyRes, statsRes] = await Promise.all([
          visitsApi.getHistory({
            user_id: userId,
            page,
            start_date: startDate,
            end_date: endDate,
            club_id: clubId
          }),
          visitsApi.getUserStats(userId) // Note: Stats endpoint should probably accept date filters too in a future update
        ]);

        // Handle paginated or non-paginated response
        const historyData = Array.isArray(historyRes.data) 
          ? historyRes.data 
          : (historyRes.data.results || historyRes.data || []);
        
        setHistory(historyData);
        setHasMore(!!historyRes.data.next);
        
        // Get total count from API response
        const count = Array.isArray(historyRes.data) 
          ? historyData.length 
          : (historyRes.data.count || historyData.length);
        setTotalCount(count);
        
        setStats(statsRes.data);
      } catch (err) {
        console.error("Failed to fetch visits", err);
        setHistory([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchData();
  }, [userId, page, startDate, endDate, clubId]);

  // Handlers
  const handleFilter = (filters: { start_date?: string; end_date?: string; club_id?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1'); // Reset to page 1 on filter
    
    if (filters.start_date) params.set('start_date', filters.start_date);
    else params.delete('start_date');
    
    if (filters.end_date) params.set('end_date', filters.end_date);
    else params.delete('end_date');
    
    if (filters.club_id) params.set('club_id', filters.club_id);
    else params.delete('club_id');

    router.push(`?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  // Extract preferred club ID (handle both object and number)
  const preferredClubId = user?.preferred_club 
    ? (typeof user.preferred_club === 'object' 
        ? user.preferred_club.id 
        : user.preferred_club)
    : null;

  // Get preferred club name for display
  const preferredClubName = user?.preferred_club 
    ? (typeof user.preferred_club === 'object' 
        ? user.preferred_club.name 
        : `Club #${user.preferred_club}`)
    : 'None';

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link 
              href={`${basePath}/${userId}`} 
              className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to Profile
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Visit History: <span className="text-blue-600">{user?.first_name} {user?.last_name}</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Preferred Club: <span className="font-medium text-gray-700">{preferredClubName}</span>
            </p>
          </div>
        </div>

        {/* Analytics Dashboard */}
        {stats && !loading && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Toggle Button */}
            <button
              onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
              className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-semibold text-gray-700">Analytics Dashboard</span>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${analyticsExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Analytics Cards - Collapsible */}
            <div 
              className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${
                analyticsExpanded 
                  ? 'max-h-[500px] opacity-100' 
                  : 'max-h-0 opacity-0'
              } overflow-hidden`}
            >
              <div className="p-4">
                <UserVisitsAnalytics stats={stats} loading={false} />
              </div>
            </div>
          </div>
        )}

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
              <UserVisitsFilter 
                onFilter={handleFilter} 
                showClubFilter={canFilterClubs}
                clubs={clubs}
                initialStartDate={startDate}
                initialEndDate={endDate}
                initialClubId={clubId}
              />
            </div>
          </div>
        </div>

        {/* LIST */}
        <UserVisitsTable 
          visits={history}
          preferredClubId={preferredClubId}
          loading={loading}
          page={page}
          totalCount={totalCount}
          onPageChange={handlePageChange}
        />

      </div>
    </div>
  );
}

