'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';
import { getMediaUrl } from '../../utils';
import ConfirmationModal from '../ConfirmationModal';
import { useToast } from '../../../hooks/useToast';
import { 
  Calendar, Clock, Edit, Trash2, Plus, Search, BarChart3, ChevronUp, ChevronDown, 
  Package, CheckCircle, XCircle, X, Building, CalendarDays, Users
} from 'lucide-react';

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

function ResourceCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-2 mt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResourceTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="w-9 h-9 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

// SwipeableCard Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onSchedule?: () => void;
}

function SwipeableCard({ children, onEdit, onDelete, onSchedule }: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    setIsDragging(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startXRef.current;
    const newTranslate = Math.max(-180, Math.min(0, currentXRef.current + diff));
    setTranslateX(newTranslate);
  };
  
  const handleTouchEnd = () => {
    setIsDragging(false);
    if (translateX < -90) {
      setTranslateX(-180);
    } else {
      setTranslateX(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Action buttons behind */}
      <div className="absolute right-0 top-0 bottom-0 flex items-stretch">
        {onSchedule && (
          <button
            onClick={onSchedule}
            className="w-[60px] bg-[var(--brand-blue)] flex items-center justify-center text-white"
          >
            <Clock className="w-5 h-5" />
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="w-[60px] bg-[var(--brand-primary)] flex items-center justify-center text-[var(--dark-900)]"
          >
            <Edit className="w-5 h-5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="w-[60px] bg-[var(--brand-red)] flex items-center justify-center text-white"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* Main content */}
      <div
        className="relative bg-[var(--dark-700)] transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

interface BookingResourceManagerProps {
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function BookingResourceManager({ basePath, scope }: BookingResourceManagerProps) {
  const t = useTranslations('bookingsAdmin.resources');
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Build URL preserving pagination params
  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    return params.toString() ? `${path}?${params.toString()}` : path;
  };
  
  const [resources, setResources] = useState<any[]>([]);
  const [allResources, setAllResources] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const { success, error, info, warning } = useToast();
  
  // Filter state
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [selectedClub, setSelectedClub] = useState(searchParams.get('club') || '');
  const [selectedType, setSelectedType] = useState(searchParams.get('resource_type') || '');
  
  // Track initial values to detect actual user changes
  const initialSearchRef = useRef(searchParams.get('search') || '');
  const initialClubRef = useRef(searchParams.get('club') || '');
  const initialTypeRef = useRef(searchParams.get('resource_type') || '');
  const hasUserChangedFilters = useRef(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Debounced filter update - only reset page when user actually changes filters
  useEffect(() => {
    const searchChanged = searchInput !== initialSearchRef.current;
    const clubChanged = selectedClub !== initialClubRef.current;
    const typeChanged = selectedType !== initialTypeRef.current;
    
    if (!searchChanged && !clubChanged && !typeChanged && !hasUserChangedFilters.current) {
      return;
    }
    
    hasUserChangedFilters.current = true;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) params.set('search', searchInput); else params.delete('search');
      if (selectedClub) params.set('club', selectedClub); else params.delete('club');
      if (selectedType) params.set('resource_type', selectedType); else params.delete('resource_type');
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
      
      // Update refs to current values
      initialSearchRef.current = searchInput;
      initialClubRef.current = selectedClub;
      initialTypeRef.current = selectedType;
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, selectedClub, selectedType, searchParams, pathname, router]);

  useEffect(() => {
    fetchDropdowns();
    fetchAllResourcesForAnalytics();
  }, []);

  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1');
    setCurrentPage(page);
    fetchResources();
  }, [searchParams]);

  const fetchDropdowns = async () => {
    if (scope === 'CLUB') return;
    try {
      const res = await api.get('/clubs/?page_size=100'); 
      setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllResourcesForAnalytics = async () => {
    try {
      let allResources: any[] = [];
      let page = 1;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/bookings/resources/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) break;
        
        let pageResources: any[] = [];
        
        if (Array.isArray(responseData)) {
          pageResources = responseData;
          allResources = [...allResources, ...pageResources];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageResources = responseData.results;
          allResources = [...allResources, ...pageResources];
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const gotEmptyPage = pageResources.length === 0;
          
          if (!hasNext || gotEmptyPage) break;
          page++;
        } else {
          break;
        }
      }
      
      setAllResources(allResources);
    } catch (err) {
      console.error('Error fetching resources for analytics:', err);
      setAllResources([]);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();
    
    try {
      const params = new URLSearchParams();
      
      const search = searchParams.get('search') || '';
      const club = searchParams.get('club') || '';
      const resourceType = searchParams.get('resource_type') || '';
      const page = searchParams.get('page') || '1';
      
      if (search) params.set('search', search);
      if (club) params.set('club', club);
      if (resourceType) params.set('resource_type', resourceType);
      
      params.set('page', page);
      params.set('page_size', pageSize.toString());
      
      const res = await api.get(`/bookings/resources/?${params.toString()}`);
      const data = res.data;
      
      const results = Array.isArray(data) ? data : data.results || [];
      setResources(results);
      
      if (data.count !== undefined) {
        setTotalCount(data.count);
        setTotalPages(Math.ceil(data.count / pageSize));
      } else {
        setTotalCount(results.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error(err);
      setResources([]);
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

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/bookings/resources/${itemToDelete.id}/`);
      success(t('toast.resourceDeleted'));
      fetchResources();
      fetchAllResourcesForAnalytics();
      setItemToDelete(null);
    } catch (err) {
      error(t('toast.failedToDelete'));
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setSelectedClub('');
    setSelectedType('');
    router.push(pathname);
  };

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', p.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  // Calculate analytics
  const analytics = {
    total: allResources.length,
    active: allResources.filter((r: any) => r.is_active).length,
    inactive: allResources.filter((r: any) => !r.is_active).length,
    rooms: allResources.filter((r: any) => r.resource_type === 'ROOM').length,
    equipment: allResources.filter((r: any) => r.resource_type === 'EQUIPMENT').length,
  };

  const bookingsPath = basePath.replace('/resources', '');
  const calendarPath = `${bookingsPath}/calendar`;

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1rem'
  };

  const hasFilters = searchInput || selectedClub || selectedType;

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-8 px-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
          </div>
          <div className="flex flex-wrap gap-2 px-4 sm:px-0">
            <Link href={bookingsPath}>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium">
                <CalendarDays className="h-4 w-4" /> {t('dashboard')}
              </button>
            </Link>
            <Link href={calendarPath}>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium">
                <Calendar className="h-4 w-4" /> {t('calendar')}
              </button>
            </Link>
            <Link href={buildUrlWithParams(`${basePath}/create`)}>
              <button className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-2 transition-all">
                <Plus className="h-4 w-4" /> {t('newResource')}
              </button>
            </Link>
          </div>
        </div>

        {/* Analytics Dashboard */}
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
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Total Resources */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                    <Building className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.total')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total}</div>
              </div>

              {/* Active */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.active')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{analytics.active}</div>
              </div>

              {/* Inactive */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-red)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-red)] to-[#F87171] flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.inactive')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-red)]">{analytics.inactive}</div>
              </div>

              {/* Rooms */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[#38BDF8] flex items-center justify-center">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.rooms')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.rooms}</div>
              </div>
            </div>
          </div>
        </div>

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
              {(scope === 'MUNICIPALITY' || scope === 'SUPER') && (
                <div className="w-full sm:w-[160px]">
                  <select 
                    className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                    value={selectedClub}
                    onChange={e => setSelectedClub(e.target.value)}
                    style={selectArrowStyle}
                  >
                    <option value="">{t('filters.allClubs')}</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="w-full sm:w-[160px]">
                <select 
                  className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  style={selectArrowStyle}
                >
                  <option value="">{t('filters.allTypes')}</option>
                  <option value="ROOM">{t('filters.rooms')}</option>
                  <option value="EQUIPMENT">{t('filters.equipment')}</option>
                </select>
              </div>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-xl transition-all flex items-center gap-2"
                >
                  <X className="h-4 w-4" /> {t('filters.clearAll')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        {!showSkeleton && resources.length > 0 && (
          <div className="px-4 sm:px-0">
            <p className="text-sm text-[var(--brand-light)]/50">
              {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{resources.length}</span> {t('statsBar.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> {totalCount === 1 ? t('statsBar.resource') : t('statsBar.resources')}
            </p>
          </div>
        )}

        {/* Content */}
        {showSkeleton ? (
          <>
            {/* Mobile Cards Skeleton */}
            <div className="flex flex-col md:hidden">
              {[...Array(4)].map((_, i) => (
                <ResourceCardSkeleton key={i} />
              ))}
            </div>

            {/* Desktop Table Skeleton */}
            <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--dark-600)]">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.resource')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.type')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.description')}</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <ResourceTableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : resources.length === 0 ? (
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center">
              <Building className="w-8 h-8 text-[var(--brand-light)]/30" />
            </div>
            <p className="text-[var(--brand-light)]/50 mb-2">{t('emptyState.noResourcesFound')}</p>
            <p className="text-[var(--brand-light)]/30 text-sm">
              {hasFilters ? t('emptyState.tryAdjustingFilters') : t('emptyState.createFirstResource')}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {resources.map(res => {
                const imageUrl = res.image ? getMediaUrl(res.image) : null;
                return (
                  <SwipeableCard 
                    key={res.id}
                    onSchedule={() => router.push(buildUrlWithParams(`${basePath}/${res.id}/schedule`))}
                    onEdit={() => router.push(buildUrlWithParams(`${basePath}/edit/${res.id}`))}
                    onDelete={() => setItemToDelete(res)}
                  >
                    <div className="border-y border-[var(--dark-600)] p-4">
                      <div className="flex items-start gap-3">
                        {/* Image */}
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={res.name}
                            className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0">
                            <Package className="h-6 w-6 text-white" />
                          </div>
                        )}
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-[var(--brand-light)] truncate">{res.name}</h3>
                              <p className="text-xs text-[var(--brand-light)]/50 mt-0.5">
                                {t('mobileCard.max')} {res.max_participants} {res.max_participants === 1 ? t('mobileCard.person') : t('mobileCard.people')}
                              </p>
                            </div>
                          </div>
                          
                          {/* Badges */}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30">
                              {t(`resourceTypes.${res.resource_type}`)}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              res.is_active 
                                ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border border-[var(--brand-green)]/30' 
                                : 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30'
                            }`}>
                              {res.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {res.is_active ? t('status.active') : t('status.inactive')}
                            </span>
                            {scope !== 'CLUB' && res.club_name && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--dark-600)] text-[var(--brand-light)]/70 border border-[var(--dark-500)]">
                                {res.club_name}
                              </span>
                            )}
                          </div>
                          
                          {/* Description */}
                          {res.description && (
                            <p className="text-xs text-[var(--brand-light)]/40 mt-2 line-clamp-2">
                              {res.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </SwipeableCard>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--dark-600)]">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.resource')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.type')}</th>
                    {scope !== 'CLUB' && (
                      <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.club')}</th>
                    )}
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.description')}</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map(res => {
                    const imageUrl = res.image ? getMediaUrl(res.image) : null;
                    return (
                      <tr key={res.id} className="border-b border-[var(--dark-600)]/50 hover:bg-[var(--dark-700)]/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            {imageUrl ? (
                              <img 
                                src={imageUrl} 
                                alt={res.name}
                                className="w-10 h-10 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                <Package className="h-5 w-5 text-white" />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-[var(--brand-light)]">{res.name}</div>
                              <div className="text-xs text-[var(--brand-light)]/50">
                                {t('mobileCard.max')} {res.max_participants} {res.max_participants === 1 ? t('mobileCard.person') : t('mobileCard.people')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30">
                            {t(`resourceTypes.${res.resource_type}`)}
                          </span>
                        </td>
                        {scope !== 'CLUB' && (
                          <td className="py-4 px-6">
                            <span className="text-sm text-[var(--brand-light)]/70">{res.club_name || '-'}</span>
                          </td>
                        )}
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            res.is_active 
                              ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border border-[var(--brand-green)]/30' 
                              : 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30'
                          }`}>
                            {res.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {res.is_active ? t('status.active') : t('status.inactive')}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm text-[var(--brand-light)]/60 line-clamp-2 max-w-md">
                            {res.description || <span className="text-[var(--brand-light)]/30 italic">{t('noDescription')}</span>}
                          </p>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={buildUrlWithParams(`${basePath}/${res.id}/schedule`)}>
                              <button className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/20 transition-all flex items-center justify-center">
                                <Clock className="h-4 w-4" />
                              </button>
                            </Link>
                            <Link href={buildUrlWithParams(`${basePath}/edit/${res.id}`)}>
                              <button className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-all flex items-center justify-center">
                                <Edit className="h-4 w-4" />
                              </button>
                            </Link>
                            <button 
                              className="w-9 h-9 rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/20 transition-all flex items-center justify-center"
                              onClick={() => setItemToDelete(res)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
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

        {/* Delete Confirmation Modal */}
        <ConfirmationModal 
          isVisible={!!itemToDelete} 
          onClose={() => setItemToDelete(null)} 
          onConfirm={handleDelete} 
          title={t('modals.deleteResource.title')}
          message={t('modals.deleteResource.message', { name: itemToDelete?.name || '' })}
          confirmButtonText={t('modals.deleteResource.confirm')}
          cancelButtonText={t('modals.deleteResource.cancel')}
          variant="danger"
          darkMode
        />

        {/* Toast Notification */}
        </div>
    </div>
  );
}
