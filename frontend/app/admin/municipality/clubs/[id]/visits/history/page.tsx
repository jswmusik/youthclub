'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams, usePathname, useParams } from 'next/navigation';
import { visits } from '@/lib/api';
import { useToast } from '../../../../../../../hooks/useToast';
import Link from 'next/link';
import { Search, X, Clock, LogIn, LogOut, User, History } from 'lucide-react';
import { getMediaUrl } from '@/app/utils';
import VisitsTabs from '@/app/components/visits/VisitsTabs';
import BackButton from '@/app/components/BackButton';

export default function MunicipalityClubVisitHistoryPage() {
  const t = useTranslations('clubVisits.history');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const clubId = params?.id as string;
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const { success, error, info, warning } = useToast();

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params: { search?: string; start_date?: string; end_date?: string; club_id?: string | number; page?: number } = {};
      const search = searchParams.get('search') || '';
      const startDate = searchParams.get('start_date') || '';
      const endDate = searchParams.get('end_date') || '';
      const guestFilter = searchParams.get('guest_filter') || '';
      const page = Number(searchParams.get('page')) || 1;
      
      if (search && search.trim()) params.search = search.trim();
      if (startDate && startDate.trim()) params.start_date = startDate.trim();
      if (endDate && endDate.trim()) params.end_date = endDate.trim();
      if (clubId) params.club_id = clubId; // Filter by current club
      if (page > 1) params.page = page;
      
      const res = await visits.getHistory(params);
      let visitsData = res.data.results || res.data || [];
      const count = Array.isArray(res.data) ? visitsData.length : (res.data.count || visitsData.length);
      
      // Client-side filtering for guest status
      if (guestFilter === 'guests') {
        visitsData = visitsData.filter((visit: any) => visit.is_guest === true);
      } else if (guestFilter === 'members') {
        visitsData = visitsData.filter((visit: any) => visit.is_guest === false);
      }
      
      setData(visitsData);
      setTotalCount(count);
      } catch (error: any) {
      error(error.response?.data?.error || "Failed to load history");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clubId) {
      fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, clubId]);

  // Helper function to convert method to readable name
  const getMethodName = (method: string) => {
    switch (method) {
      case 'QR_KIOSK':
        return 'QR Kiosk Scan';
      case 'MANUAL_ADMIN':
        return 'Manual Admin Entry';
      case 'MANUAL_SELF':
        return 'Manual Self Check-in';
      default:
        return method || '-';
    }
  };

  // Helper function to get user initials
  const getInitials = (first?: string | null, last?: string | null) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || 'U';
  };
  
  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8 px-0">
      <div className="sm:max-w-7xl sm:mx-auto sm:px-6 space-y-6">
        {/* Back Link */}
        <div className="px-4 sm:px-0">
          <BackButton href={`/admin/municipality/clubs/${clubId}`} label={t('backToClub') || 'Back to Club'} />
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4 sm:px-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <History className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title') || 'Visit History'}</h1>
                <p className="text-[var(--brand-light)]/50 text-sm mt-1">{t('description') || 'Archive of all check-ins and check-outs'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-0">
          <VisitsTabs clubId={clubId} basePath="/admin/municipality/clubs" />
        </div>

        {/* FILTERS */}
        <div className="px-4 sm:px-0">
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <div className="p-6 space-y-4">
            {/* Main Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* Search */}
              <div className="relative md:col-span-4 lg:col-span-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40" />
                <input 
                  placeholder={t('searchPlaceholder') || 'Search by name or email...'}
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 outline-none transition-all duration-200 hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                  value={searchParams.get('search') || ''}
                  onChange={e => updateUrl('search', e.target.value)}
                />
              </div>
              
              {/* Start Date */}
              <div className="md:col-span-2 lg:col-span-2">
                <input
                  type="date"
                  className="w-full h-11 px-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] outline-none transition-all duration-200 hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                  value={searchParams.get('start_date') || ''}
                  onChange={e => updateUrl('start_date', e.target.value)}
                />
              </div>
              
              {/* End Date */}
              <div className="md:col-span-2 lg:col-span-2">
                <input
                  type="date"
                  className="w-full h-11 px-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] outline-none transition-all duration-200 hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                  value={searchParams.get('end_date') || ''}
                  onChange={e => updateUrl('end_date', e.target.value)}
                />
              </div>
              
              {/* Member Type */}
              <div className="md:col-span-2 lg:col-span-2">
                <select 
                  className="w-full h-11 px-4 rounded-xl appearance-none cursor-pointer bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] outline-none transition-all duration-200 hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                  value={searchParams.get('guest_filter') || ''}
                  onChange={e => updateUrl('guest_filter', e.target.value)}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1rem center',
                    backgroundSize: '1rem'
                  }}
                >
                  <option value="">{t('allMembers') || 'All Members'}</option>
                  <option value="members">{t('preferredMembers') || 'Preferred Members'}</option>
                  <option value="guests">{t('guests') || 'Guests'}</option>
                </select>
              </div>
              
              {/* Clear Button */}
              <div className="md:col-span-2 lg:col-span-1">
                <button
                  onClick={() => router.push(pathname)}
                  className="w-full h-11 px-4 rounded-xl flex items-center justify-center gap-2 bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 font-medium hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)] transition-all"
                >
                  <X className="h-4 w-4" /> {t('clear') || 'Clear'}
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Table */}
        <div className="px-4 sm:px-0">
          {loading ? (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8">
            <div className="py-12 text-center">
              <div className="inline-flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
                  <History className="w-5 h-5 text-[var(--dark-900)]" />
                </div>
                <span className="text-[var(--brand-light)]/60 animate-pulse">{t('loading') || 'Loading records...'}</span>
              </div>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8">
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-[var(--brand-light)]/30" />
              </div>
              <p className="text-[var(--brand-light)]/50 font-medium">{t('noRecords') || 'No records found'}</p>
              <p className="text-sm text-[var(--brand-light)]/30 mt-1">{t('tryAdjustingFilters') || 'Try adjusting your filters'}</p>
              </div>
            </div>
          ) : (
            <>
              {/* MOBILE: Cards */}
              <div className="flex flex-col gap-3 md:hidden">
              {data.map((visit: any) => {
                const start = new Date(visit.check_in_at);
                const checkOutAt = visit.check_out_at;
                const hasCheckedOut = checkOutAt !== null && checkOutAt !== undefined && checkOutAt !== '';
                
                let duration: number | null = null;
                let end: Date | null = null;
                
                if (hasCheckedOut) {
                  try {
                    end = new Date(checkOutAt);
                    if (!isNaN(end.getTime())) {
                      const diffMs = end.getTime() - start.getTime();
                      duration = Math.max(0, Math.round(diffMs / 60000));
                    }
                  } catch (e) {
                    console.error('Error parsing check_out_at date:', e);
                  }
                }

                const isGuest = visit.is_guest === true;
                const userId = visit.user || visit.user_details?.id;
                
                return (
                  <div key={visit.id} className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full border-2 border-[var(--dark-500)] bg-[var(--dark-600)] overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {visit.user_details?.avatar ? (
                          <img src={getMediaUrl(visit.user_details.avatar)} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-sm font-bold text-[var(--brand-primary)]">
                            {getInitials(visit.user_details?.first_name, visit.user_details?.last_name)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {userId ? (
                            <Link 
                              href={`/admin/municipality/youth/${userId}`}
                              className="font-semibold text-[var(--brand-light)] hover:text-[var(--brand-primary)] hover:underline transition-colors truncate"
                            >
                              {visit.user_details?.first_name} {visit.user_details?.last_name}
                            </Link>
                          ) : (
                            <span className="font-semibold text-[var(--brand-light)]">{visit.user_details?.first_name} {visit.user_details?.last_name}</span>
                          )}
                          {isGuest && (
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] rounded">
                              {t('guest') || 'Guest'}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--brand-light)]/40 uppercase font-semibold">{t('date') || 'Date'}</span>
                            <span className="text-[var(--brand-light)]/70">{start.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--brand-light)]/40 uppercase font-semibold">{t('checkIn') || 'Check-in'}</span>
                            <div className="flex items-center gap-1 text-[var(--brand-green)]">
                              <LogIn className="h-3 w-3" />
                              <span className="text-sm font-medium">{start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                          </div>
                          {end && !isNaN(end.getTime()) && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[var(--brand-light)]/40 uppercase font-semibold">{t('checkOut') || 'Check-out'}</span>
                              <div className="flex items-center gap-1 text-[var(--brand-light)]/50">
                                <LogOut className="h-3 w-3" />
                                <span className="text-sm">{end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--brand-light)]/40 uppercase font-semibold">{t('duration') || 'Duration'}</span>
                            {duration !== null ? (
                              <div className="flex items-center gap-1 text-[var(--brand-light)]/70">
                                <Clock className="h-3 w-3" />
                                <span className="text-sm font-medium">{Math.floor(duration/60)}h {duration%60}m</span>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 text-xs font-medium bg-[var(--brand-green)]/20 text-[var(--brand-green)] rounded">
                                {t('active') || 'Active'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--brand-light)]/40 uppercase font-semibold">{t('method') || 'Method'}</span>
                            <span className="text-sm text-[var(--brand-light)]/70">{getMethodName(visit.method)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* DESKTOP: Table */}
              <div className="hidden md:block bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
                    <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('member') || 'Member'}</th>
                    <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('date') || 'Date'}</th>
                    <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('inOut') || 'In / Out'}</th>
                    <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('duration') || 'Duration'}</th>
                    <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('method') || 'Method'}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((visit: any) => {
                    const start = new Date(visit.check_in_at);
                    const checkOutAt = visit.check_out_at;
                    const hasCheckedOut = checkOutAt !== null && checkOutAt !== undefined && checkOutAt !== '';
                    
                    let duration: number | null = null;
                    let end: Date | null = null;
                    
                    if (hasCheckedOut) {
                      try {
                        end = new Date(checkOutAt);
                        if (!isNaN(end.getTime())) {
                          const diffMs = end.getTime() - start.getTime();
                          duration = Math.max(0, Math.round(diffMs / 60000));
                        }
                      } catch (e) {
                        console.error('Error parsing check_out_at date:', e);
                      }
                    }

                    const isGuest = visit.is_guest === true;
                    const userId = visit.user || visit.user_details?.id;
                    
                    return (
                      <tr 
                        key={visit.id} 
                        className="border-b border-[var(--dark-600)] hover:bg-[var(--dark-700)]/30 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full border-2 border-[var(--dark-500)] bg-[var(--dark-700)] overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {visit.user_details?.avatar ? (
                                <img src={getMediaUrl(visit.user_details.avatar)} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <span className="text-xs font-bold text-[var(--brand-primary)]">
                                  {getInitials(visit.user_details?.first_name, visit.user_details?.last_name)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {userId ? (
                                <Link 
                                  href={`/admin/municipality/youth/${userId}`}
                                  className="font-semibold text-[var(--brand-light)] hover:text-[var(--brand-primary)] hover:underline transition-colors"
                                >
                                  {visit.user_details?.first_name} {visit.user_details?.last_name}
                                </Link>
                              ) : (
                                <span className="font-semibold text-[var(--brand-light)]">{visit.user_details?.first_name} {visit.user_details?.last_name}</span>
                              )}
                              {isGuest && (
                                <span className="px-2 py-0.5 text-[10px] font-medium bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] rounded">
                                  {t('guest') || 'Guest'}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-[var(--brand-light)]/70">
                          {start.toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-[var(--brand-green)]">
                              <LogIn className="h-3 w-3" />
                              <span className="text-sm font-medium">{start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                            {end && !isNaN(end.getTime()) && (
                              <div className="flex items-center gap-1 text-[var(--brand-light)]/50">
                                <LogOut className="h-3 w-3" />
                                <span className="text-sm">{end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {duration !== null ? (
                            <div className="flex items-center gap-1 text-[var(--brand-light)]/70">
                              <Clock className="h-3 w-3" />
                              <span className="text-sm font-medium">{Math.floor(duration/60)}h {duration%60}m</span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-medium bg-[var(--brand-green)]/20 text-[var(--brand-green)] rounded">
                              {t('active') || 'Active'}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-[var(--brand-light)]/70">
                          {getMethodName(visit.method)}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 py-4">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => updateUrl('page', (currentPage - 1).toString())}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('prev') || 'Prev'}
                </button>
                <div className="text-sm text-[var(--brand-light)]/50">
                  {t('page') || 'Page'} {currentPage} {t('of') || 'of'} {totalPages}
                </div>
                <button 
                  disabled={currentPage >= totalPages} 
                  onClick={() => updateUrl('page', (currentPage + 1).toString())}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {t('next') || 'Next'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

