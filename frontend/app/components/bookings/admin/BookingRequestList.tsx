'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import api from '../../../../lib/api';
import { formatDistanceToNow, format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import BookingDetailModal from './BookingDetailModal';
import { 
  Users, ChevronLeft, ChevronRight, Search, X, Eye, 
  BarChart3, ChevronUp, ChevronDown, Clock, CalendarCheck, Trash2
} from 'lucide-react';
import { getMediaUrl, getInitials } from '@/app/utils';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

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

function BookingCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded-xl flex-shrink-0" />
      </div>
    </div>
  );
}

function BookingTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
      <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 rounded-xl ml-auto" /></td>
    </tr>
  );
}

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  onView?: () => void;
}

function SwipeableCard({ children, onClick, onView }: SwipeableCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = startX - e.touches[0].clientX;
    setCurrentX(Math.max(0, Math.min(diff, 80)));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (currentX > 40) {
      setIsOpen(true);
      setCurrentX(80);
    } else {
      setIsOpen(false);
      setCurrentX(0);
    }
  };

  const closeSwipe = () => {
    setIsOpen(false);
    setCurrentX(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* View Action */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-20 bg-[var(--brand-primary)] flex items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          onView?.();
          closeSwipe();
        }}
      >
        <Eye className="w-5 h-5 text-[var(--dark-900)]" />
      </div>
      
      {/* Main Content */}
      <div
        className="relative bg-[var(--dark-700)] transition-transform duration-200 ease-out"
        style={{ transform: `translateX(-${isOpen ? 80 : currentX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (isOpen) {
            closeSwipe();
          } else {
            onClick?.();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Accept scope prop
export default function BookingRequestList({ scope }: { scope?: 'CLUB' | 'MUNICIPALITY' | 'SUPER' }) {
  const t = useTranslations('bookingsAdmin.requestList');
  const locale = useLocale();
  const dateLocale = locale === 'sv' ? sv : enUS;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
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
    setShowSkeleton(true);
    const startTime = Date.now();
    
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
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      
      setTimeout(() => {
        setLoading(false);
        setShowSkeleton(false);
      }, remaining);
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

  const clearFilters = () => {
    setSelectedClub('');
    setSelectedResource('');
  };

  const hasFilters = selectedClub || selectedResource;

  return (
    <div className="space-y-6">
      {/* Analytics Dashboard */}
      {!showSkeleton && (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <button 
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[var(--dark-700)]/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-[var(--brand-purple)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--brand-light)]">{t('analyticsDashboard')}</h3>
            </div>
            {analyticsExpanded ? (
              <ChevronUp className="h-4 w-4 text-[var(--brand-light)]/50" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[var(--brand-light)]/50" />
            )}
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              
              {/* Pending Requests */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-primary)] flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.pending')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-peach)]">{totalCount}</div>
              </div>

              {/* Resources */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center">
                    <CalendarCheck className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.resources')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-purple)]">{resources.length}</div>
              </div>

              {/* Clubs (for higher scopes) */}
              {(scope === 'MUNICIPALITY' || scope === 'SUPER') && (
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[#38BDF8] flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.clubs')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{clubs.length}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 py-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Resource Filter */}
          <div className="w-full sm:w-[200px]">
            <label className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1 block">{t('filters.resource')}</label>
            <div className="relative">
              <select 
                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                value={selectedResource}
                onChange={e => setSelectedResource(e.target.value)}
              >
                <option value="">{t('filters.allResources')}</option>
                {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40 pointer-events-none" />
            </div>
          </div>

          {/* Club Filter for High-Level Admins */}
          {(scope === 'MUNICIPALITY' || scope === 'SUPER') && (
            <div className="w-full sm:w-[180px]">
              <label className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1 block">{t('filters.club')}</label>
              <div className="relative">
                <select 
                  className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                  value={selectedClub}
                  onChange={e => setSelectedClub(e.target.value)}
                >
                  <option value="">{t('filters.allClubs')}</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Clear Filters Button */}
          {hasFilters && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 h-10 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-xl transition-all flex items-center gap-2"
              >
                <X className="h-4 w-4" /> {t('filters.clear')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {!showSkeleton && requests.length > 0 && (
        <div className="px-4 sm:px-0">
          <p className="text-sm text-[var(--brand-light)]/50">
            {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{requests.length}</span> {t('statsBar.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> {t('statsBar.pending')} {totalCount === 1 ? t('statsBar.request') : t('statsBar.requests')}
          </p>
        </div>
      )}

      {/* Content */}
      {showSkeleton ? (
        <>
          {/* Mobile Cards Skeleton */}
          <div className="flex flex-col md:hidden">
            {[...Array(4)].map((_, i) => (
              <BookingCardSkeleton key={i} />
            ))}
          </div>

          {/* Desktop Table Skeleton */}
          <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--dark-600)]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.user')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.resource')}</th>
                  {scope !== 'CLUB' && <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.club')}</th>}
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.date')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.time')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.guests')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.requested')}</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <BookingTableRowSkeleton key={i} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : requests.length === 0 ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
            <CalendarCheck className="w-8 h-8 text-[var(--brand-light)]/30" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.noPendingRequests')}</h3>
          <p className="text-[var(--brand-light)]/50 text-sm">{t('emptyState.allProcessed')}</p>
        </div>
      ) : (
        <>
          {/* Mobile: Swipeable Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {requests.map((req: any) => {
              const startDate = new Date(req.start_time);
              const endDate = new Date(req.end_time);
              const participantCount = getParticipantCount(req.participants || []);
              
              return (
                <SwipeableCard
                  key={req.id}
                  onClick={() => setSelectedBooking(req)}
                  onView={() => setSelectedBooking(req)}
                >
                  <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-[var(--dark-600)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {req.user_detail?.avatar ? (
                          <img 
                            src={getMediaUrl(req.user_detail.avatar)} 
                            alt="" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="text-sm font-bold text-[var(--brand-primary)]">
                            {getInitials(req.user_detail?.first_name, req.user_detail?.last_name)}
                          </span>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[var(--brand-light)] truncate">
                          {req.user_detail?.first_name} {req.user_detail?.last_name}
                        </div>
                        <div className="text-xs text-[var(--brand-light)]/50 truncate mb-2">
                          {req.user_detail?.email}
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-[var(--brand-light)]/50">{t('mobileCard.resource')}</span>
                            <span className="font-medium text-[var(--brand-primary)]">{req.resource_name}</span>
                          </div>
                          {scope !== 'CLUB' && req.club_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-[var(--brand-light)]/50">{t('mobileCard.club')}</span>
                              <span className="font-medium text-[var(--brand-light)]">{req.club_name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-[var(--brand-light)]/50">{t('mobileCard.date')}</span>
                            <span className="font-medium text-[var(--brand-light)]">{format(startDate, 'MMM d, yyyy', { locale: dateLocale })}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-[var(--brand-light)]/50">{t('mobileCard.time')}</span>
                            <span className="font-medium text-[var(--brand-light)]">
                              {format(startDate, 'HH:mm', { locale: dateLocale })} - {format(endDate, 'HH:mm', { locale: dateLocale })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-[var(--brand-light)]/40" />
                            <span className="text-[var(--brand-light)]/50">{t('mobileCard.guests')}</span>
                            <span className="font-medium text-[var(--brand-light)]">{participantCount}</span>
                          </div>
                        </div>
                        
                        <div className="text-xs text-[var(--brand-light)]/40 mt-2">
                          {t('mobileCard.requested')} {formatDistanceToNow(new Date(req.created_at), { locale: dateLocale, addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                </SwipeableCard>
              );
            })}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--dark-600)]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.user')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.resource')}</th>
                  {scope !== 'CLUB' && <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.club')}</th>}
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.date')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.time')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.guests')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.requested')}</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req: any) => {
                  const startDate = new Date(req.start_time);
                  const endDate = new Date(req.end_time);
                  const participantCount = getParticipantCount(req.participants || []);
                  
                  return (
                    <tr
                      key={req.id}
                      className="border-b border-[var(--dark-600)]/50 hover:bg-[var(--dark-700)]/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedBooking(req)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--dark-600)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {req.user_detail?.avatar ? (
                              <img 
                                src={getMediaUrl(req.user_detail.avatar)} 
                                alt="" 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <span className="text-xs font-bold text-[var(--brand-primary)]">
                                {getInitials(req.user_detail?.first_name, req.user_detail?.last_name)}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-[var(--brand-light)]">
                              {req.user_detail?.first_name} {req.user_detail?.last_name}
                            </div>
                            <div className="text-xs text-[var(--brand-light)]/50">
                              {req.user_detail?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-[var(--brand-primary)]">{req.resource_name}</span>
                      </td>
                      {scope !== 'CLUB' && (
                        <td className="px-6 py-4">
                          {req.club_name ? (
                            <span className="text-sm text-[var(--brand-light)]">{req.club_name}</span>
                          ) : (
                            <span className="text-sm text-[var(--brand-light)]/40">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--brand-light)]">{format(startDate, 'MMM d, yyyy', { locale: dateLocale })}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--brand-light)]">
                          {format(startDate, 'HH:mm', { locale: dateLocale })} - {format(endDate, 'HH:mm', { locale: dateLocale })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-[var(--brand-light)]">
                          <Users className="w-4 h-4 text-[var(--brand-light)]/40" />
                          <span>{participantCount}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-[var(--brand-light)]/50">
                          {formatDistanceToNow(new Date(req.created_at), { locale: dateLocale, addSuffix: true })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(req);
                          }}
                          className="w-9 h-9 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-colors inline-flex items-center justify-center"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination */}
      {!showSkeleton && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-4 px-4 sm:px-0">
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(currentPage - 1)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('pagination.previous')}
          </button>
          <div className="text-sm text-[var(--brand-light)]/50">
            {t('pagination.page')} <span className="text-[var(--brand-primary)] font-semibold">{currentPage}</span> {t('pagination.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalPages}</span>
          </div>
          <button 
            disabled={currentPage >= totalPages} 
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('pagination.next')}
          </button>
        </div>
      )}

      {selectedBooking && (
        <BookingDetailModal 
          booking={selectedBooking} 
          onClose={() => setSelectedBooking(null)}
          onUpdate={fetchRequests}
          darkMode={true}
        />
      )}
    </div>
  );
}
