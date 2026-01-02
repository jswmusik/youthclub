'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X, Users, UserPlus, UsersRound, CheckCircle2, Mail, Building, ChevronLeft, FileCheck, Clock, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '../../hooks/useToast';
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
  const t = useTranslations('guardianManager');
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
  const t = useTranslations('guardianManager');
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
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.guardian')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.connectedYouth')}</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
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
  const t = useTranslations('guardianManager');
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
  
  // Pending Verifications
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);
  const [pendingGuardianIds, setPendingGuardianIds] = useState<number[]>([]);
  
  // Toast State
  const { success, error, info, warning } = useToast();
  
  // Delete Confirmation Modal State
  const [userToDelete, setUserToDelete] = useState<any>(null);

  // --- LOAD DATA ---
  useEffect(() => {
    fetchDropdowns();
    fetchAllUsersForAnalytics();
    fetchPendingVerifications();
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

  const fetchPendingVerifications = async () => {
    try {
      const res = await api.get('/users/pending_verifications/');
      setPendingVerificationCount(res.data.pending_count || 0);
      setPendingGuardianIds(res.data.pending_guardian_ids || []);
    } catch (err) {
      console.error('Error fetching pending verifications:', err);
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

      const idDocStatus = searchParams.get('id_doc_status');
      if (idDocStatus) params.set('id_document_review_status', idDocStatus);
      
      const municipality = searchParams.get('municipality');
      if (municipality) params.set('municipality', municipality);
      
      const page = searchParams.get('page');
      if (page) params.set('page', page);
      
      const res = await api.get(`/users/?${params.toString()}`);
      
      let guardiansOnly: any[] = [];
      if (res.data.results) {
        guardiansOnly = res.data.results.filter((user: any) => user.role === 'GUARDIAN');
      } else {
        guardiansOnly = (Array.isArray(res.data) ? res.data : []).filter((user: any) => user.role === 'GUARDIAN');
      }

      // If filtering by id_doc_status=PENDING_REVIEW, also filter by pendingGuardianIds
      if (idDocStatus === 'PENDING_REVIEW' && pendingGuardianIds.length > 0) {
        guardiansOnly = guardiansOnly.filter((user: any) => pendingGuardianIds.includes(user.id));
      }
      
      setUsers(guardiansOnly);
      setTotalCount(res.data.count || guardiansOnly.length);
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
    const idDocStatus = searchParams.get('id_doc_status');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (status) params.set('verification_status', status);
    if (gender) params.set('legal_gender', gender);
    if (municipality) params.set('municipality', municipality);
    if (idDocStatus) params.set('id_doc_status', idDocStatus);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try { 
      await api.delete(`/users/${userToDelete.id}/`);
      setUserToDelete(null);
      fetchGuardians(); 
      fetchAllUsersForAnalytics(); 
    } 
    catch (err) { 
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
    searchParams.get('verification_status') || searchParams.get('municipality') || searchParams.get('id_doc_status');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
              <Users className="w-5 h-5 text-[var(--dark-900)]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
          </div>
          <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
        </div>
        <Link href={buildUrlWithParams(`${basePath}/create`)}>
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
            <Plus className="h-4 w-4" /> {t('addGuardian')}
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
              <h3 className="text-sm font-semibold text-[var(--brand-light)]">{t('analytics.title')}</h3>
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
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.totalGuardians')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_guardians}</div>
              </div>

              {/* Card 2: New Last 7 Days */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--dark-600)] flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-[var(--brand-blue)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.newLast7Days')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.new_last_7_days}</div>
              </div>

              {/* Card 3: Gender Breakdown */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--dark-600)] flex items-center justify-center">
                    <UsersRound className="h-5 w-5 text-[var(--brand-primary)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.gender')}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-light)]/50">{t('analytics.male')}</span>
                    <span className="font-semibold text-[var(--brand-light)]">{analytics.gender.male}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-light)]/50">{t('analytics.female')}</span>
                    <span className="font-semibold text-[var(--brand-light)]">{analytics.gender.female}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-light)]/50">{t('analytics.other')}</span>
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
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.verification')}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-light)]/50">{t('analytics.verified')}</span>
                    <span className="font-semibold text-[var(--brand-green)]">{analytics.verification.verified}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-light)]/50">{t('analytics.pending')}</span>
                    <span className="font-semibold text-[var(--brand-light)]">{analytics.verification.unverified_pending}</span>
                  </div>
                </div>
              </div>

              {/* Card 5: Pending ID Reviews (only show if there are pending reviews) */}
              {pendingVerificationCount > 0 && (
                <div 
                  className="bg-[var(--dark-700)] rounded-xl p-4 border-2 border-[var(--brand-peach)]/50 hover:border-[var(--brand-peach)] transition-all cursor-pointer animate-pulse-subtle"
                  onClick={() => updateUrl('id_doc_status', 'PENDING_REVIEW')}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)]/20 flex items-center justify-center relative">
                      <FileCheck className="h-5 w-5 text-[var(--brand-peach)]" />
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--brand-peach)] text-[var(--dark-900)] text-xs font-bold rounded-full flex items-center justify-center">
                        {pendingVerificationCount}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-peach)]">{t('analytics.idReviewsPending')}</span>
                  </div>
                  <p className="text-sm text-[var(--brand-light)]/70">
                    <span className="font-bold text-[var(--brand-peach)]">{pendingVerificationCount}</span> {t('analytics.guardiansAwaiting')}
                  </p>
                  <p className="text-xs text-[var(--brand-light)]/50 mt-1">{t('analytics.clickToFilter')}</p>
                </div>
              )}
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
              placeholder={t('filters.searchPlaceholder')} 
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
              <option value="">{t('filters.allGenders')}</option>
              <option value="MALE">{t('filters.male')}</option>
              <option value="FEMALE">{t('filters.female')}</option>
              <option value="OTHER">{t('filters.other')}</option>
            </select>
            
            <select 
              className="flex-1 min-w-[120px] h-9 rounded-lg border-2 border-[var(--dark-500)] bg-[var(--dark-700)] px-3 text-sm text-[var(--brand-light)] focus:border-[var(--brand-primary)] focus:outline-none transition-colors"
              value={searchParams.get('verification_status') || ''} 
              onChange={e => updateUrl('verification_status', e.target.value)}
            >
              <option value="">{t('filters.allStatuses')}</option>
              <option value="VERIFIED">{t('filters.verified')}</option>
              <option value="PENDING">{t('filters.pending')}</option>
              <option value="UNVERIFIED">{t('filters.unverified')}</option>
            </select>

            <select 
              className={`flex-1 min-w-[140px] h-9 rounded-lg border-2 px-3 text-sm focus:outline-none transition-colors ${
                searchParams.get('id_doc_status') === 'PENDING_REVIEW'
                  ? 'border-[var(--brand-peach)] bg-[var(--brand-peach)]/10 text-[var(--brand-peach)] focus:border-[var(--brand-peach)]'
                  : 'border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-light)] focus:border-[var(--brand-primary)]'
              }`}
              value={searchParams.get('id_doc_status') || ''} 
              onChange={e => updateUrl('id_doc_status', e.target.value)}
            >
              <option value="">{t('filters.allIdDocStatus')}</option>
              <option value="PENDING_REVIEW">{t('filters.pendingReview')}</option>
              <option value="APPROVED">{t('filters.approved')}</option>
              <option value="REJECTED">{t('filters.rejected')}</option>
              <option value="NOT_SUBMITTED">{t('filters.notSubmitted')}</option>
            </select>
            
            {scope === 'SUPER' && (
              <select 
                className="flex-1 min-w-[140px] h-9 rounded-lg border-2 border-[var(--dark-500)] bg-[var(--dark-700)] px-3 text-sm text-[var(--brand-light)] focus:border-[var(--brand-primary)] focus:outline-none transition-colors"
                value={searchParams.get('municipality') || ''} 
                onChange={e => updateUrl('municipality', e.target.value)}
              >
                <option value="">{t('filters.allMunicipalities')}</option>
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
            {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{paginatedUsers.length}</span> {t('statsBar.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> {t('statsBar.guardians')}
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
          <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.noGuardiansFound')}</h3>
          <p className="text-[var(--brand-light)]/50 text-sm mb-6">
            {hasActiveFilters ? t('emptyState.adjustFilters') : t('emptyState.addFirstGuardian')}
          </p>
          {!hasActiveFilters && (
            <Link href={buildUrlWithParams(`${basePath}/create`)}>
              <button className="inline-flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
                <Plus className="h-4 w-4" /> {t('addGuardian')}
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
                          {user.verification_status ? t(`statuses.${user.verification_status}`) : t('statuses.UNVERIFIED')}
                        </span>
                        {user.id_document_review_status === 'PENDING_REVIEW' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30">
                            <Clock className="w-3 h-3" />
                            {t('badges.idReview')}
                          </span>
                        )}
                        <span className="text-xs text-[var(--brand-light)]/50">
                          <span className="font-semibold text-[var(--brand-primary)]">{user.youth_members ? user.youth_members.length : 0}</span> {t('badges.youthConnected')}
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
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.guardian')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.connectedYouth')}</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
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
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClasses(user.verification_status)}`}>
                          {user.verification_status ? t(`statuses.${user.verification_status}`) : t('statuses.UNVERIFIED')}
                        </span>
                        {user.id_document_review_status === 'PENDING_REVIEW' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30" title="ID document pending review">
                            <Clock className="w-3 h-3" />
                            ID
                          </span>
                        )}
                      </div>
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
                {t('pagination.previous')}
              </button>
              <div className="text-sm text-[var(--brand-light)]/70">
                {t('pagination.page')} <span className="font-bold text-[var(--brand-primary)]">{currentPage}</span> {t('pagination.of')} {totalPages}
              </div>
              <button 
                disabled={currentPage >= totalPages} 
                onClick={() => updateUrl('page', (currentPage + 1).toString())}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:bg-[var(--dark-700)] border border-[var(--dark-500)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {t('pagination.next')}
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
        title={t('deleteModal.title')}
        message={`${t('deleteModal.message')} ${userToDelete?.first_name} ${userToDelete?.last_name}? ${t('deleteModal.cannotUndone')}`}
        confirmButtonText={t('deleteModal.delete')}
        cancelButtonText={t('deleteModal.cancel')}
        variant="danger"
        darkMode={true}
      />

      {/* Toast Notification */}
    </div>
  );
}
