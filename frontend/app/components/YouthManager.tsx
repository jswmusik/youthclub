'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { 
  Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X,
  Users, Building, UserPlus, UsersRound, CheckCircle2, Mail, ChevronLeft
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
  const t = useTranslations('youthManager');
  const [isOpen, setIsOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const actionWidth = 140; // Width of the action buttons area
  const threshold = 50; // Minimum swipe distance to trigger open/close

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = startX - e.touches[0].clientX;
    // Only allow swiping left (positive diff) or closing (negative diff when open)
    if (isOpen) {
      // When open, allow swiping right to close
      const newX = Math.max(-actionWidth, Math.min(0, -actionWidth + (startX - e.touches[0].clientX) * -1));
      setCurrentX(newX);
    } else {
      // When closed, only allow swiping left to open
      const newX = Math.max(-actionWidth, Math.min(0, -diff));
      setCurrentX(newX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Determine if we should snap open or closed
    if (isOpen) {
      if (currentX > -actionWidth + threshold) {
        // Close it
        setIsOpen(false);
        setCurrentX(0);
      } else {
        // Keep it open
        setCurrentX(-actionWidth);
      }
    } else {
      if (currentX < -threshold) {
        // Open it
        setIsOpen(true);
        setCurrentX(-actionWidth);
      } else {
        // Keep it closed
        setCurrentX(0);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only navigate if the card is not swiped open and we didn't just finish dragging
    if (!isOpen && Math.abs(currentX) < 5) {
      onClick();
    } else if (isOpen) {
      // Close the card when tapping on it while open
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

  // Close when clicking outside
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

function YouthCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-2 mt-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function YouthTableRowSkeleton() {
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

function YouthPageSkeleton() {
  const t = useTranslations('youthManager');
  return (
    <>
      {/* Mobile Cards Skeleton */}
      <div className="flex flex-col gap-3 md:hidden">
        {[...Array(4)].map((_, i) => (
          <YouthCardSkeleton key={i} />
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--dark-600)]">
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.user')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.gradeAge')}</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <YouthTableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface YouthManagerProps {
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function YouthManager({ basePath, scope }: YouthManagerProps) {
  const t = useTranslations('youthManager');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allUsersForAnalytics, setAllUsersForAnalytics] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  // Dropdowns
  const [interests, setInterests] = useState<any[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  
  // Delete
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const { success, error, info, warning } = useToast();

  // Filter State
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [genderFilter, setGenderFilter] = useState(searchParams.get('legal_gender') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('verification_status') || '');
  const [municipalityFilter, setMunicipalityFilter] = useState(searchParams.get('municipality') || '');
  const [clubFilter, setClubFilter] = useState(searchParams.get('preferred_club') || '');

  // Track initial values to detect actual user changes
  const initialSearchRef = useRef(searchParams.get('search') || '');
  const initialGenderRef = useRef(searchParams.get('legal_gender') || '');
  const initialStatusRef = useRef(searchParams.get('verification_status') || '');
  const initialMunicipalityRef = useRef(searchParams.get('municipality') || '');
  const initialClubRef = useRef(searchParams.get('preferred_club') || '');
  const hasUserChangedFilters = useRef(false);

  useEffect(() => {
    fetchDropdowns();
    fetchAllUsersForAnalytics();
  }, []);

  // Sync filter state from URL params on mount or external navigation (back/forward)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    const urlGender = searchParams.get('legal_gender') || '';
    const urlStatus = searchParams.get('verification_status') || '';
    const urlMunicipality = searchParams.get('municipality') || '';
    const urlClub = searchParams.get('preferred_club') || '';
    
    // Only update if URL params differ from current state (external navigation)
    if (urlSearch !== searchInput || urlGender !== genderFilter || urlStatus !== statusFilter || urlMunicipality !== municipalityFilter || urlClub !== clubFilter) {
      setSearchInput(urlSearch);
      setGenderFilter(urlGender);
      setStatusFilter(urlStatus);
      setMunicipalityFilter(urlMunicipality);
      setClubFilter(urlClub);
      // Update refs to match URL
      initialSearchRef.current = urlSearch;
      initialGenderRef.current = urlGender;
      initialStatusRef.current = urlStatus;
      initialMunicipalityRef.current = urlMunicipality;
      initialClubRef.current = urlClub;
      hasUserChangedFilters.current = false;
    }
  }, [searchParams]);

  // Debounced Search/Filter Update - only update URL when user actually changes filters
  useEffect(() => {
    const searchChanged = searchInput !== initialSearchRef.current;
    const genderChanged = genderFilter !== initialGenderRef.current;
    const statusChanged = statusFilter !== initialStatusRef.current;
    const municipalityChanged = municipalityFilter !== initialMunicipalityRef.current;
    const clubChanged = clubFilter !== initialClubRef.current;
    
    if (!searchChanged && !genderChanged && !statusChanged && !municipalityChanged && !clubChanged) {
      return;
    }
    
    hasUserChangedFilters.current = true;

    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchInput) params.set('search', searchInput);
      if (genderFilter) params.set('legal_gender', genderFilter);
      if (statusFilter) params.set('verification_status', statusFilter);
      if (municipalityFilter) params.set('municipality', municipalityFilter);
      if (clubFilter) params.set('preferred_club', clubFilter);
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
      
      // Update refs to current values
      initialSearchRef.current = searchInput;
      initialGenderRef.current = genderFilter;
      initialStatusRef.current = statusFilter;
      initialMunicipalityRef.current = municipalityFilter;
      initialClubRef.current = clubFilter;
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, genderFilter, statusFilter, municipalityFilter, clubFilter, pathname, router]);

  useEffect(() => {
    fetchYouth();
  }, [searchParams]);

  const fetchDropdowns = async () => {
    try {
      const [interestRes, muniRes, clubRes] = await Promise.all([
        api.get('/interests/'),
        scope === 'SUPER' ? api.get('/municipalities/') : Promise.resolve({ data: [] }),
        api.get('/clubs/?page_size=1000')
      ]);
      
      setInterests(Array.isArray(interestRes.data) ? interestRes.data : interestRes.data.results || []);
      setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
      setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
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
        params.set('role', 'YOUTH_MEMBER');
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/users/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) break;
        
        let pageUsers: any[] = [];
        
        if (Array.isArray(responseData)) {
          pageUsers = responseData;
          allUsers = [...allUsers, ...pageUsers];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageUsers = responseData.results;
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

  const fetchYouth = useCallback(async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();

    try {
      const params = new URLSearchParams();
      params.set('role', 'YOUTH_MEMBER');
      
      const search = searchParams.get('search') || '';
      const status = searchParams.get('verification_status') || '';
      const gender = searchParams.get('legal_gender') || '';
      const ageFrom = searchParams.get('age_from') || '';
      const ageTo = searchParams.get('age_to') || '';
      const gradeFrom = searchParams.get('grade_from') || '';
      const gradeTo = searchParams.get('grade_to') || '';
      const interest = searchParams.get('interest') || '';
      const municipality = searchParams.get('municipality') || '';
      const club = searchParams.get('preferred_club') || '';
      const birthdayToday = searchParams.get('birthday_today') || '';
      const page = searchParams.get('page') || '1';
      
      if (search) params.set('search', search);
      if (status) params.set('verification_status', status);
      if (gender) params.set('legal_gender', gender);
      if (ageFrom) params.set('age_from', ageFrom);
      if (ageTo) params.set('age_to', ageTo);
      if (gradeFrom) params.set('grade_from', gradeFrom);
      if (gradeTo) params.set('grade_to', gradeTo);
      if (municipality) params.set('municipality', municipality);
      if (club) params.set('preferred_club', club);
      
      params.set('page', page);
      params.set('page_size', '10');

      const res = await api.get(`/users/?${params.toString()}`);
      let usersData = Array.isArray(res.data) ? res.data : res.data.results || [];
      
      if (birthdayToday === 'true') {
        const today = new Date();
        const todayMonth = today.getMonth() + 1;
        const todayDay = today.getDate();
        usersData = usersData.filter((u: any) => {
          if (!u.date_of_birth) return false;
          const dob = new Date(u.date_of_birth);
          return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDay;
        });
      }
      
      if (interest) {
        const interestId = parseInt(interest);
        usersData = usersData.filter((u: any) => {
          const userInterests = u.interests || [];
          return userInterests.some((i: any) => {
            const id = typeof i === 'object' ? i.id : i;
            return id === interestId;
          });
        });
      }
      
      setAllUsers(usersData);
      const count = Array.isArray(res.data) ? usersData.length : (res.data.count || usersData.length);
      setTotalCount(count);
    } catch (err) {
      console.error(err);
      setAllUsers([]);
      setTotalCount(0);
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      
      setTimeout(() => {
        setLoading(false);
        setShowSkeleton(false);
      }, remaining);
    }
  }, [searchParams]);

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const status = searchParams.get('verification_status');
    const gender = searchParams.get('legal_gender');
    const ageFrom = searchParams.get('age_from');
    const ageTo = searchParams.get('age_to');
    const gradeFrom = searchParams.get('grade_from');
    const gradeTo = searchParams.get('grade_to');
    const interest = searchParams.get('interest');
    const municipality = searchParams.get('municipality');
    const club = searchParams.get('preferred_club');
    const birthdayToday = searchParams.get('birthday_today');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (status) params.set('verification_status', status);
    if (gender) params.set('legal_gender', gender);
    if (ageFrom) params.set('age_from', ageFrom);
    if (ageTo) params.set('age_to', ageTo);
    if (gradeFrom) params.set('grade_from', gradeFrom);
    if (gradeTo) params.set('grade_to', gradeTo);
    if (interest) params.set('interest', interest);
    if (municipality) params.set('municipality', municipality);
    if (club) params.set('preferred_club', club);
    if (birthdayToday) params.set('birthday_today', birthdayToday);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const clearFilters = () => {
    setSearchInput('');
    setGenderFilter('');
    setStatusFilter('');
    setMunicipalityFilter('');
    setClubFilter('');
    router.push(pathname);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/users/${userToDelete.id}/`);
      success(t('toast.memberDeleted'));
      fetchYouth();
      fetchAllUsersForAnalytics();
    } catch (err) {
      error(t('toast.failedToDelete'));
    } finally {
      setUserToDelete(null);
    }
  };

  const getInitials = (first?: string | null, last?: string | null) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || '?';
  };

  const calculateAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30';
      case 'PENDING': return 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30';
      case 'UNVERIFIED': return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30';
      default: return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
    }
  };

  const getClubName = (user: any) => {
    if (!user.preferred_club) return t('noClub');
    const clubId = typeof user.preferred_club === 'object' ? user.preferred_club.id : user.preferred_club;
    const club = clubs.find(c => c.id === clubId);
    return club?.name || t('noClub');
  };

  const getGenderDisplay = (gender: string) => {
    if (gender === 'MALE') return t('genders.MALE');
    if (gender === 'FEMALE') return t('genders.FEMALE');
    if (gender === 'OTHER') return t('genders.OTHER');
    return gender;
  };

  const getStatusDisplay = (status: string) => {
    if (status === 'VERIFIED') return t('statuses.VERIFIED');
    if (status === 'PENDING') return t('statuses.PENDING');
    if (status === 'UNVERIFIED') return t('statuses.UNVERIFIED');
    return status;
  };

  // Calculate analytics from allUsersForAnalytics
  const analytics = {
    total_youth: allUsersForAnalytics.length,
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

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedUsers = allUsers;

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

  const hasFilters = searchInput || genderFilter || statusFilter || municipalityFilter || clubFilter ||
    searchParams.get('age_from') || searchParams.get('age_to') ||
    searchParams.get('grade_from') || searchParams.get('grade_to') ||
    searchParams.get('interest') || searchParams.get('birthday_today');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
          </div>
          <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
        </div>
        <Link href={buildUrlWithParams(`${basePath}/create`)}>
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
            <Plus className="h-4 w-4" /> {t('addYouth')}
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
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Total Youth */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center">
                    <Users className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('total')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_youth}</div>
              </div>

              {/* New Last 7 Days */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('newLast7Days')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.new_last_7_days}</div>
              </div>

              {/* Gender Breakdown */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)] flex items-center justify-center">
                    <UsersRound className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('gender')}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-light)]/60">{t('genderBreakdown')}</span>
                    <span className="font-semibold text-[var(--brand-light)]">{analytics.gender.male}/{analytics.gender.female}/{analytics.gender.other}</span>
                  </div>
                </div>
              </div>

              {/* Verification Status */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('verified')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{analytics.verification.verified}</div>
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
            <div className="w-full sm:w-[160px]">
              <select 
                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                value={genderFilter}
                onChange={e => setGenderFilter(e.target.value)}
                style={selectArrowStyle}
              >
                <option value="">{t('filters.allGenders')}</option>
                <option value="MALE">{t('genders.MALE')}</option>
                <option value="FEMALE">{t('genders.FEMALE')}</option>
                <option value="OTHER">{t('genders.OTHER')}</option>
              </select>
            </div>
            <div className="w-full sm:w-[160px]">
              <select 
                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={selectArrowStyle}
              >
                <option value="">{t('filters.allStatuses')}</option>
                <option value="VERIFIED">{t('statuses.VERIFIED')}</option>
                <option value="PENDING">{t('statuses.PENDING')}</option>
                <option value="UNVERIFIED">{t('statuses.UNVERIFIED')}</option>
              </select>
            </div>
            {scope === 'SUPER' && (
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
      {!showSkeleton && paginatedUsers.length > 0 && (
        <div className="px-4 sm:px-0">
          <p className="text-sm text-[var(--brand-light)]/50">
            {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{paginatedUsers.length}</span> {t('statsBar.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> {totalCount === 1 ? t('statsBar.member') : t('statsBar.members')}
          </p>
        </div>
      )}

      {/* Content */}
      {showSkeleton ? (
        <YouthPageSkeleton />
      ) : paginatedUsers.length === 0 ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[var(--brand-light)]/30" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.noMembersFound')}</h3>
          <p className="text-[var(--brand-light)]/50 text-sm mb-6">
            {hasFilters ? t('emptyState.adjustFilters') : t('emptyState.addFirstMember')}
          </p>
          {!hasFilters && (
            <Link href={buildUrlWithParams(`${basePath}/create`)}>
              <button className="inline-flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
                <Plus className="h-4 w-4" /> {t('addYouth')}
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
                    {/* Left: Avatar and Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
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
                          <Building className="w-3 h-3 text-[var(--brand-light)]/40" />
                          <p className="text-xs text-[var(--brand-light)]/50 truncate">{getClubName(user)}</p>
                        </div>
                        {/* Status & Grade/Age - Inline */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClasses(user.verification_status)}`}>
                            {getStatusDisplay(user.verification_status)}
                          </span>
                          {user.grade && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]">
                              {t('grade')} {user.grade}
                            </span>
                          )}
                          {user.date_of_birth && calculateAge(user.date_of_birth) !== null && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
                              {calculateAge(user.date_of_birth)}{t('yearsShort')}
                            </span>
                          )}
                        </div>
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
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.gradeAge')}</th>
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
                            <img src={getMediaUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-[var(--brand-primary)]">
                              {getInitials(user.first_name, user.last_name)}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--brand-light)]">{user.first_name} {user.last_name}</div>
                          <div className="text-xs text-[var(--brand-light)]/50 flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {getClubName(user)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClasses(user.verification_status)}`}>
                        {getStatusDisplay(user.verification_status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {user.grade && (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]">
                            {t('grade')} {user.grade}
                          </span>
                        )}
                        {user.date_of_birth && calculateAge(user.date_of_birth) !== null && (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
                            {calculateAge(user.date_of_birth)} {t('years')}
                          </span>
                        )}
                        {!user.grade && (!user.date_of_birth || calculateAge(user.date_of_birth) === null) && (
                          <span className="text-[var(--brand-light)]/30">—</span>
                        )}
                      </div>
                    </td>
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
        isVisible={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDelete}
        title={t('deleteModal.title')}
        message={t('deleteModal.message', { firstName: userToDelete?.first_name || '', lastName: userToDelete?.last_name || '' })}
        confirmButtonText={t('deleteModal.delete')}
        cancelButtonText={t('deleteModal.cancel')}
        variant="danger"
        darkMode={true}
      />
      </div>
  );
}
