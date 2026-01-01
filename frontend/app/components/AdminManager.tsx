'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { 
  Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, 
  Users, ShieldCheck, Building, Building2, Mail, ChevronLeft
} from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '../../hooks/useToast';

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
  const t = useTranslations('adminManager');
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

function AdminCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-2 mt-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminTableRowSkeleton() {
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
      <td className="px-6 py-4"><Skeleton className="h-6 w-28 rounded-full" /></td>
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

function AdminsPageSkeleton() {
  const t = useTranslations('adminManager');
  return (
    <>
      {/* Mobile Cards Skeleton */}
      <div className="flex flex-col gap-3 md:hidden">
        {[...Array(4)].map((_, i) => (
          <AdminCardSkeleton key={i} />
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--dark-600)]">
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.user')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.role')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.assignment')}</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <AdminTableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface AdminManagerProps {
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

interface Option { id: number; name: string; }

export default function AdminManager({ basePath, scope }: AdminManagerProps) {
  const t = useTranslations('adminManager');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [allAdmins, setAllAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Dropdowns
  const [municipalities, setMunicipalities] = useState<Option[]>([]);
  const [clubs, setClubs] = useState<Option[]>([]);
  
  // Analytics
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  // Delete
  const [adminToDelete, setAdminToDelete] = useState<any>(null);
  const { success, error, info, warning } = useToast();

  // Filter State
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || '');
  const [municipalityFilter, setMunicipalityFilter] = useState(searchParams.get('assigned_municipality') || '');
  const [clubFilter, setClubFilter] = useState(searchParams.get('assigned_club') || '');

  // Track initial values to detect actual user changes
  const initialSearchRef = useRef(searchParams.get('search') || '');
  const initialRoleRef = useRef(searchParams.get('role') || '');
  const initialMunicipalityRef = useRef(searchParams.get('assigned_municipality') || '');
  const initialClubRef = useRef(searchParams.get('assigned_club') || '');
  const hasUserChangedFilters = useRef(false);

  useEffect(() => {
    fetchDropdowns();
  }, []);

  // Debounced Search/Filter Update - only reset page when user actually changes filters
  useEffect(() => {
    const searchChanged = searchInput !== initialSearchRef.current;
    const roleChanged = roleFilter !== initialRoleRef.current;
    const municipalityChanged = municipalityFilter !== initialMunicipalityRef.current;
    const clubChanged = clubFilter !== initialClubRef.current;
    
    if (!searchChanged && !roleChanged && !municipalityChanged && !clubChanged && !hasUserChangedFilters.current) {
      return;
    }
    
    hasUserChangedFilters.current = true;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) params.set('search', searchInput); else params.delete('search');
      if (roleFilter) params.set('role', roleFilter); else params.delete('role');
      if (municipalityFilter) params.set('assigned_municipality', municipalityFilter); else params.delete('assigned_municipality');
      if (clubFilter) params.set('assigned_club', clubFilter); else params.delete('assigned_club');
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
      
      // Update refs to current values
      initialSearchRef.current = searchInput;
      initialRoleRef.current = roleFilter;
      initialMunicipalityRef.current = municipalityFilter;
      initialClubRef.current = clubFilter;
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, roleFilter, municipalityFilter, clubFilter, searchParams, pathname, router]);

  useEffect(() => {
    fetchAdmins();
  }, [searchParams]);

  const fetchDropdowns = async () => {
    try {
      if (scope === 'SUPER' || scope === 'MUNICIPALITY') {
        const muniRes = await api.get('/municipalities/');
        setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
      }
      const clubRes = await api.get('/clubs/?page_size=1000');
      setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();
    
    try {
      const rolesToFetch = ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN'];
      const search = searchParams.get('search') || '';
      const roleFilterParam = searchParams.get('role') || '';
      const municipalityFilterParam = searchParams.get('assigned_municipality') || '';
      const clubFilterParam = searchParams.get('assigned_club') || '';
      
      if (scope === 'SUPER') {
        const rolesToFetchFiltered = roleFilterParam && rolesToFetch.includes(roleFilterParam) 
          ? [roleFilterParam] 
          : rolesToFetch;
        
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (municipalityFilterParam) params.set('assigned_municipality', municipalityFilterParam);
        if (clubFilterParam) params.set('assigned_club', clubFilterParam);
        params.set('page_size', '1000');
        
        const promises = rolesToFetchFiltered.map(role => {
          const roleParams = new URLSearchParams(params);
          roleParams.set('role', role);
          return api.get(`/users/?${roleParams.toString()}`);
        });
        
        const results = await Promise.all(promises);
        
        let combinedAdmins: any[] = [];
        results.forEach(res => {
          const data = Array.isArray(res.data) ? res.data : res.data.results || [];
          combinedAdmins = combinedAdmins.concat(data);
        });
        
        setAllAdmins(combinedAdmins);
        setTotalCount(combinedAdmins.length);
      } else {
        const allowedRoles = scope === 'MUNICIPALITY' 
          ? ['MUNICIPALITY_ADMIN', 'CLUB_ADMIN']
          : ['CLUB_ADMIN'];
        
        const rolesToFetch = roleFilterParam && allowedRoles.includes(roleFilterParam)
          ? [roleFilterParam]
          : allowedRoles;
        
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (municipalityFilterParam) params.set('assigned_municipality', municipalityFilterParam);
        if (clubFilterParam) params.set('assigned_club', clubFilterParam);
        params.set('page_size', '1000');
        
        const promises = rolesToFetch.map(role => {
          const roleParams = new URLSearchParams(params);
          roleParams.set('role', role);
          return api.get(`/users/?${roleParams.toString()}`);
        });
        
        const results = await Promise.all(promises);
        
        let combinedAdmins: any[] = [];
        results.forEach(res => {
          const data = Array.isArray(res.data) ? res.data : res.data.results || [];
          combinedAdmins = combinedAdmins.concat(data);
        });
        
        setAllAdmins(combinedAdmins);
        setTotalCount(combinedAdmins.length);
      }
    } catch (err) {
      console.error(err);
      setAllAdmins([]);
      setTotalCount(0);
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      
      setTimeout(() => {
        setLoading(false);
        setShowSkeleton(false);
      }, remaining);
    }
  }, [searchParams, scope]);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const municipality = searchParams.get('assigned_municipality');
    const club = searchParams.get('assigned_club');
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    if (municipality) params.set('assigned_municipality', municipality);
    if (club) params.set('assigned_club', club);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const handleDelete = async () => {
    if (!adminToDelete) return;
    try {
      await api.delete(`/users/${adminToDelete.id}/`);
      success(t('toast.adminDeletedSuccessfully'));
      fetchAdmins();
    } catch (err) {
      error(t('toast.failedToDeleteAdmin'));
    } finally {
      setAdminToDelete(null);
    }
  };

  const getRoleBadgeClasses = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30';
      case 'MUNICIPALITY_ADMIN': return 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30';
      case 'CLUB_ADMIN': return 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30';
      default: return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
    }
  };

  const getInitials = (first?: string | null, last?: string | null) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || '?';
  };

  const getAssignment = (user: any) => {
    if (user.role === 'CLUB_ADMIN' && user.assigned_club) {
      const clubId = typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club;
      const club = clubs.find(c => c.id === clubId);
      return club?.name || t('assignment.clubAssigned');
    }
    if (user.role === 'MUNICIPALITY_ADMIN' && user.assigned_municipality) {
      const muniId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
      const municipality = municipalities.find(m => m.id === muniId);
      return municipality?.name || t('assignment.municipalityAssigned');
    }
    if (user.assigned_municipality) {
      const muniId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
      const municipality = municipalities.find(m => m.id === muniId);
      return municipality?.name || t('assignment.municipalityAssigned');
    }
    if (user.assigned_club) {
      const clubId = typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club;
      const club = clubs.find(c => c.id === clubId);
      return club?.name || t('assignment.clubAssigned');
    }
    return t('assignment.global');
  };

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      'SUPER_ADMIN': t('roles.SUPER_ADMIN'),
      'MUNICIPALITY_ADMIN': t('roles.MUNICIPALITY_ADMIN'),
      'CLUB_ADMIN': t('roles.CLUB_ADMIN'),
    };
    return roleMap[role] || role.replace(/_/g, ' ');
  };

  // Calculate analytics from allAdmins
  const analytics = {
    total_admins: allAdmins.length,
    super_admins: allAdmins.filter((u: any) => u.role === 'SUPER_ADMIN').length,
    municipality_admins: allAdmins.filter((u: any) => u.role === 'MUNICIPALITY_ADMIN').length,
    club_admins: allAdmins.filter((u: any) => u.role === 'CLUB_ADMIN').length,
  };

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAdmins = allAdmins.slice(startIndex, endIndex);

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

  const clearFilters = () => {
    setSearchInput('');
    setRoleFilter('');
    setMunicipalityFilter('');
    setClubFilter('');
    router.push(pathname);
  };

  const hasFilters = searchInput || roleFilter || municipalityFilter || clubFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
          </div>
          <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
        </div>
        <Link href={buildUrlWithParams(`${basePath}/create`)}>
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
            <Plus className="h-4 w-4" /> {t('addAdmin')}
          </button>
        </Link>
      </div>

      {/* Analytics Dashboard */}
      {!showSkeleton && (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          {/* Header */}
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
            <ChevronUp className={`h-4 w-4 text-[var(--brand-light)]/50 transition-transform duration-300 ${analyticsExpanded ? 'rotate-0' : 'rotate-180'}`} />
          </button>
          
          {/* Content */}
          <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
            <div className={`px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-2 ${
              scope === 'SUPER' ? 'sm:grid-cols-4' : 
              scope === 'MUNICIPALITY' ? 'sm:grid-cols-3' : 
              'sm:grid-cols-2'
            } gap-3 sm:gap-4`}>
              
              {/* Total Admins */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.total')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_admins}</div>
              </div>

              {/* Super Admins - Only show for SUPER scope */}
              {scope === 'SUPER' && (
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-red)]/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-red)] to-[var(--brand-peach)] flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.super')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-red)]">{analytics.super_admins}</div>
                </div>
              )}

              {/* Municipality Admins - Hide for CLUB scope */}
              {scope !== 'CLUB' && (
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center">
                      <Building className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.municipality')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.municipality_admins}</div>
                </div>
              )}

              {/* Club Admins */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-third)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('stats.club')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-third)]">{analytics.club_admins}</div>
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
              placeholder={t('filters.searchPlaceholder')} 
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
            {(scope === 'SUPER' || scope === 'MUNICIPALITY') && (
              <div className="w-full sm:w-[180px]">
                <select 
                  className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  style={selectArrowStyle}
                >
                  <option value="">{t('filters.allRoles')}</option>
                  {scope === 'SUPER' && <option value="SUPER_ADMIN">{t('filters.superAdmin')}</option>}
                  <option value="MUNICIPALITY_ADMIN">{t('filters.municipalityAdmin')}</option>
                  <option value="CLUB_ADMIN">{t('filters.clubAdmin')}</option>
                </select>
              </div>
            )}
            {scope === 'SUPER' && (
              <div className="w-full sm:w-[200px]">
                <select 
                  className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                  value={municipalityFilter}
                  onChange={e => {
                    setMunicipalityFilter(e.target.value);
                    setClubFilter('');
                  }}
                  style={selectArrowStyle}
                >
                  <option value="">{t('filters.allMunicipalities')}</option>
                  {municipalities.map(m => (
                    <option key={m.id} value={m.id.toString()}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
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
      {!showSkeleton && paginatedAdmins.length > 0 && (
        <div className="px-4 sm:px-0">
          <p className="text-sm text-[var(--brand-light)]/50">
            {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{paginatedAdmins.length}</span> {t('statsBar.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> {totalCount === 1 ? t('statsBar.admin') : t('statsBar.admins')}
          </p>
        </div>
      )}

      {/* Content */}
      {showSkeleton ? (
        <AdminsPageSkeleton />
      ) : paginatedAdmins.length === 0 ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[var(--brand-light)]/30" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.noAdminsFound')}</h3>
          <p className="text-[var(--brand-light)]/50 text-sm mb-6">
            {hasFilters ? t('emptyState.adjustFilters') : t('emptyState.getStarted')}
          </p>
          {!hasFilters && (
            <Link href={buildUrlWithParams(`${basePath}/create`)}>
              <button className="inline-flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
                <Plus className="h-4 w-4" /> {t('addAdmin')}
              </button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {paginatedAdmins.map((user, index) => (
              <SwipeableCard
                key={user.id}
                onClick={() => router.push(buildUrlWithParams(`${basePath}/${user.id}`))}
                onEdit={() => router.push(buildUrlWithParams(`${basePath}/edit/${user.id}`))}
                onDelete={() => setAdminToDelete(user)}
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
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadgeClasses(user.role)}`}>
                          {getRoleDisplay(user.role)}
                        </span>
                        <span className="text-xs text-[var(--brand-light)]/50">{getAssignment(user)}</span>
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
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.user')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.role')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.assignment')}</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAdmins.map((user, index) => (
                  <tr 
                    key={user.id} 
                    className={`${index !== paginatedAdmins.length - 1 ? 'border-b border-[var(--dark-600)]/50' : ''} hover:bg-[var(--dark-700)]/30 transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--dark-700)] border border-[var(--dark-500)] flex items-center justify-center overflow-hidden">
                          {user.avatar ? (
                            <img src={getMediaUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
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
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeClasses(user.role)}`}>
                        {getRoleDisplay(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--brand-light)]/60">{getAssignment(user)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={buildUrlWithParams(`${basePath}/${user.id}`)}>
                          <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <Link href={buildUrlWithParams(`${basePath}/edit/${user.id}`)}>
                          <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all">
                            <Edit className="w-4 h-4" />
                          </button>
                        </Link>
                        <button 
                          onClick={() => setAdminToDelete(user)}
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
        isVisible={!!adminToDelete}
        onClose={() => setAdminToDelete(null)}
        onConfirm={handleDelete}
        title={t('deleteModal.title')}
        message={t('deleteModal.message', { firstName: adminToDelete?.first_name || '', lastName: adminToDelete?.last_name || '' })}
        confirmButtonText={t('deleteModal.delete')}
        cancelButtonText={t('deleteModal.cancel')}
        variant="danger"
        darkMode={true}
      />
      </div>
  );
}
