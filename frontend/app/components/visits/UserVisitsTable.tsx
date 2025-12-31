'use client';

import { useTranslations } from 'next-intl';
import { VisitSession } from '@/types/visit';
import { getMediaUrl } from '@/app/utils';
import { MapPin, Clock, LogIn, LogOut } from 'lucide-react';

interface Props {
  visits: VisitSession[];
  preferredClubId?: number | null;
  loading: boolean;
  page: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
}

// Skeleton Components
function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-[var(--dark-600)] rounded ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite, pulse 2s infinite'
      }}
    />
  );
}

function VisitCardSkeleton() {
  return (
    <div className="bg-[var(--dark-800)] border-b sm:border sm:rounded-xl border-[var(--dark-600)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    </div>
  );
}

function VisitTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-14" /></td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
    </tr>
  );
}

export default function UserVisitsTable({ 
  visits, 
  preferredClubId, 
  loading, 
  page, 
  totalCount,
  onPageChange 
}: Props) {
  const t = useTranslations('youthDetail.visits.table');
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sv-SE', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('sv-SE', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const calculateDuration = (start: string, end?: string | null) => {
    if (!end) return t('active');
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <>
        {/* Mobile Skeleton */}
        <div className="grid grid-cols-1 gap-0 sm:gap-4 md:hidden">
          {[...Array(4)].map((_, i) => (
            <VisitCardSkeleton key={i} />
          ))}
        </div>
        
        {/* Desktop Skeleton */}
        <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--dark-600)]">
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.club')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.date')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.checkIn')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.checkOut')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.duration')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.status')}</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <VisitTableRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-[var(--brand-light)]/30" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.noVisitsFound')}</h3>
        <p className="text-[var(--brand-light)]/50 text-sm">
          {t('emptyState.adjustFilters')}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
        <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--dark-600)]">
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.club')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.date')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.checkIn')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.checkOut')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.duration')}</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('headers.status')}</th>
              </tr>
            </thead>
          <tbody>
            {visits.map((visit, index) => {
              const isGuestVisit = preferredClubId && visit.club !== preferredClubId;
              
              return (
                <tr 
                  key={visit.id} 
                  className={`${index !== visits.length - 1 ? 'border-b border-[var(--dark-600)]/50' : ''} hover:bg-[var(--dark-700)]/30 transition-colors ${isGuestVisit ? 'bg-[var(--brand-peach)]/5' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {visit.club_avatar && (
                        <div className="w-9 h-9 rounded-full border border-[var(--dark-500)] bg-[var(--dark-700)] flex items-center justify-center overflow-hidden">
                          <img src={getMediaUrl(visit.club_avatar) || undefined} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      {!visit.club_avatar && (
                        <div className="w-9 h-9 rounded-full border border-[var(--dark-500)] bg-[var(--dark-700)] flex items-center justify-center">
                          <span className="text-xs font-bold text-[var(--brand-primary)]">
                            {visit.club_name?.charAt(0)?.toUpperCase() || 'C'}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className={`font-semibold ${isGuestVisit ? 'text-[var(--brand-peach)]' : 'text-[var(--brand-light)]'}`}>
                          {visit.club_name}
                        </div>
                        {isGuestVisit && (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] mt-1">
                            {t('guestVisit')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[var(--brand-light)]">{formatDate(visit.check_in_at)}</div>
                  </td>
                  <td className="px-6 py-4 text-[var(--brand-light)]/70">
                    {formatTime(visit.check_in_at)}
                  </td>
                  <td className="px-6 py-4 text-[var(--brand-light)]/70">
                    {visit.check_out_at ? formatTime(visit.check_out_at) : '—'}
                  </td>
                  <td className="px-6 py-4 text-[var(--brand-light)]/70">
                    {calculateDuration(visit.check_in_at, visit.check_out_at)}
                  </td>
                  <td className="px-6 py-4">
                    {visit.check_out_at ? (
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-[var(--dark-600)] text-[var(--brand-light)]/70 border border-[var(--dark-500)]">
                        {t('completed')}
                      </span>
                    ) : (
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-[var(--brand-green)]/20 text-[var(--brand-green)] border border-[var(--brand-green)]/30">
                        {t('active')}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-0 sm:gap-4 md:hidden">
        {visits.map((visit, index) => {
          const isGuestVisit = preferredClubId && visit.club !== preferredClubId;
          
          return (
            <div 
              key={visit.id} 
              className={`bg-[var(--dark-800)] ${index === 0 ? 'border-t' : ''} border-b sm:border sm:rounded-xl border-[var(--dark-600)] p-4 ${isGuestVisit ? 'border-l-4 border-l-[var(--brand-peach)]' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {visit.club_avatar ? (
                    <div className="w-10 h-10 rounded-full border border-[var(--dark-500)] bg-[var(--dark-700)] flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img src={getMediaUrl(visit.club_avatar) || undefined} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full border border-[var(--dark-500)] bg-[var(--dark-700)] flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[var(--brand-primary)]">
                        {visit.club_name?.charAt(0)?.toUpperCase() || 'C'}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold truncate ${isGuestVisit ? 'text-[var(--brand-peach)]' : 'text-[var(--brand-light)]'}`}>
                      {visit.club_name}
                    </div>
                    <div className="text-sm text-[var(--brand-light)]/50">{formatDate(visit.check_in_at)}</div>
                    {isGuestVisit && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] mt-1">
                        {t('guestVisit')}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  {visit.check_out_at ? (
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--dark-600)] text-[var(--brand-light)]/70 border border-[var(--dark-500)]">
                      {t('completed')}
                    </span>
                  ) : (
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-green)]/20 text-[var(--brand-green)] border border-[var(--brand-green)]/30">
                      {t('active')}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Time Details */}
              <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-[var(--dark-600)]">
                <div className="text-center p-2 rounded-lg bg-[var(--dark-700)]">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <LogIn className="w-3 h-3 text-[var(--brand-light)]/40" />
                    <span className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold">{t('mobile.in')}</span>
                  </div>
                  <div className="text-sm font-semibold text-[var(--brand-light)]">{formatTime(visit.check_in_at)}</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-[var(--dark-700)]">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <LogOut className="w-3 h-3 text-[var(--brand-light)]/40" />
                    <span className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold">{t('mobile.out')}</span>
                  </div>
                  <div className="text-sm font-semibold text-[var(--brand-light)]">{visit.check_out_at ? formatTime(visit.check_out_at) : '—'}</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-[var(--dark-700)]">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-[var(--brand-light)]/40" />
                    <span className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold">{t('mobile.time')}</span>
                  </div>
                  <div className="text-sm font-semibold text-[var(--brand-primary)]">{calculateDuration(visit.check_in_at, visit.check_out_at)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-4 px-4 sm:px-0">
          <button 
            disabled={page === 1} 
            onClick={() => onPageChange(page - 1)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('pagination.previous')}
          </button>
          <div className="text-sm text-[var(--brand-light)]/50">
            {t('pagination.page')} <span className="text-[var(--brand-primary)] font-semibold">{page}</span> {t('pagination.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalPages}</span>
          </div>
          <button 
            disabled={page >= totalPages} 
            onClick={() => onPageChange(page + 1)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('pagination.next')}
          </button>
        </div>
      )}
    </>
  );
}
