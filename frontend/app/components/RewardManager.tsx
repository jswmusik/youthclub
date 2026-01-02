'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { 
  Plus, Search, BarChart3, ChevronUp, ChevronLeft, Eye, Edit, Trash2, X, 
  Gift, Building, MapPin, Globe, CheckCircle2, TrendingUp, UserPlus, Clock, AlertCircle
} from 'lucide-react';
import api from '../../lib/api';
import { useToast } from '../../hooks/useToast';
import ConfirmationModal from './ConfirmationModal';
import { getMediaUrl } from '../utils';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick: () => void;
  showActions?: boolean;
}

function SwipeableCard({ children, onEdit, onDelete, onClick, showActions = true }: SwipeableCardProps) {
  const t = useTranslations('rewardsAdmin');
  const [isOpen, setIsOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const actionWidth = 140;
  const threshold = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!showActions) return;
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !showActions) return;
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
    if (!showActions) return;
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
      onClick();
    } else if (isOpen) {
      setIsOpen(false);
      setCurrentX(0);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit();
    setIsOpen(false);
    setCurrentX(0);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
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
      {showActions && (
        <div className="absolute inset-y-0 right-0 flex items-stretch">
          <button
            onClick={handleEditClick}
            className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-blue)] text-white transition-all active:bg-[var(--brand-blue)]/80"
          >
            <Edit className="w-5 h-5" />
            <span className="text-xs font-medium">{t('actions.edit')}</span>
          </button>
          <button
            onClick={handleDeleteClick}
            className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-red)] text-white transition-all active:bg-[var(--brand-red)]/80"
          >
            <Trash2 className="w-5 h-5" />
            <span className="text-xs font-medium">{t('actions.delete')}</span>
          </button>
        </div>
      )}

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
        {showActions && !isOpen && (
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

function RewardCardSkeleton() {
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

function RewardTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
          <Skeleton className="h-5 w-32" />
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>
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

function RewardPageSkeleton() {
  const t = useTranslations('rewardsAdmin');
  return (
    <>
      {/* Mobile Cards Skeleton */}
      <div className="flex flex-col md:hidden">
        {[...Array(4)].map((_, i) => (
          <RewardCardSkeleton key={i} />
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--dark-600)]">
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.reward')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.scope')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.expiry')}</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <RewardTableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface Reward {
  id: number;
  name: string;
  image: string | null;
  owner_role: string;
  municipality_name?: string;
  club_name?: string;
  is_active: boolean;
  expiration_date: string | null;
  usage_limit: number | null;
}

interface Analytics {
  total_created: number;
  active_rewards: number;
  expired_rewards: number;
  total_uses: number;
  uses_last_7_days: number;
}

interface RewardManagerProps {
  basePath: string;
}

export default function RewardManager({ basePath }: RewardManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('rewardsAdmin');
  
  const isSuperAdmin = pathname.includes('/super');
  const isMuniAdmin = pathname.includes('/municipality');
  const isClubAdmin = pathname.includes('/club');
  
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [allRewards, setAllRewards] = useState<Reward[]>([]);
  const [filteredRewards, setFilteredRewards] = useState<Reward[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  const { success, error, info, warning } = useToast();
  const [rewardToDelete, setRewardToDelete] = useState<Reward | null>(null);

  // Filter state
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [scopeFilter, setScopeFilter] = useState(searchParams.get('scope') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [expiredFilter, setExpiredFilter] = useState(searchParams.get('expired') || '');

  // Track initial values to detect actual user changes
  const initialSearchRef = useRef(searchParams.get('search') || '');
  const initialScopeRef = useRef(searchParams.get('scope') || '');
  const initialStatusRef = useRef(searchParams.get('status') || '');
  const initialExpiredRef = useRef(searchParams.get('expired') || '');
  const hasUserChangedFilters = useRef(false);

  // Debounced filter update - only reset page when user actually changes filters
  useEffect(() => {
    const searchChanged = searchInput !== initialSearchRef.current;
    const scopeChanged = scopeFilter !== initialScopeRef.current;
    const statusChanged = statusFilter !== initialStatusRef.current;
    const expiredChanged = expiredFilter !== initialExpiredRef.current;
    
    if (!searchChanged && !scopeChanged && !statusChanged && !expiredChanged && !hasUserChangedFilters.current) {
      return;
    }
    
    hasUserChangedFilters.current = true;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) params.set('search', searchInput); else params.delete('search');
      if (scopeFilter) params.set('scope', scopeFilter); else params.delete('scope');
      if (statusFilter) params.set('status', statusFilter); else params.delete('status');
      if (expiredFilter) params.set('expired', expiredFilter); else params.delete('expired');
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
      
      // Update refs to current values
      initialSearchRef.current = searchInput;
      initialScopeRef.current = scopeFilter;
      initialStatusRef.current = statusFilter;
      initialExpiredRef.current = expiredFilter;
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, scopeFilter, statusFilter, expiredFilter, searchParams, pathname, router]);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const scope = searchParams.get('scope');
    const status = searchParams.get('status');
    const expired = searchParams.get('expired');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (scope) params.set('scope', scope);
    if (status) params.set('status', status);
    if (expired) params.set('expired', expired);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchParams, allRewards]);

  const fetchData = async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();
    
    try {
      let allRewardsData: Reward[] = [];
      let page = 1;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/rewards/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) break;
        
        let pageRewards: Reward[] = [];
        
        if (Array.isArray(responseData)) {
          pageRewards = responseData;
          allRewardsData = [...allRewardsData, ...pageRewards];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageRewards = responseData.results;
          allRewardsData = [...allRewardsData, ...pageRewards];
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = responseData.count > 0 && allRewardsData.length >= responseData.count;
          const gotEmptyPage = pageRewards.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) break;
          
          page++;
        } else {
          break;
        }
      }
      
      const [statsRes] = await Promise.all([
        api.get('/rewards/analytics_overview/')
      ]);
      
      setAllRewards(allRewardsData);
      setAnalytics(statsRes.data);
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

  const applyFilters = () => {
    let filtered = [...allRewards];
    
    const search = searchParams.get('search') || '';
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(r => r.name.toLowerCase().includes(searchLower));
    }
    
    const scope = searchParams.get('scope') || '';
    if (scope) {
      if (scope === 'GLOBAL') {
        filtered = filtered.filter(r => r.owner_role === 'SUPER_ADMIN');
      } else if (scope === 'MUNICIPALITY') {
        filtered = filtered.filter(r => r.owner_role === 'MUNICIPALITY_ADMIN');
      } else if (scope === 'CLUB') {
        filtered = filtered.filter(r => r.owner_role === 'CLUB_ADMIN');
      }
    }
    
    const status = searchParams.get('status') || '';
    if (status) {
      if (status === 'active') {
        filtered = filtered.filter(r => r.is_active);
      } else if (status === 'inactive') {
        filtered = filtered.filter(r => !r.is_active);
      }
    }
    
    const expired = searchParams.get('expired') || '';
    if (expired) {
      const now = new Date();
      if (expired === 'yes') {
        filtered = filtered.filter(r => {
          if (!r.expiration_date) return false;
          return new Date(r.expiration_date) < now;
        });
      } else if (expired === 'no') {
        filtered = filtered.filter(r => {
          if (!r.expiration_date) return true;
          return new Date(r.expiration_date) >= now;
        });
      }
    }
    
    setFilteredRewards(filtered);
    
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setRewards(filtered.slice(startIndex, endIndex));
  };

  const clearFilters = () => {
    setSearchInput('');
    setScopeFilter('');
    setStatusFilter('');
    setExpiredFilter('');
    router.push(pathname);
  };

  const handleDelete = async () => {
    if (!rewardToDelete) return;
    try {
      await api.delete(`/rewards/${rewardToDelete.id}/`);
      success(t('toast.rewardDeleted'));
      setRewardToDelete(null);
      await fetchData();
      applyFilters();
    } catch (err) {
      error(t('toast.failedToDelete'));
    }
  };

  const getScopeLabel = (r: Reward) => {
    if (r.owner_role === 'SUPER_ADMIN') return t('scope.global');
    if (r.owner_role === 'MUNICIPALITY_ADMIN') return r.municipality_name || t('scope.municipality');
    if (r.owner_role === 'CLUB_ADMIN') return r.club_name || t('scope.club');
    return t('scope.dash');
  };

  const getScopeIcon = (r: Reward) => {
    if (r.owner_role === 'SUPER_ADMIN') return <Globe className="w-3 h-3" />;
    if (r.owner_role === 'MUNICIPALITY_ADMIN') return <MapPin className="w-3 h-3" />;
    if (r.owner_role === 'CLUB_ADMIN') return <Building className="w-3 h-3" />;
    return null;
  };

  const getScopeBadgeClasses = (r: Reward) => {
    if (r.owner_role === 'SUPER_ADMIN') return 'bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border-[var(--brand-purple)]/30';
    if (r.owner_role === 'MUNICIPALITY_ADMIN') return 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30';
    if (r.owner_role === 'CLUB_ADMIN') return 'bg-[var(--brand-third)]/20 text-[var(--brand-third)] border-[var(--brand-third)]/30';
    return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
  };

  const isExpired = (r: Reward) => {
    if (!r.expiration_date) return false;
    return new Date(r.expiration_date) < new Date();
  };

  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(filteredRewards.length / pageSize);

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

  const hasFilters = searchInput || scopeFilter || statusFilter || expiredFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
              <Gift className="w-5 h-5 text-[var(--dark-900)]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
          </div>
          <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
        </div>
        <Link href={buildUrlWithParams(`${basePath}/create`)}>
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
            <Plus className="h-4 w-4" /> {t('addReward')}
          </button>
        </Link>
      </div>

      {/* Analytics Dashboard */}
      {!showSkeleton && analytics && (
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
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Active Rewards */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.active')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{analytics.active_rewards}</div>
              </div>

              {/* Total Created */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                    <Gift className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.total')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_created}</div>
              </div>

              {/* Total Claims */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.claims')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.total_uses}</div>
              </div>

              {/* Claims (7 Days) */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)] flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.sevenDays')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-peach)]">{analytics.uses_last_7_days}</div>
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
              <div className="w-full sm:w-[160px]">
                <select 
                  className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                  value={scopeFilter}
                  onChange={e => setScopeFilter(e.target.value)}
                  style={selectArrowStyle}
                >
                  <option value="">{t('filters.allScopes')}</option>
                  <option value="GLOBAL">{t('filters.global')}</option>
                  <option value="MUNICIPALITY">{t('filters.municipality')}</option>
                  <option value="CLUB">{t('filters.club')}</option>
                </select>
              </div>
            )}
            {isMuniAdmin && (
              <div className="w-full sm:w-[160px]">
                <select 
                  className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                  value={scopeFilter}
                  onChange={e => setScopeFilter(e.target.value)}
                  style={selectArrowStyle}
                >
                  <option value="">{t('filters.allScopes')}</option>
                  <option value="MUNICIPALITY">{t('filters.municipality')}</option>
                  <option value="CLUB">{t('filters.club')}</option>
                </select>
              </div>
            )}
            <div className="w-full sm:w-[140px]">
              <select 
                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={selectArrowStyle}
              >
                <option value="">{t('filters.allStatuses')}</option>
                <option value="active">{t('filters.active')}</option>
                <option value="inactive">{t('filters.inactive')}</option>
              </select>
            </div>
            <div className="w-full sm:w-[140px]">
              <select 
                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                value={expiredFilter}
                onChange={e => setExpiredFilter(e.target.value)}
                style={selectArrowStyle}
              >
                <option value="">{t('filters.expiry')}</option>
                <option value="no">{t('filters.notExpired')}</option>
                <option value="yes">{t('filters.expired')}</option>
              </select>
            </div>
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
      {!showSkeleton && rewards.length > 0 && (
        <div className="px-4 sm:px-0">
          <p className="text-sm text-[var(--brand-light)]/50">
            {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{rewards.length}</span> {t('statsBar.of')} <span className="text-[var(--brand-primary)] font-semibold">{filteredRewards.length}</span> {filteredRewards.length === 1 ? t('statsBar.reward') : t('statsBar.rewards')}
          </p>
        </div>
      )}

      {/* Content */}
      {showSkeleton ? (
        <RewardPageSkeleton />
      ) : rewards.length === 0 ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-[var(--brand-light)]/30" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.noRewardsFound')}</h3>
          <p className="text-[var(--brand-light)]/50 text-sm mb-6">
            {hasFilters ? t('emptyState.adjustFilters') : t('emptyState.getStarted')}
          </p>
          {!hasFilters && (
            <Link href={buildUrlWithParams(`${basePath}/create`)}>
              <button className="inline-flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
                <Plus className="h-4 w-4" /> {t('addReward')}
              </button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {rewards.map((reward) => (
              <SwipeableCard
                key={reward.id}
                onClick={() => router.push(buildUrlWithParams(`${basePath}/${reward.id}`))}
                onEdit={() => router.push(buildUrlWithParams(`${basePath}/edit/${reward.id}`))}
                onDelete={() => setRewardToDelete(reward)}
              >
                <div className="border-y border-[var(--dark-600)] p-4">
                  <div className="flex items-start gap-3">
                    {/* Image */}
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20 border border-[var(--dark-500)] flex items-center justify-center">
                      {reward.image ? (
                        <img src={getMediaUrl(reward.image) || ''} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <Gift className="w-5 h-5 text-[var(--brand-primary)]" />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-[var(--brand-light)] truncate">
                        {reward.name}
                      </h3>
                      
                      {/* Scope */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {getScopeIcon(reward)}
                        <p className="text-xs text-[var(--brand-light)]/50 truncate">
                          {getScopeLabel(reward)}
                        </p>
                      </div>
                      
                      {/* Status & Expiry */}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          reward.is_active 
                            ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30' 
                            : 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]'
                        }`}>
                          {reward.is_active ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {reward.is_active ? t('status.active') : t('status.inactive')}
                        </span>
                        {reward.expiration_date && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isExpired(reward)
                              ? 'bg-[var(--brand-red)]/20 text-[var(--brand-red)]'
                              : 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]'
                          }`}>
                            <Clock className="w-3 h-3" />
                            {isExpired(reward) ? t('status.expired') : new Date(reward.expiration_date).toLocaleDateString()}
                          </span>
                        )}
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
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.reward')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.scope')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.expiry')}</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((reward, index) => (
                  <tr 
                    key={reward.id} 
                    className={`${index !== rewards.length - 1 ? 'border-b border-[var(--dark-600)]/50' : ''} hover:bg-[var(--dark-700)]/30 transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20 border border-[var(--dark-500)] flex items-center justify-center">
                          {reward.image ? (
                            <img src={getMediaUrl(reward.image) || ''} alt="" className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <Gift className="w-4 h-4 text-[var(--brand-primary)]" />
                          )}
                        </div>
                        <span className="font-semibold text-[var(--brand-light)]">{reward.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getScopeBadgeClasses(reward)}`}>
                        {getScopeIcon(reward)}
                        {getScopeLabel(reward)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        reward.is_active 
                          ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30' 
                          : 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]'
                      }`}>
                        {reward.is_active ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {reward.is_active ? t('status.active') : t('status.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {reward.expiration_date ? (
                        <span className={`inline-flex items-center gap-1.5 text-sm ${
                          isExpired(reward) ? 'text-[var(--brand-red)]' : 'text-[var(--brand-light)]/60'
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          {isExpired(reward) ? t('status.expired') : new Date(reward.expiration_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--brand-light)]/40">{t('status.noExpiry')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={buildUrlWithParams(`${basePath}/${reward.id}`)}>
                          <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <Link href={buildUrlWithParams(`${basePath}/edit/${reward.id}`)}>
                          <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all">
                            <Edit className="w-4 h-4" />
                          </button>
                        </Link>
                        <button 
                          onClick={() => setRewardToDelete(reward)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modals */}
      <ConfirmationModal 
        isVisible={!!rewardToDelete}
        onClose={() => setRewardToDelete(null)}
        onConfirm={handleDelete}
        title={t('modals.deleteReward.title')}
        message={rewardToDelete ? t('modals.deleteReward.message', { name: rewardToDelete.name }) : ''}
        confirmButtonText={t('modals.deleteReward.confirm')}
        cancelButtonText={t('modals.deleteReward.cancel')}
        variant="danger"
        darkMode={true}
      />
      </div>
  );
}
