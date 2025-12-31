'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams, usePathname, useParams } from 'next/navigation';
import { Search, X, Clock, LogIn, LogOut, Calendar, Users, ChevronLeft, ChevronRight, QrCode, Hand, History } from 'lucide-react';
import { visits } from '@/lib/api';
import api from '@/lib/api';
import { getMediaUrl } from '@/app/utils';
import { useToast } from '../../../../../../../hooks/useToast';
import Link from 'next/link';
import VisitsTabs from '@/app/components/visits/VisitsTabs';
import BackButton from '@/app/components/BackButton';

export default function SuperClubVisitHistoryPage() {
  const t = useTranslations('clubVisits.history');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const clubId = params?.id as string;
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [clubName, setClubName] = useState<string>('');
  const { success, error, info, warning } = useToast();

  useEffect(() => {
    if (clubId) {
      api.get(`/clubs/${clubId}/`).then(res => {
        setClubName(res.data.name || 'Club');
      }).catch(() => {});
    }
  }, [clubId]);

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
      if (clubId) params.club_id = clubId;
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
      error(error.response?.data?.error || t('toast.failedToLoadHistory'));
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

  const getMethodName = (method: string) => {
    switch (method) {
      case 'QR_KIOSK': return t('methods.qrScan');
      case 'MANUAL_ADMIN': return t('methods.manual');
      case 'MANUAL_SELF': return t('methods.selfCheckIn');
      default: return method || '-';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'QR_KIOSK': return <QrCode className="w-3 h-3" />;
      default: return <Hand className="w-3 h-3" />;
    }
  };

  const getInitials = (first?: string | null, last?: string | null) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || 'U';
  };
  
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);

  const hasFilters = searchParams.get('search') || searchParams.get('start_date') || searchParams.get('end_date') || searchParams.get('guest_filter');

  return (
    <>
      <div className="py-4 sm:py-8 px-0 space-y-6">
        {/* Navigation Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-0">
          <BackButton href={`/admin/super/clubs/${clubId}`} translationKey="backToClub" />
        </div>

        {/* Hero Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          {/* Header Banner */}
          <div className="relative h-24 sm:h-32 bg-gradient-to-br from-[var(--brand-blue)]/30 via-[var(--dark-700)] to-[var(--brand-purple)]/20">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-[var(--brand-blue)]/20 blur-3xl" />
              <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-[var(--brand-purple)]/20 blur-2xl" />
            </div>
          </div>
          
          {/* Title Section */}
          <div className="relative z-10 px-4 sm:px-6 pb-6 -mt-10 sm:-mt-12">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
              <div className="relative z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-[var(--dark-800)] shadow-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0">
                <History className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="flex-1 space-y-1 pt-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
                <div className="flex items-center gap-2 text-[var(--brand-light)]/50 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>{t('description', { clubName: clubName || t('loadingClubName') })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-0 sm:px-0">
          <VisitsTabs clubId={clubId} basePath="/admin/super/clubs" />
        </div>

        {/* Filters Card */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
            <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('filters.title')}</h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40" />
                <input 
                  type="text"
                  placeholder={t('filters.searchPlaceholder')} 
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40 text-sm focus:outline-none focus:border-[var(--brand-primary)]/50 transition-colors"
                  value={searchParams.get('search') || ''}
                  onChange={e => updateUrl('search', e.target.value)}
                />
              </div>
              
              {/* Start Date */}
              <div className="relative">
                <input
                  type="date"
                  className="w-full h-10 px-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] text-sm focus:outline-none focus:border-[var(--brand-primary)]/50 transition-colors [color-scheme:dark]"
                  value={searchParams.get('start_date') || ''}
                  onChange={e => updateUrl('start_date', e.target.value)}
                />
              </div>
              
              {/* End Date */}
              <div className="relative">
                <input
                  type="date"
                  className="w-full h-10 px-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] text-sm focus:outline-none focus:border-[var(--brand-primary)]/50 transition-colors [color-scheme:dark]"
                  value={searchParams.get('end_date') || ''}
                  onChange={e => updateUrl('end_date', e.target.value)}
                />
              </div>
              
              {/* Member Type */}
              <div>
                <select 
                  className="w-full h-10 px-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] text-sm focus:outline-none focus:border-[var(--brand-primary)]/50 transition-colors appearance-none cursor-pointer"
                  value={searchParams.get('guest_filter') || ''}
                  onChange={e => updateUrl('guest_filter', e.target.value)}
                >
                  <option value="">{t('filters.allMembers')}</option>
                  <option value="members">{t('filters.preferred')}</option>
                  <option value="guests">{t('filters.guests')}</option>
                </select>
              </div>
              
              {/* Clear Button */}
              {hasFilters && (
                <button
                  onClick={() => router.push(pathname)}
                  className="h-10 px-4 rounded-xl bg-[var(--brand-red)]/20 text-[var(--brand-red)] hover:bg-[var(--brand-red)]/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
                >
                  <X className="h-4 w-4" /> {t('filters.clear')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8">
            <div className="py-12 text-center">
              <div className="inline-flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
                  <History className="w-5 h-5 text-white" />
                </div>
                <span className="text-[var(--brand-light)]/60 animate-pulse">{t('loadingHistory')}</span>
              </div>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8">
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-[var(--brand-light)]/30" />
              </div>
              <p className="text-[var(--brand-light)]/50 font-medium">{t('emptyState.noRecordsFound')}</p>
              <p className="text-sm text-[var(--brand-light)]/30 mt-1">{t('emptyState.tryAdjustingFilters')}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
                    <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('tableHeaders.member')}</th>
                    <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('tableHeaders.date')}</th>
                    <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('tableHeaders.inOut')}</th>
                    <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('tableHeaders.duration')}</th>
                    <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">{t('tableHeaders.method')}</th>
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
                        className={`border-b border-[var(--dark-600)] hover:bg-[var(--dark-700)]/30 transition-colors ${isGuest ? 'bg-[var(--brand-peach)]/5' : ''}`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl border-2 border-[var(--dark-500)] bg-[var(--dark-700)] overflow-hidden flex-shrink-0">
                              {visit.user_details?.avatar ? (
                                <img src={getMediaUrl(visit.user_details.avatar) || ''} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)]">
                                  <span className="text-xs font-bold text-white">
                                    {getInitials(visit.user_details?.first_name, visit.user_details?.last_name)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {userId ? (
                                <Link 
                                  href={`/admin/super/youth/${userId}`}
                                  className="font-semibold text-[var(--brand-light)] hover:text-[var(--brand-primary)] transition-colors"
                                >
                                  {visit.user_details?.first_name} {visit.user_details?.last_name}
                                </Link>
                              ) : (
                                <span className="font-semibold text-[var(--brand-light)]">{visit.user_details?.first_name} {visit.user_details?.last_name}</span>
                              )}
                              {isGuest && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] font-medium">
                                  {t('guest')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-[var(--brand-light)]/70">
                          {start.toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[var(--brand-third)]">
                              <LogIn className="h-3.5 w-3.5" />
                              <span className="text-sm font-medium">{start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                            {end && !isNaN(end.getTime()) && (
                              <div className="flex items-center gap-1.5 text-[var(--brand-light)]/50">
                                <LogOut className="h-3.5 w-3.5" />
                                <span className="text-sm">{end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {duration !== null ? (
                            <div className="flex items-center gap-1.5 text-[var(--brand-light)]/70">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="text-sm font-medium">{Math.floor(duration/60)}h {duration%60}m</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-[var(--brand-third)]/20 text-[var(--brand-third)]">
                              {t('active')}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                            visit.method === 'QR_KIOSK' 
                              ? 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]' 
                              : 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)]'
                          }`}>
                            {getMethodIcon(visit.method)}
                            {getMethodName(visit.method)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-0">
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
                  <div 
                    key={visit.id} 
                    className={`bg-[var(--dark-800)] border-y border-[var(--dark-600)] p-4 ${isGuest ? 'border-l-4 border-l-[var(--brand-peach)]' : 'border-l-4 border-l-[var(--brand-primary)]'}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl border-2 border-[var(--dark-500)] bg-[var(--dark-700)] overflow-hidden flex-shrink-0">
                        {visit.user_details?.avatar ? (
                          <img src={getMediaUrl(visit.user_details.avatar) || ''} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)]">
                            <span className="text-sm font-bold text-white">
                              {getInitials(visit.user_details?.first_name, visit.user_details?.last_name)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            {userId ? (
                              <Link 
                                href={`/admin/super/youth/${userId}`}
                                className="font-semibold text-[var(--brand-light)] hover:text-[var(--brand-primary)] transition-colors"
                              >
                                {visit.user_details?.first_name} {visit.user_details?.last_name}
                              </Link>
                            ) : (
                              <span className="font-semibold text-[var(--brand-light)]">{visit.user_details?.first_name} {visit.user_details?.last_name}</span>
                            )}
                            {isGuest && (
                              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] font-medium">
                                Guest
                              </span>
                            )}
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium flex-shrink-0 ${
                            visit.method === 'QR_KIOSK' 
                              ? 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]' 
                              : 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)]'
                          }`}>
                            {getMethodIcon(visit.method)}
                            {visit.method === 'QR_KIOSK' ? 'QR' : t('methods.manual')}
                          </span>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('mobileLabels.date')}</div>
                            <div className="text-[var(--brand-light)]/70">{start.toLocaleDateString()}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('mobileLabels.duration')}</div>
                            {duration !== null ? (
                              <div className="flex items-center gap-1 text-[var(--brand-light)]/70">
                                <Clock className="w-3 h-3" />
                                <span>{Math.floor(duration/60)}h {duration%60}m</span>
                              </div>
                            ) : (
                              <span className="text-[var(--brand-third)] font-medium">{t('active')}</span>
                            )}
                          </div>
                          <div>
                            <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('mobileLabels.checkIn')}</div>
                            <div className="flex items-center gap-1 text-[var(--brand-third)]">
                              <LogIn className="w-3 h-3" />
                              <span className="font-medium">{start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">{t('mobileLabels.checkOut')}</div>
                            {end && !isNaN(end.getTime()) ? (
                              <div className="flex items-center gap-1 text-[var(--brand-light)]/50">
                                <LogOut className="w-3 h-3" />
                                <span>{end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                              </div>
                            ) : (
                              <span className="text-[var(--brand-light)]/30">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-6 px-4">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => updateUrl('page', (currentPage - 1).toString())}
                  className="w-10 h-10 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
                  <span className="text-sm text-[var(--brand-light)]">
                    {t('pagination.page')} <span className="font-semibold text-[var(--brand-primary)]">{currentPage}</span> {t('pagination.of')} {totalPages}
                  </span>
                </div>
                <button 
                  disabled={currentPage >= totalPages} 
                  onClick={() => updateUrl('page', (currentPage + 1).toString())}
                  className="w-10 h-10 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast Notification */}
    </>
  );
}
