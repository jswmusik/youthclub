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
import { ArrowLeft, BarChart3, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link 
          href={`${basePath}/${userId}`} 
          className="text-sm text-gray-500 hover:text-[#4D4DA4] flex items-center gap-1 w-fit transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">
            Visit History: <span className="text-[#4D4DA4]">{user?.first_name} {user?.last_name}</span>
          </h1>
          <p className="text-gray-500 mt-1">
            Preferred Club: <span className="font-medium text-gray-700">{preferredClubName}</span>
          </p>
        </div>
      </div>

      {/* Analytics */}
      {stats && !loading && (
        <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-500">Analytics</h3>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0 h-8">
                <ChevronUp className={cn(
                  "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                  analyticsExpanded ? "rotate-0" : "rotate-180"
                )} />
                <span className="sr-only">Toggle Analytics</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="space-y-2">
            <div className="pt-2">
              <UserVisitsAnalytics stats={stats} loading={false} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <div className="p-4 space-y-4">
          <UserVisitsFilter 
            onFilter={handleFilter} 
            showClubFilter={canFilterClubs}
            clubs={clubs}
            initialStartDate={startDate}
            initialEndDate={endDate}
            initialClubId={clubId}
          />
        </div>
      </Card>

      {/* Table */}
      <UserVisitsTable 
        visits={history}
        preferredClubId={preferredClubId}
        loading={loading}
        page={page}
        totalCount={totalCount}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

