'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Search, BarChart3, ChevronUp, ChevronDown, X, Calendar, Gift, 
  TrendingUp, UsersRound, User, Mail, ChevronLeft, Eye
} from 'lucide-react';
import api from '../../../lib/api';
import { getMediaUrl } from '../../utils';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

// Swipeable Card Component for viewing claim details
interface SwipeableCardProps {
  children: React.ReactNode;
  onView?: () => void;
  onClick: () => void;
  showActions?: boolean;
}

function SwipeableCard({ children, onView, onClick, showActions = true }: SwipeableCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const actionWidth = 70;
  const threshold = 35;

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

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onView) onView();
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
            onClick={handleViewClick}
            className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-blue)] text-white transition-all active:bg-[var(--brand-blue)]/80"
          >
            <Eye className="w-5 h-5" />
            <span className="text-xs font-medium">View</span>
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

function ClaimCardSkeleton() {
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

function ClaimTableRowSkeleton() {
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
      <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>
      <td className="px-6 py-4 text-right"><Skeleton className="h-5 w-24 ml-auto" /></td>
    </tr>
  );
}

interface RewardClaimHistoryProps {
  rewardId: string;
  basePath: string;
}

export default function RewardClaimHistory({ rewardId, basePath }: RewardClaimHistoryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [reward, setReward] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [allClaimsForAnalytics, setAllClaimsForAnalytics] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);

  // Filter state
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') || '');

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const dateFromParam = searchParams.get('date_from');
    const dateToParam = searchParams.get('date_to');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (dateFromParam) params.set('date_from', dateFromParam);
    if (dateToParam) params.set('date_to', dateToParam);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  // Debounced filter update
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) params.set('search', searchInput); else params.delete('search');
      if (dateFrom) params.set('date_from', dateFrom); else params.delete('date_from');
      if (dateTo) params.set('date_to', dateTo); else params.delete('date_to');
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, dateFrom, dateTo]);

  useEffect(() => {
    if (rewardId) {
      fetchReward();
      fetchAllClaimsForAnalytics();
    }
  }, [rewardId]);

  useEffect(() => {
    if (rewardId) {
      fetchClaims();
    }
  }, [searchParams, rewardId]);

  const fetchReward = async () => {
    try {
      const res = await api.get(`/rewards/${rewardId}/`);
      setReward(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllClaimsForAnalytics = async () => {
    try {
      let allClaims: any[] = [];
      let page = 1;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/rewards/${rewardId}/history/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) break;
        
        let pageClaims: any[] = [];
        
        if (Array.isArray(responseData)) {
          pageClaims = responseData;
          allClaims = [...allClaims, ...pageClaims];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageClaims = responseData.results;
          allClaims = [...allClaims, ...pageClaims];
          
          if (!responseData.next || pageClaims.length === 0) break;
          page++;
        } else {
          break;
        }
      }
      
      setAllClaimsForAnalytics(allClaims);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClaims = async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();
    
    try {
      const params = new URLSearchParams();
      const search = searchParams.get('search');
      const dateFromParam = searchParams.get('date_from');
      const dateToParam = searchParams.get('date_to');
      const page = searchParams.get('page') || '1';
      
      params.set('page', page);
      params.set('page_size', '10');
      
      if (search) params.set('search', search);
      if (dateFromParam) params.set('date_from', dateFromParam);
      if (dateToParam) params.set('date_to', dateToParam);
      
      const res = await api.get(`/rewards/${rewardId}/history/?${params.toString()}`);
      
      if (Array.isArray(res.data)) {
        setClaims(res.data);
        setTotalCount(res.data.length);
      } else {
        setClaims(res.data.results || []);
        setTotalCount(res.data.count || 0);
      }
    } catch (err) {
      console.error(err);
      setClaims([]);
      setTotalCount(0);
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      
      setTimeout(() => {
        setLoading(false);
        setShowSkeleton(false);
      }, remaining);
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setDateFrom('');
    setDateTo('');
    router.push(pathname);
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || '?';
  };

  const getFullName = (claim: any) => {
    if (claim.user_name) return claim.user_name;
    if (claim.user_first_name || claim.user_last_name) {
      return `${claim.user_first_name || ''} ${claim.user_last_name || ''}`.trim();
    }
    return 'Unknown User';
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Calculate analytics from allClaimsForAnalytics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const analytics = {
    total_claims: allClaimsForAnalytics.length,
    claims_last_30_days: allClaimsForAnalytics.filter((claim: any) => {
      const claimDate = claim.redeemed_at ? new Date(claim.redeemed_at) : (claim.created_at ? new Date(claim.created_at) : null);
      if (!claimDate) return false;
      return claimDate >= thirtyDaysAgo;
    }).length,
    gender: {
      male: allClaimsForAnalytics.filter((claim: any) => claim.user_gender === 'MALE').length,
      female: allClaimsForAnalytics.filter((claim: any) => claim.user_gender === 'FEMALE').length,
      other: allClaimsForAnalytics.filter((claim: any) => claim.user_gender === 'OTHER').length,
    },
  };

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', p.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasFilters = searchInput || dateFrom || dateTo;

  if (!reward && !loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <Gift className="w-12 h-12 text-[var(--brand-red)] mx-auto mb-4" />
          <p className="text-[var(--brand-light)] font-semibold">Reward not found</p>
          <Link href={basePath} className="text-[var(--brand-primary)] text-sm hover:underline mt-2 inline-block">
            Return to list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-0 mb-6">
        <Link 
          href={buildUrlWithParams(`${basePath}/${rewardId}`)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Reward
        </Link>
      </div>

      {/* Header */}
      <div className="px-4 sm:px-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Claim History</h1>
            {reward && (
              <p className="text-[var(--brand-light)]/50 text-sm">{reward.name}</p>
            )}
          </div>
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
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-[var(--brand-purple)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--brand-light)]">Analytics Dashboard</h3>
            </div>
            {analyticsExpanded ? (
              <ChevronUp className="h-4 w-4 text-[var(--brand-light)]/50" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[var(--brand-light)]/50" />
            )}
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              
              {/* Total Claims */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                    <Gift className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Total Claims</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_claims}</div>
              </div>

              {/* Claims Last 30 Days */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[#38BDF8] flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Last 30 Days</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.claims_last_30_days}</div>
              </div>

              {/* Gender Breakdown */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center">
                    <UsersRound className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Demographics</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--brand-light)]/50">Male:</span>
                    <span className="font-bold text-[var(--brand-light)]">{analytics.gender.male}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--brand-light)]/50">Female:</span>
                    <span className="font-bold text-[var(--brand-light)]">{analytics.gender.female}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--brand-light)]/50">Other:</span>
                    <span className="font-bold text-[var(--brand-light)]">{analytics.gender.other}</span>
                  </div>
                </div>
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
              placeholder="Search by name..." 
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
          
          {/* Date Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 sm:flex-none sm:w-[180px]">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40" />
                <input
                  type="date"
                  placeholder="From date"
                  className="w-full h-10 pl-10 pr-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 sm:flex-none sm:w-[180px]">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40" />
                <input
                  type="date"
                  placeholder="To date"
                  className="w-full h-10 pl-10 pr-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-xl transition-all flex items-center gap-2"
              >
                <X className="h-4 w-4" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {!showSkeleton && claims.length > 0 && (
        <div className="px-4 sm:px-0">
          <p className="text-sm text-[var(--brand-light)]/50">
            Showing <span className="text-[var(--brand-primary)] font-semibold">{claims.length}</span> of <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> {totalCount === 1 ? 'claim' : 'claims'}
          </p>
        </div>
      )}

      {/* Content */}
      {showSkeleton ? (
        <>
          {/* Mobile Cards Skeleton */}
          <div className="flex flex-col md:hidden">
            {[...Array(4)].map((_, i) => (
              <ClaimCardSkeleton key={i} />
            ))}
          </div>

          {/* Desktop Table Skeleton */}
          <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--dark-600)]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Member</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Gender</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Age</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Date Claimed</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <ClaimTableRowSkeleton key={i} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : claims.length === 0 ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-[var(--brand-light)]/30" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">No claims found</h3>
          <p className="text-[var(--brand-light)]/50 text-sm">
            {hasFilters ? 'Try adjusting your search or date filters.' : 'No one has claimed this reward yet.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="flex flex-col md:hidden">
            {claims.map((claim) => {
              const claimDate = claim.redeemed_at ? new Date(claim.redeemed_at) : (claim.created_at ? new Date(claim.created_at) : null);
              const age = claim.user_birth_date ? calculateAge(claim.user_birth_date) : null;
              
              return (
                <SwipeableCard
                  key={claim.id}
                  onClick={() => {}}
                  onView={() => {}}
                  showActions={false}
                >
                  <div className="border-y border-[var(--dark-600)] p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--dark-600)] flex items-center justify-center">
                        {claim.user_avatar ? (
                          <img src={getMediaUrl(claim.user_avatar) || ''} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-sm">
                            {getInitials(claim.user_first_name || '', claim.user_last_name || '')}
                          </span>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-[var(--brand-light)] truncate">
                          {getFullName(claim)}
                        </h3>
                        
                        {/* Club */}
                        <p className="text-xs text-[var(--brand-light)]/50 truncate">
                          {claim.user_club_name || 'No club'}
                        </p>
                        
                        {/* Details */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {claim.user_gender && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] capitalize">
                              {claim.user_gender.toLowerCase()}
                            </span>
                          )}
                          {age && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]">
                              {age} years
                            </span>
                          )}
                          {claimDate && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--dark-600)] text-[var(--brand-light)]/60">
                              <Calendar className="w-3 h-3" />
                              {claimDate.toLocaleDateString()} {claimDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          )}
                        </div>
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
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Member</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Gender</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Age</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Date Claimed</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim, index) => {
                  const claimDate = claim.redeemed_at ? new Date(claim.redeemed_at) : (claim.created_at ? new Date(claim.created_at) : null);
                  const age = claim.user_birth_date ? calculateAge(claim.user_birth_date) : null;
                  
                  return (
                    <tr 
                      key={claim.id} 
                      className={`${index !== claims.length - 1 ? 'border-b border-[var(--dark-600)]/50' : ''} hover:bg-[var(--dark-700)]/30 transition-colors`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--dark-600)] flex items-center justify-center">
                            {claim.user_avatar ? (
                              <img src={getMediaUrl(claim.user_avatar) || ''} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white font-bold text-xs">
                                {getInitials(claim.user_first_name || '', claim.user_last_name || '')}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-[var(--brand-light)]">
                              {getFullName(claim)}
                            </div>
                            <div className="text-xs text-[var(--brand-light)]/50 truncate">
                              {claim.user_club_name || 'No club'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {claim.user_gender ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] capitalize">
                            {claim.user_gender.toLowerCase()}
                          </span>
                        ) : (
                          <span className="text-sm text-[var(--brand-light)]/40">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {age ? (
                          <span className="text-sm text-[var(--brand-light)]">{age} years</span>
                        ) : (
                          <span className="text-sm text-[var(--brand-light)]/40">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {claimDate ? (
                          <div>
                            <div className="text-sm text-[var(--brand-light)]/70">{claimDate.toLocaleDateString()}</div>
                            <div className="text-xs text-[var(--brand-light)]/40">{claimDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-[var(--brand-light)]/40">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
                Previous
              </button>
              <div className="text-sm text-[var(--brand-light)]/50">
                Page <span className="text-[var(--brand-primary)] font-semibold">{currentPage}</span> of <span className="text-[var(--brand-primary)] font-semibold">{totalPages}</span>
              </div>
              <button 
                disabled={currentPage >= totalPages} 
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
