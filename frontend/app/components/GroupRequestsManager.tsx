'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Search, BarChart3, ChevronUp, ChevronLeft, X, CheckCircle2, XCircle, 
  Users, Building, FileText, UserPlus, Calendar, Layers, Mail
} from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import { getMediaUrl } from '../../app/utils';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onApprove?: () => void;
  onReject?: () => void;
  onClick?: () => void;
}

function SwipeableCard({ children, onApprove, onReject, onClick }: SwipeableCardProps) {
  const t = useTranslations('groupsAdmin.requests');
  const [isOpen, setIsOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const actionWidth = 140;
  const threshold = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = startX - e.touches[0].clientX;
    if (isOpen) {
      const newX = Math.max(-actionWidth, Math.min(0, -actionWidth + (startX - e.touches[0].clientX) * -1));
      setCurrentX(newX);
    } else {
      const newX = Math.max(-actionWidth, Math.min(0, -diff));
      setCurrentX(newX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (isOpen) {
      if (currentX > -actionWidth + threshold) {
        setIsOpen(false);
        setCurrentX(0);
      } else {
        setCurrentX(-actionWidth);
      }
    } else {
      if (currentX < -threshold) {
        setIsOpen(true);
        setCurrentX(-actionWidth);
      } else {
        setCurrentX(0);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isOpen && Math.abs(currentX) < 5) {
      if (onClick) onClick();
    } else if (isOpen) {
      setIsOpen(false);
      setCurrentX(0);
    }
  };

  const handleApproveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onApprove) onApprove();
    setIsOpen(false);
    setCurrentX(0);
  };

  const handleRejectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReject) onReject();
    setIsOpen(false);
    setCurrentX(0);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node) && isOpen) {
        setIsOpen(false);
        setCurrentX(0);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={cardRef} className="relative overflow-hidden">
      {/* Action buttons (behind the card) */}
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          onClick={handleApproveClick}
          className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-green)] text-white transition-all active:bg-[var(--brand-green)]/80"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-xs font-medium">{t('actions.approve')}</span>
        </button>
        <button
          onClick={handleRejectClick}
          className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-red)] text-white transition-all active:bg-[var(--brand-red)]/80"
        >
          <XCircle className="w-5 h-5" />
          <span className="text-xs font-medium">{t('actions.reject')}</span>
        </button>
      </div>

      {/* Swipeable card content */}
      <div
        className="relative bg-[var(--dark-700)] transition-transform duration-200 ease-out cursor-pointer"
        style={{ 
          transform: `translateX(${isDragging ? currentX : (isOpen ? -actionWidth : 0)}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {children}
        {/* Swipe hint indicator */}
        {!isOpen && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/20 pointer-events-none">
            <ChevronLeft className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
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

function RequestCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-2 mt-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-28 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="w-24 h-9 rounded-lg" />
          <Skeleton className="w-20 h-9 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

function RequestPageSkeleton() {
  const t = useTranslations('groupsAdmin.requests');
  return (
    <>
      {/* Mobile Cards Skeleton */}
      <div className="flex flex-col md:hidden">
        {[...Array(4)].map((_, i) => (
          <RequestCardSkeleton key={i} />
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--dark-600)]">
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.applicant')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.applyingTo')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.requested')}</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <RequestTableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function GroupRequestsManager() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('groupsAdmin.requests');
  
  const isSuperAdmin = pathname.includes('/super');
  const isMuniAdmin = pathname.includes('/municipality');
  const isClubAdmin = pathname.includes('/club');
  
  const [requests, setRequests] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [allFilteredRequests, setAllFilteredRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  
  const { success, error, info, warning } = useToast();

  // Filter state
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [municipalityFilter, setMunicipalityFilter] = useState(searchParams.get('municipality') || '');
  const [clubFilter, setClubFilter] = useState(searchParams.get('club') || '');

  // Track initial values to detect actual user changes
  const initialSearchRef = useRef(searchParams.get('search') || '');
  const initialMunicipalityRef = useRef(searchParams.get('municipality') || '');
  const initialClubRef = useRef(searchParams.get('club') || '');
  const hasUserChangedFilters = useRef(false);

  // Debounced filter update - only reset page when user actually changes filters
  useEffect(() => {
    const searchChanged = searchInput !== initialSearchRef.current;
    const municipalityChanged = municipalityFilter !== initialMunicipalityRef.current;
    const clubChanged = clubFilter !== initialClubRef.current;
    
    if (!searchChanged && !municipalityChanged && !clubChanged && !hasUserChangedFilters.current) {
      return;
    }
    
    hasUserChangedFilters.current = true;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) params.set('search', searchInput); else params.delete('search');
      if (municipalityFilter) params.set('municipality', municipalityFilter); else params.delete('municipality');
      if (clubFilter) params.set('club', clubFilter); else params.delete('club');
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
      
      // Update refs to current values
      initialSearchRef.current = searchInput;
      initialMunicipalityRef.current = municipalityFilter;
      initialClubRef.current = clubFilter;
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, municipalityFilter, clubFilter, searchParams, pathname, router]);

  useEffect(() => {
    fetchDropdowns();
    fetchAllRequests();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [searchParams, allRequests]);

  const fetchDropdowns = async () => {
    try {
      const [muniRes, clubRes] = await Promise.all([
        isSuperAdmin ? api.get('/municipalities/') : Promise.resolve({ data: [] }),
        api.get('/clubs/?page_size=1000')
      ]);
      
      setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
      setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllRequests = async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();
    
    try {
      let allRequestsData: any[] = [];
      let pageNum = 1;
      let totalCount = 0;
      const fetchPageSize = 100;
      const maxPages = 100;
      
      while (pageNum <= maxPages) {
        const res = await api.get(`/group-requests/?page=${pageNum}&page_size=${fetchPageSize}`);
        const responseData = res.data;
        
        if (Array.isArray(responseData)) {
          allRequestsData = [...allRequestsData, ...responseData];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          const pageRequests = responseData.results;
          allRequestsData = [...allRequestsData, ...pageRequests];
          
          if (pageNum === 1) {
            totalCount = responseData.count || 0;
          }
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allRequestsData.length >= totalCount;
          const gotEmptyPage = pageRequests.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) {
            break;
          }
          
          pageNum++;
        } else {
          allRequestsData = Array.isArray(responseData) ? responseData : [];
          break;
        }
      }
      
      setAllRequests(allRequestsData);
      applyFilter();
    } catch (err) {
      console.error(err);
      error(t('toast.failedToLoad'));
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      
      setTimeout(() => {
        setLoading(false);
        setShowSkeleton(false);
      }, remaining);
    }
  };

  const applyFilter = () => {
    let filtered = [...allRequests];
    
    const search = searchParams.get('search') || '';
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(req => 
        req.user_name?.toLowerCase().includes(searchLower) ||
        req.user_email?.toLowerCase().includes(searchLower) ||
        req.group_name?.toLowerCase().includes(searchLower)
      );
    }

    const municipality = searchParams.get('municipality') || '';
    if (municipality) {
      filtered = filtered.filter(req => 
        req.group_municipality?.toString() === municipality
      );
    }

    const club = searchParams.get('club') || '';
    if (club) {
      filtered = filtered.filter(req => 
        req.group_club?.toString() === club
      );
    }
    
    setAllFilteredRequests(filtered);
    
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedRequests = filtered.slice(startIndex, endIndex);
    
    setRequests(paginatedRequests);
  };

  const calculateAnalytics = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalApplications = allRequests.length;
    const applicationsLastWeek = allRequests.filter(req => {
      const requestDate = new Date(req.joined_at || req.created_at);
      return requestDate >= weekAgo;
    }).length;
    const applicationsLast30Days = allRequests.filter(req => {
      const requestDate = new Date(req.joined_at || req.created_at);
      return requestDate >= thirtyDaysAgo;
    }).length;

    return {
      totalApplications,
      applicationsLastWeek,
      applicationsLast30Days
    };
  };

  const analytics = calculateAnalytics();

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
    const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || '?';
  };

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      await api.post(`/group-requests/${id}/${action}/`);
      success(action === 'approve' ? t('toast.memberApproved') : t('toast.requestRejected'));
      fetchAllRequests();
    } catch (err) {
      error(t('toast.actionFailed'));
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setMunicipalityFilter('');
    setClubFilter('');
    router.push(pathname);
  };

  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalCount = allFilteredRequests.length;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', p.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1rem'
  };

  const hasFilters = searchInput || municipalityFilter || clubFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-[var(--dark-900)]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
          </div>
          <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {!showSkeleton && (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <button 
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[var(--dark-700)]/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)] flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-[var(--dark-900)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--brand-light)]">{t('analyticsDashboard')}</h3>
            </div>
            <ChevronUp className={`h-4 w-4 text-[var(--brand-light)]/50 transition-transform duration-300 ${analyticsExpanded ? 'rotate-0' : 'rotate-180'}`} />
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              
              {/* Total Applications */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                    <FileText className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('total')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.totalApplications}</div>
              </div>

              {/* Last Week */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('lastWeek')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.applicationsLastWeek}</div>
              </div>

              {/* Last 30 Days */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('last30Days')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{analytics.applicationsLast30Days}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 py-3">
        <div className="flex flex-col gap-3">
          {/* Search Row */}
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-[var(--brand-light)]/40 flex-shrink-0" />
            <input 
              type="text"
              placeholder={t('searchPlaceholder')} 
              className="flex-1 bg-transparent text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none text-base"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button 
                onClick={() => setSearchInput('')}
                className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors text-xl"
              >
                ×
              </button>
            )}
          </div>
          
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isSuperAdmin && (
              <div className="w-full sm:w-[200px]">
                <select 
                  className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                  value={municipalityFilter}
                  onChange={e => setMunicipalityFilter(e.target.value)}
                  style={selectArrowStyle}
                >
                  <option value="">{t('filters.allMunicipalities')}</option>
                  {municipalities.map(m => (
                    <option key={m.id} value={m.id.toString()}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
            {(isSuperAdmin || isMuniAdmin) && (
              <div className="w-full sm:w-[200px]">
                <select 
                  className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                  value={clubFilter}
                  onChange={e => setClubFilter(e.target.value)}
                  style={selectArrowStyle}
                >
                  <option value="">{t('filters.allClubs')}</option>
                  {clubs.map(c => (
                    <option key={c.id} value={c.id.toString()}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-xl transition-all"
              >
                {t('filters.clearAll')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {!showSkeleton && requests.length > 0 && (
        <div className="px-4 sm:px-0">
          <p className="text-sm text-[var(--brand-light)]/50">
            {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{requests.length}</span> {t('statsBar.of')} <span className="text-[var(--brand-primary)] font-semibold">{allFilteredRequests.length}</span> {allFilteredRequests.length === 1 ? t('statsBar.application') : t('statsBar.applications')}
          </p>
        </div>
      )}

      {/* Content */}
      {showSkeleton ? (
        <RequestPageSkeleton />
      ) : requests.length === 0 ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-[var(--brand-light)]/30" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.noApplicationsFound')}</h3>
          <p className="text-[var(--brand-light)]/50 text-sm">
            {hasFilters ? t('emptyState.adjustFilters') : t('emptyState.noPendingApplications')}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {requests.map((req) => (
              <SwipeableCard
                key={req.id}
                onApprove={() => handleAction(req.id, 'approve')}
                onReject={() => handleAction(req.id, 'reject')}
              >
                <div className="border-y border-[var(--dark-600)] p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      {req.user_avatar ? (
                        <img src={getMediaUrl(req.user_avatar) || ''} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <div className="w-full h-full bg-[var(--brand-primary)] flex items-center justify-center">
                          <span className="text-[var(--dark-900)] text-sm font-bold">
                            {getInitials(req.user_first_name, req.user_last_name)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-[var(--brand-light)] truncate">
                        {req.user_name || t('unknown')}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-[var(--brand-light)]/40" />
                        <p className="text-xs text-[var(--brand-light)]/50 truncate">
                          {req.user_email || ''}
                        </p>
                      </div>
                      
                      {/* Group & Date */}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border border-[var(--brand-blue)]/30">
                          <Layers className="w-3 h-3" />
                          {req.group_name || t('unknownGroup')}
                        </span>
                        <span className="text-[10px] text-[var(--brand-light)]/40">
                          {req.joined_at ? new Date(req.joined_at).toLocaleDateString() : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </SwipeableCard>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--dark-600)]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.applicant')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.applyingTo')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.requested')}</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req, index) => (
                  <tr 
                    key={req.id} 
                    className={`${index !== requests.length - 1 ? 'border-b border-[var(--dark-600)]/50' : ''} hover:bg-[var(--dark-700)]/30 transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                          {req.user_avatar ? (
                            <img src={getMediaUrl(req.user_avatar) || ''} alt="" className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <div className="w-full h-full bg-[var(--brand-primary)] flex items-center justify-center">
                              <span className="text-[var(--dark-900)] text-xs font-bold">
                                {getInitials(req.user_first_name, req.user_last_name)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--brand-light)]">{req.user_name || t('unknown')}</div>
                          <div className="text-xs text-[var(--brand-light)]/50">{req.user_email || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border border-[var(--brand-blue)]/30">
                        <Layers className="w-3 h-3" />
                        {req.group_name || t('unknownGroup')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[var(--brand-light)]/60">
                        {req.joined_at ? new Date(req.joined_at).toLocaleDateString() : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleAction(req.id, 'approve')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--brand-green)]/20 text-[var(--brand-green)] hover:bg-[var(--brand-green)]/30 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {t('actions.approve')}
                        </button>
                        <button 
                          onClick={() => handleAction(req.id, 'reject')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--brand-red)]/20 text-[var(--brand-red)] hover:bg-[var(--brand-red)]/30 transition-all"
                        >
                          <XCircle className="w-4 h-4" />
                          {t('actions.reject')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-4 px-4 sm:px-0">
              <button 
                disabled={currentPage === 1} 
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('pagination.previous')}
              </button>
              <div className="text-sm text-[var(--brand-light)]/50">
                {t('pagination.page')} <span className="text-[var(--brand-primary)] font-semibold">{currentPage}</span> {t('pagination.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalPages}</span>
              </div>
              <button 
                disabled={currentPage >= totalPages} 
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('pagination.next')}
              </button>
            </div>
          )}
        </>
      )}

      </div>
  );
}
