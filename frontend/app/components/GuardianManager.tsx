'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X, Users, UserPlus, UsersRound, CheckCircle2, Mail, Building, ChevronLeft } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import ConfirmationModal from './ConfirmationModal';
import Toast from './Toast';
import { cn } from '@/lib/utils';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}

function SwipeableCard({ children, onEdit, onDelete, onClick }: SwipeableCardProps) {
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
      onClick();
    } else if (isOpen) {
      setIsOpen(false);
      setCurrentX(0);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
    setIsOpen(false);
    setCurrentX(0);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
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
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          onClick={handleEditClick}
          className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-blue)] text-white transition-all active:bg-[var(--brand-blue)]/80"
        >
          <Edit className="w-5 h-5" />
          <span className="text-xs font-medium">Edit</span>
        </button>
        <button
          onClick={handleDeleteClick}
          className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-red)] text-white transition-all active:bg-[var(--brand-red)]/80"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs font-medium">Delete</span>
        </button>
      </div>

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

function GuardianCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-2 mt-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

function GuardianTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-12" /></td>
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

function GuardiansPageSkeleton() {
  return (
    <>
      {/* Mobile Cards Skeleton */}
      <div className="flex flex-col gap-3 md:hidden">
        {[...Array(4)].map((_, i) => (
          <GuardianCardSkeleton key={i} />
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--dark-600)]">
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Guardian</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Status</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Connected Youth</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <GuardianTableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface GuardianManagerProps {
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function GuardianManager({ basePath, scope }: GuardianManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- STATE ---
  const [users, setUsers] = useState<any[]>([]);
  const [allUsersForAnalytics, setAllUsersForAnalytics] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  // Dropdowns
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  
  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });
  
  // Delete Confirmation Modal State
  const [userToDelete, setUserToDelete] = useState<any>(null);

  // --- LOAD DATA ---
  useEffect(() => {
    fetchDropdowns();
    fetchAllUsersForAnalytics();
  }, []);

  useEffect(() => {
    fetchGuardians();
  }, [searchParams]);

  // Minimum skeleton display time
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkeleton(false);
    }, MIN_LOADING_TIME);
    return () => clearTimeout(timer);
  }, []);

  const fetchDropdowns = async () => {
    try {
      if (scope === 'SUPER') {
        const muniRes = await api.get('/municipalities/');
        setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllUsersForAnalytics = async () => {
    try {
      let allUsers: any[] = [];
      let page = 1;
      let totalCount = 0;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('role', 'GUARDIAN');
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/users/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) break;
        
        let pageUsers: any[] = [];
        
        if (Array.isArray(responseData)) {
          pageUsers = responseData.filter((user: any) => user.role === 'GUARDIAN');
          allUsers = [...allUsers, ...pageUsers];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageUsers = responseData.results.filter((user: any) => user.role === 'GUARDIAN');
          allUsers = [...allUsers, ...pageUsers];
          
          if (page === 1) {
            totalCount = responseData.count || 0;
          }
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allUsers.length >= totalCount;
          const gotEmptyPage = pageUsers.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) break;
          page++;
        } else {
          break;
        }
      }
      
      setAllUsersForAnalytics(allUsers);
    } catch (err) {
      console.error('Error fetching users for analytics:', err);
      setAllUsersForAnalytics([]);
    }
  };

  const fetchGuardians = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('role', 'GUARDIAN');
      
      const search = searchParams.get('search');
      if (search) params.set('search', search);
      
      const gender = searchParams.get('legal_gender');
      if (gender) params.set('legal_gender', gender);
      
      const status = searchParams.get('verification_status');
      if (status) params.set('verification_status', status);
      
      const municipality = searchParams.get('municipality');
      if (municipality) params.set('municipality', municipality);
      
      const page = searchParams.get('page');
      if (page) params.set('page', page);
      
      const res = await api.get(`/users/?${params.toString()}`);
      
      if (res.data.results) {
        const guardiansOnly = res.data.results.filter((user: any) => user.role === 'GUARDIAN');
        setUsers(guardiansOnly);
        setTotalCount(res.data.count || guardiansOnly.length);
      } else {
        const guardiansOnly = (Array.isArray(res.data) ? res.data : []).filter((user: any) => user.role === 'GUARDIAN');
        setUsers(guardiansOnly);
        setTotalCount(guardiansOnly.length);
      }
    } catch (err) { 
      console.error('Error fetching guardians:', err); 
    } 
    finally { 
      setIsLoading(false); 
    }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); 
    else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const status = searchParams.get('verification_status');
    const gender = searchParams.get('legal_gender');
    const municipality = searchParams.get('municipality');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (status) params.set('verification_status', status);
    if (gender) params.set('legal_gender', gender);
    if (municipality) params.set('municipality', municipality);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try { 
      await api.delete(`/users/${userToDelete.id}/`);
      setToast({
        message: 'Guardian deleted successfully!',
        type: 'success',
        isVisible: true,
      });
      setUserToDelete(null);
      fetchGuardians(); 
      fetchAllUsersForAnalytics(); 
    } 
    catch (err) { 
      setToast({
        message: 'Failed to delete guardian.',
        type: 'error',
        isVisible: true,
      });
    }
  };

  const getInitials = (firstName: string = '', lastName: string = '') => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || '?';
  };

  // Calculate analytics
  const analytics = {
    total_guardians: allUsersForAnalytics.length,
    new_last_7_days: allUsersForAnalytics.filter((u: any) => {
      if (!u.date_joined) return false;
      const joinDate = new Date(u.date_joined);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return joinDate >= sevenDaysAgo;
    }).length,
    gender: {
      male: allUsersForAnalytics.filter((u: any) => u.legal_gender === 'MALE').length,
      female: allUsersForAnalytics.filter((u: any) => u.legal_gender === 'FEMALE').length,
      other: allUsersForAnalytics.filter((u: any) => u.legal_gender === 'OTHER').length,
    },
    verification: {
      verified: allUsersForAnalytics.filter((u: any) => u.verification_status === 'VERIFIED').length,
      unverified_pending: allUsersForAnalytics.filter((u: any) => 
        u.verification_status === 'UNVERIFIED' || u.verification_status === 'PENDING'
      ).length,
    },
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30';
      case 'PENDING': return 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30';
      case 'UNVERIFIED': return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30';
      default: return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
    }
  };

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedUsers = users;

  const clearFilters = () => {
    router.push(pathname);
  };

  const hasActiveFilters = searchParams.get('search') || searchParams.get('legal_gender') || 
    searchParams.get('verification_status') || searchParams.get('municipality');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Manage Guardians</h1>
          </div>
          <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">Manage guardians and their information.</p>
        </div>
        <Link href={`${basePath}/create`}>
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
            <Plus className="h-4 w-4" /> Add Guardian
          </button>
        </Link>
      </div>

      {/* Analytics */}
      {!isLoading && (
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
            <ChevronUp className={cn(
              "h-4 w-4 text-[var(--brand-light)]/50 transition-transform duration-300",
              analyticsExpanded ? "rotate-0" : "rotate-180"
            )} />
          </button>
          {analyticsExpanded && (
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Total Guardians */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--dark-600)] flex items-center justify-center">
                    <Users className="h-5 w-5 text-[var(--brand-purple)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Total Guardians</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_guardians}</div>
              </div>

              {/* Card 2: New Last 7 Days */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--dark-600)] flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-[var(--brand-blue)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">New (7 Days)</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.new_last_7_days}</div>
              </div>

              {/* Card 3: Gender Breakdown */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--dark-600)] flex items-center justify-center">
                    <UsersRound className="h-5 w-5 text-[var(--brand-primary)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Gender</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-light)]/50">Male:</span>
                    <span className="font-semibold text-[var(--brand-light)]">{analytics.gender.male}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-light)]/50">Female:</span>
                    <span className="font-semibold text-[var(--brand-light)]">{analytics.gender.female}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-light)]/50">Other:</span>
                    <span className="font-semibold text-[var(--brand-light)]">{analytics.gender.other}</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Verification Status */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--dark-600)] flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-[var(--brand-green)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Verification</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-light)]/50">Verified:</span>
                    <span className="font-semibold text-[var(--brand-green)]">{analytics.verification.verified}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-light)]/50">Pending:</span>
                    <span className="font-semibold text-[var(--brand-light)]">{analytics.verification.unverified_pending}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 py-3">
        <div className="flex flex-col gap-3">
          {/* Search Row */}
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-[var(--brand-light)]/40 flex-shrink-0" />
            <input 
              type="text"
              placeholder="Search by name or email..." 
              className="flex-1 bg-transparent text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none text-base"
              value={searchParams.get('search') || ''}
              onChange={e => updateUrl('search', e.target.value)}
            />
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors text-xl"
              >
                ×
              </button>
            )}
          </div>
          
          {/* Filter Dropdowns */}
          <div className="flex flex-wrap gap-2">
            <select 
              className="flex-1 min-w-[120px] h-9 rounded-lg border-2 border-[var(--dark-500)] bg-[var(--dark-700)] px-3 text-sm text-[var(--brand-light)] focus:border-[var(--brand-primary)] focus:outline-none transition-colors"
              value={searchParams.get('legal_gender') || ''} 
              onChange={e => updateUrl('legal_gender', e.target.value)}
            >
              <option value="">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
            
            <select 
              className="flex-1 min-w-[120px] h-9 rounded-lg border-2 border-[var(--dark-500)] bg-[var(--dark-700)] px-3 text-sm text-[var(--brand-light)] focus:border-[var(--brand-primary)] focus:outline-none transition-colors"
              value={searchParams.get('verification_status') || ''} 
              onChange={e => updateUrl('verification_status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING">Pending</option>
              <option value="UNVERIFIED">Unverified</option>
            </select>
            
            {scope === 'SUPER' && (
              <select 
                className="flex-1 min-w-[140px] h-9 rounded-lg border-2 border-[var(--dark-500)] bg-[var(--dark-700)] px-3 text-sm text-[var(--brand-light)] focus:border-[var(--brand-primary)] focus:outline-none transition-colors"
                value={searchParams.get('municipality') || ''} 
                onChange={e => updateUrl('municipality', e.target.value)}
              >
                <option value="">All Municipalities</option>
                {municipalities.map(m => (
                  <option key={m.id} value={m.id.toString()}>{m.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {!isLoading && paginatedUsers.length > 0 && (
        <div className="px-4 sm:px-0">
          <p className="text-sm text-[var(--brand-light)]/50">
            Showing <span className="text-[var(--brand-primary)] font-semibold">{paginatedUsers.length}</span> of <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> guardians
          </p>
        </div>
      )}

      {/* Content */}
      {showSkeleton || isLoading ? (
        <GuardiansPageSkeleton />
      ) : paginatedUsers.length === 0 ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[var(--brand-light)]/30" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">No guardians found</h3>
          <p className="text-[var(--brand-light)]/50 text-sm mb-6">
            {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Get started by adding your first guardian.'}
          </p>
          {!hasActiveFilters && (
            <Link href={`${basePath}/create`}>
              <button className="inline-flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
                <Plus className="h-4 w-4" /> Add Guardian
              </button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {paginatedUsers.map((user, index) => (
              <SwipeableCard
                key={user.id}
                onClick={() => router.push(buildUrlWithParams(`${basePath}/${user.id}`))}
                onEdit={() => router.push(buildUrlWithParams(`${basePath}/edit/${user.id}`))}
                onDelete={() => setUserToDelete(user)}
              >
                <div className="border-y border-[var(--dark-600)] p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--dark-600)] border border-[var(--dark-500)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {user.avatar ? (
                        <img src={getMediaUrl(user.avatar) || ''} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-[var(--brand-primary)]">
                          {getInitials(user.first_name, user.last_name)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-[var(--brand-light)] truncate">
                        {user.first_name} {user.last_name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-[var(--brand-light)]/40" />
                        <p className="text-xs text-[var(--brand-light)]/50 truncate">{user.email}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClasses(user.verification_status)}`}>
                          {user.verification_status || 'UNVERIFIED'}
                        </span>
                        <span className="text-xs text-[var(--brand-light)]/50">
                          <span className="font-semibold text-[var(--brand-primary)]">{user.youth_members ? user.youth_members.length : 0}</span> youth connected
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
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Guardian</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Connected Youth</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user, index) => (
                  <tr 
                    key={user.id} 
                    className={`${index !== paginatedUsers.length - 1 ? 'border-b border-[var(--dark-600)]/50' : ''} hover:bg-[var(--dark-700)]/30 transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--dark-700)] border border-[var(--dark-500)] flex items-center justify-center overflow-hidden">
                          {user.avatar ? (
                            <img src={getMediaUrl(user.avatar) || ''} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-[var(--brand-primary)]">
                              {getInitials(user.first_name, user.last_name)}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--brand-light)]">{user.first_name} {user.last_name}</div>
                          <div className="text-xs text-[var(--brand-light)]/50">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClasses(user.verification_status)}`}>
                        {user.verification_status || 'UNVERIFIED'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-[var(--brand-primary)]">{user.youth_members ? user.youth_members.length : 0}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={buildUrlWithParams(`${basePath}/${user.id}`)}>
                          <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-primary)] hover:bg-[var(--dark-600)] transition-all">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <Link href={buildUrlWithParams(`${basePath}/edit/${user.id}`)}>
                          <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-blue)] hover:bg-[var(--dark-600)] transition-all">
                            <Edit className="w-4 h-4" />
                          </button>
                        </Link>
                        <button 
                          onClick={() => setUserToDelete(user)}
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
            <div className="flex items-center justify-center gap-2 py-4 px-4 sm:px-0">
              <button 
                disabled={currentPage === 1} 
                onClick={() => updateUrl('page', (currentPage - 1).toString())}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--dark-700)] border border-[var(--dark-500)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Prev
              </button>
              <div className="text-sm text-[var(--brand-light)]/70">
                Page <span className="font-bold text-[var(--brand-primary)]">{currentPage}</span> of {totalPages}
              </div>
              <button 
                disabled={currentPage >= totalPages} 
                onClick={() => updateUrl('page', (currentPage + 1).toString())}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--dark-700)] border border-[var(--dark-500)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isVisible={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Guardian"
        message={`Are you sure you want to delete ${userToDelete?.first_name} ${userToDelete?.last_name}? This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        variant="danger"
        darkMode={true}
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}
