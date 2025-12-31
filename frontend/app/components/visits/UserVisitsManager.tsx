'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { visits as visitsApi } from '@/lib/api';
import api from '@/lib/api';
import { VisitSession, VisitAnalytics } from '@/types/visit';
import { User } from '@/types/user';
import UserVisitsAnalytics from './UserVisitsAnalytics';
import UserVisitsFilter from './UserVisitsFilter';
import UserVisitsTable from './UserVisitsTable';
import Link from 'next/link';
import { ArrowLeft, BarChart3, ChevronUp, MapPin, Building } from 'lucide-react';

interface Props {
  userId: string;
  basePath: string;
  canFilterClubs?: boolean;
}

export default function UserVisitsManager({ userId, basePath, canFilterClubs = false }: Props) {
  const t = useTranslations('youthDetail.visits');
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

        if (canFilterClubs) {
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
        const [historyRes, statsRes] = await Promise.all([
          visitsApi.getHistory({
            user_id: userId,
            page,
            start_date: startDate,
            end_date: endDate,
            club_id: clubId
          }),
          visitsApi.getUserStats(userId)
        ]);

        const historyData = Array.isArray(historyRes.data) 
          ? historyRes.data 
          : (historyRes.data.results || historyRes.data || []);
        
        setHistory(historyData);
        setHasMore(!!historyRes.data.next);
        
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
    params.set('page', '1');
    
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

  // Extract preferred club ID
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
      <div className="flex flex-col gap-4 px-4 sm:px-0">
        <Link 
          href={`${basePath}/${userId}`} 
          className="inline-flex items-center gap-2 text-sm text-[var(--brand-light)]/50 hover:text-[var(--brand-primary)] transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('header.backToProfile')}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[var(--brand-primary)]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                {t('header.visitHistory')}
              </h1>
              <p className="text-sm text-[var(--brand-light)]/50">
                {user ? `${user.first_name} ${user.last_name}` : t('loading.loading')}
              </p>
            </div>
          </div>
          {preferredClubName && preferredClubName !== 'None' && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
              <Building className="w-4 h-4 text-[var(--brand-light)]/50" />
              <span className="text-sm text-[var(--brand-light)]/70">{t('header.preferredClub')}:</span>
              <span className="text-sm font-semibold text-[var(--brand-light)]">{preferredClubName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Dashboard */}
      {stats && !loading && (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <button 
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[var(--dark-700)]/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-[var(--brand-purple)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--brand-light)]">{t('analytics.title')}</h3>
            </div>
            <ChevronUp className={`h-4 w-4 text-[var(--brand-light)]/50 transition-transform duration-300 ${analyticsExpanded ? 'rotate-0' : 'rotate-180'}`} />
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
              <UserVisitsAnalytics stats={stats} loading={false} />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 sm:px-6 py-4">
        <UserVisitsFilter 
          onFilter={handleFilter} 
          showClubFilter={canFilterClubs}
          clubs={clubs}
          initialStartDate={startDate}
          initialEndDate={endDate}
          initialClubId={clubId}
        />
      </div>

      {/* Stats Bar */}
      {!loading && history.length > 0 && (
        <div className="px-4 sm:px-0">
          <p className="text-sm text-[var(--brand-light)]/50">
            {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{history.length}</span> {t('statsBar.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> {totalCount === 1 ? t('statsBar.visit') : t('statsBar.visits')}
          </p>
        </div>
      )}

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
