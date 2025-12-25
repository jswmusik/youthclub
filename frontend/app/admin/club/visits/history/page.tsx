'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { visits } from '@/lib/api';
import Toast from '@/app/components/Toast';
import Link from 'next/link';
import { ArrowLeft, Search, X, Clock, LogIn, LogOut, Eye, History, ChevronLeft } from 'lucide-react';
import { getMediaUrl } from '@/app/utils';
import VisitsTabs from '@/app/components/visits/VisitsTabs';

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onClick: () => void;
}

function SwipeableCard({ children, onClick }: SwipeableCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const actionWidth = 70;
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

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
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
          onClick={handleViewClick}
          className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-blue)] text-white transition-all active:bg-[var(--brand-blue)]/80"
        >
          <Eye className="w-5 h-5" />
          <span className="text-xs font-medium">View</span>
        </button>
      </div>

      <div
        className="relative bg-[var(--dark-800)] transition-transform duration-200 ease-out cursor-pointer"
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

export default function VisitHistoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  // Extract club ID from user
  const assignedClub = user?.assigned_club;
  const clubId = typeof assignedClub === 'object' && assignedClub !== null 
    ? (assignedClub as any).id 
    : typeof assignedClub === 'number' 
    ? assignedClub 
    : null;
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'error',
    isVisible: false,
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const fetchHistory = async () => {
    if (!clubId) return;
    
    setLoading(true);
    try {
      const params: { search?: string; start_date?: string; end_date?: string; club_id?: string | number; page?: number } = {};
      const search = searchParams.get('search') || '';
      const startDate = searchParams.get('start_date') || '';
      const endDate = searchParams.get('end_date') || '';
      const guestFilter = searchParams.get('guest_filter') || '';
      const page = Number(searchParams.get('page')) || 1;
      
      if (search && search.trim()) params.search = search.trim();
      if (startDate && startDate.trim()) params.start_date = startDate.trim();
      if (endDate && endDate.trim()) params.end_date = endDate.trim();
      if (clubId) params.club_id = clubId;
      if (page > 1) params.page = page;
      
      const res = await visits.getHistory(params);
      let visitsData = res.data.results || res.data || [];
      const count = Array.isArray(res.data) ? visitsData.length : (res.data.count || visitsData.length);
      
      // Client-side filtering for guest status
      if (guestFilter === 'guests') {
        visitsData = visitsData.filter((visit: any) => visit.is_guest === true);
      } else if (guestFilter === 'members') {
        visitsData = visitsData.filter((visit: any) => visit.is_guest === false);
      }
      
      setData(visitsData);
      setTotalCount(count);
      setToast({ message: '', type: 'error', isVisible: false });
    } catch (error: any) {
      setToast({ 
        message: error.response?.data?.error || "Failed to load history", 
        type: 'error', 
        isVisible: true 
      });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clubId) {
      fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, clubId]);

  // Helper function to convert method to readable name
  const getMethodName = (method: string) => {
    switch (method) {
      case 'QR_KIOSK':
        return 'QR Kiosk Scan';
      case 'MANUAL_ADMIN':
        return 'Manual Admin Entry';
      case 'MANUAL_SELF':
        return 'Manual Self Check-in';
      default:
        return method || '-';
    }
  };

  // Helper function to get user initials
  const getInitials = (first?: string | null, last?: string | null) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || 'U';
  };
  
  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Convert clubId to string for VisitsTabs
  const clubIdString = clubId ? String(clubId) : '';

  const inputClasses = (field: string) => `
    w-full h-11 px-4 rounded-xl
    bg-[var(--dark-700)] border-2 
    ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
    text-[var(--brand-light)] placeholder-[var(--brand-light)]/30
    outline-none transition-all duration-200
    hover:border-[var(--brand-primary)]/50
    focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
  `;

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1rem'
  };

  return (
    <>
      <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-6 md:py-8 px-0">
        <div className="max-w-7xl mx-auto space-y-6 px-0 sm:px-6 lg:px-8">
          {/* Back Link */}
          <div>
            <Link href="/admin/club/details">
              <button className="flex items-center gap-2 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] transition-colors">
                <ArrowLeft className="h-4 w-4" /> 
                <span className="text-sm font-medium">Back to Club</span>
              </button>
            </Link>
          </div>

          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                  <History className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Visits & Attendance</h1>
              </div>
              <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">Archive of all check-ins and check-outs for your club.</p>
            </div>
          </div>

          {/* Tabs */}
          {clubIdString && (
            <VisitsTabs 
              clubId={clubIdString} 
              basePath="/admin/club"
              liveHref="/admin/club/visits"
              historyHref="/admin/club/visits/history"
              analyticsHref="/admin/club/visits/analytics"
            />
          )}

          {/* FILTERS */}
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] p-4 sm:p-6">
            <div className="space-y-4">
              {/* Main Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Search */}
                <div className="relative md:col-span-4 lg:col-span-3">
                  <label className="block text-xs sm:text-sm font-semibold text-[var(--brand-light)]/70 mb-1.5">Search</label>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40" style={{ marginTop: '0.75rem' }} />
                  <input 
                    type="text"
                    placeholder="Search by name or email..." 
                    className={`${inputClasses('search')} pl-10`}
                    value={searchParams.get('search') || ''}
                    onChange={e => updateUrl('search', e.target.value)}
                    onFocus={() => setFocusedField('search')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
                
                {/* Start Date */}
                <div className="md:col-span-2 lg:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-[var(--brand-light)]/70 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    className={inputClasses('start_date')}
                    value={searchParams.get('start_date') || ''}
                    onChange={e => updateUrl('start_date', e.target.value)}
                    onFocus={() => setFocusedField('start_date')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
                
                {/* End Date */}
                <div className="md:col-span-2 lg:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-[var(--brand-light)]/70 mb-1.5">End Date</label>
                  <input
                    type="date"
                    className={inputClasses('end_date')}
                    value={searchParams.get('end_date') || ''}
                    onChange={e => updateUrl('end_date', e.target.value)}
                    onFocus={() => setFocusedField('end_date')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
                
                {/* Member Type */}
                <div className="md:col-span-2 lg:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-[var(--brand-light)]/70 mb-1.5">Member Type</label>
                  <select 
                    className={`${inputClasses('guest_filter')} appearance-none cursor-pointer`}
                    style={selectArrowStyle}
                    value={searchParams.get('guest_filter') || ''}
                    onChange={e => updateUrl('guest_filter', e.target.value)}
                    onFocus={() => setFocusedField('guest_filter')}
                    onBlur={() => setFocusedField(null)}
                  >
                    <option value="">All Members</option>
                    <option value="members">Preferred Members</option>
                    <option value="guests">Guests</option>
                  </select>
                </div>
                
                {/* Clear Button */}
                <div className="md:col-span-2 lg:col-span-1">
                  <label className="block text-xs sm:text-sm font-semibold text-[var(--brand-light)]/70 mb-1.5 invisible">Clear</label>
                  <button
                    onClick={() => router.push(pathname)}
                    className="w-full h-11 px-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-red)] hover:border-[var(--brand-red)]/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <X className="h-4 w-4" /> Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          {!loading && data.length > 0 && (
            <div>
              <p className="text-sm text-[var(--brand-light)]/50">
                Showing <span className="text-[var(--brand-primary)] font-semibold">{data.length}</span> {data.length === 1 ? 'record' : 'records'}
              </p>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8">
              <div className="py-20 flex justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
                  <p className="text-[var(--brand-light)]/50 text-sm">Loading records...</p>
                </div>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8 sm:p-12">
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-[var(--brand-light)]/30" />
                </div>
                <p className="text-[var(--brand-light)]/50 font-medium">No records found</p>
                <p className="text-sm text-[var(--brand-light)]/30 mt-1">
                  {searchParams.get('search') || searchParams.get('start_date') || searchParams.get('end_date') || searchParams.get('guest_filter')
                    ? 'Try adjusting your filters.'
                    : 'No visit history available yet.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* MOBILE: Swipeable Cards */}
              <div className="flex flex-col gap-3 md:hidden">
                {data.map((visit: any) => {
                  const start = new Date(visit.check_in_at);
                  const checkOutAt = visit.check_out_at;
                  const hasCheckedOut = checkOutAt !== null && checkOutAt !== undefined && checkOutAt !== '';
                  
                  let duration: number | null = null;
                  let end: Date | null = null;
                  
                  if (hasCheckedOut) {
                    try {
                      end = new Date(checkOutAt);
                      if (!isNaN(end.getTime())) {
                        const diffMs = end.getTime() - start.getTime();
                        duration = Math.max(0, Math.round(diffMs / 60000));
                      }
                    } catch (e) {
                      console.error('Error parsing check_out_at date:', e);
                    }
                  }

                  const isGuest = visit.is_guest === true;
                  const userId = visit.user || visit.user_details?.id;
                  
                  return (
                    <SwipeableCard
                      key={visit.id}
                      onClick={() => {
                        if (userId) {
                          router.push(`/admin/club/youth/${userId}`);
                        }
                      }}
                    >
                      <div className="border-y border-[var(--dark-600)] p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-xl border-2 overflow-hidden flex-shrink-0 ${
                            isGuest ? 'border-[var(--brand-peach)]' : 'border-[var(--brand-primary)]'
                          }`}>
                            {visit.user_details?.avatar ? (
                              <img src={getMediaUrl(visit.user_details.avatar) || ''} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${
                                isGuest 
                                  ? 'bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-peach)]/80' 
                                  : 'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)]'
                              }`}>
                                <span className="text-sm font-bold text-white">
                                  {getInitials(visit.user_details?.first_name, visit.user_details?.last_name)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="font-semibold text-[var(--brand-light)] truncate">
                                {visit.user_details?.first_name} {visit.user_details?.last_name}
                              </span>
                              {isGuest && (
                                <span className="px-2 py-0.5 bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] rounded-lg text-[10px] font-medium">
                                  Guest
                                </span>
                              )}
                            </div>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-[var(--brand-light)]/50 uppercase font-semibold">Date</span>
                                <span className="text-[var(--brand-light)]/70">{start.toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-[var(--brand-light)]/50 uppercase font-semibold">Check-in</span>
                                <div className="flex items-center gap-1 text-[var(--brand-third)]">
                                  <LogIn className="h-3 w-3" />
                                  <span className="text-sm font-medium">{start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                              </div>
                              {end && !isNaN(end.getTime()) && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-[var(--brand-light)]/50 uppercase font-semibold">Check-out</span>
                                  <div className="flex items-center gap-1 text-[var(--brand-light)]/50">
                                    <LogOut className="h-3 w-3" />
                                    <span className="text-sm">{end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-[var(--brand-light)]/50 uppercase font-semibold">Duration</span>
                                {duration !== null ? (
                                  <div className="flex items-center gap-1 text-[var(--brand-light)]/70">
                                    <Clock className="h-3 w-3" />
                                    <span className="text-sm font-medium">{Math.floor(duration/60)}h {duration%60}m</span>
                                  </div>
                                ) : (
                                  <span className="px-2 py-0.5 bg-[var(--brand-third)]/20 text-[var(--brand-third)] rounded-lg text-xs font-medium">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-[var(--brand-light)]/50 uppercase font-semibold">Method</span>
                                <span className="text-sm text-[var(--brand-light)]/70">{getMethodName(visit.method)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SwipeableCard>
                  );
                })}
              </div>

              {/* DESKTOP: Table */}
              <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--dark-600)] bg-[var(--dark-700)]/30">
                      <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">Member</th>
                      <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">Date</th>
                      <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">In / Out</th>
                      <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">Duration</th>
                      <th className="h-12 px-6 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((visit: any) => {
                      const start = new Date(visit.check_in_at);
                      const checkOutAt = visit.check_out_at;
                      const hasCheckedOut = checkOutAt !== null && checkOutAt !== undefined && checkOutAt !== '';
                      
                      let duration: number | null = null;
                      let end: Date | null = null;
                      
                      if (hasCheckedOut) {
                        try {
                          end = new Date(checkOutAt);
                          if (!isNaN(end.getTime())) {
                            const diffMs = end.getTime() - start.getTime();
                            duration = Math.max(0, Math.round(diffMs / 60000));
                          }
                        } catch (e) {
                          console.error('Error parsing check_out_at date:', e);
                        }
                      }

                      const isGuest = visit.is_guest === true;
                      const userId = visit.user || visit.user_details?.id;
                      
                      return (
                        <tr 
                          key={visit.id} 
                          className={`border-b border-[var(--dark-600)]/50 hover:bg-[var(--dark-700)]/30 transition-colors ${isGuest ? 'bg-[var(--brand-peach)]/5' : ''}`}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl border-2 overflow-hidden flex-shrink-0 ${
                                isGuest ? 'border-[var(--brand-peach)]' : 'border-[var(--brand-primary)]'
                              }`}>
                                {visit.user_details?.avatar ? (
                                  <img src={getMediaUrl(visit.user_details.avatar) || ''} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className={`w-full h-full flex items-center justify-center ${
                                    isGuest 
                                      ? 'bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-peach)]/80' 
                                      : 'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)]'
                                  }`}>
                                    <span className="text-xs font-bold text-white">
                                      {getInitials(visit.user_details?.first_name, visit.user_details?.last_name)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {userId ? (
                                  <Link 
                                    href={`/admin/club/youth/${userId}`}
                                    className="font-semibold text-[var(--brand-light)] hover:text-[var(--brand-primary)] hover:underline transition-colors"
                                  >
                                    {visit.user_details?.first_name} {visit.user_details?.last_name}
                                  </Link>
                                ) : (
                                  <span className="font-semibold text-[var(--brand-light)]">{visit.user_details?.first_name} {visit.user_details?.last_name}</span>
                                )}
                                {isGuest && (
                                  <span className="px-2 py-0.5 bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] rounded-lg text-[10px] font-medium">
                                    Guest
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-[var(--brand-light)]/70">
                            {start.toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-[var(--brand-third)]">
                                <LogIn className="h-3 w-3" />
                                <span className="text-sm font-medium">{start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                              </div>
                              {end && !isNaN(end.getTime()) && (
                                <div className="flex items-center gap-1 text-[var(--brand-light)]/50">
                                  <LogOut className="h-3 w-3" />
                                  <span className="text-sm">{end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {duration !== null ? (
                              <div className="flex items-center gap-1 text-[var(--brand-light)]/70">
                                <Clock className="h-3 w-3" />
                                <span className="text-sm font-medium">{Math.floor(duration/60)}h {duration%60}m</span>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 bg-[var(--brand-third)]/20 text-[var(--brand-third)] rounded-lg text-xs font-medium">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-sm text-[var(--brand-light)]/70">
                            {getMethodName(visit.method)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => updateUrl('page', (currentPage - 1).toString())}
                    className="px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Prev
                  </button>
                  <div className="text-sm text-[var(--brand-light)]/50">Page {currentPage} of {totalPages}</div>
                  <button 
                    disabled={currentPage >= totalPages} 
                    onClick={() => updateUrl('page', (currentPage + 1).toString())}
                    className="px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
        darkMode
      />
    </>
  );
}
