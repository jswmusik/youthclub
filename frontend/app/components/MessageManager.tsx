'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, BarChart3, ChevronUp, Trash2, X, MessageSquare, Info, AlertTriangle, AlertCircle, ChevronLeft, Calendar, Users } from 'lucide-react';
import api from '../../lib/api';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { useToast } from '../../hooks/useToast';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  onClick: () => void;
  deleteText: string;
}

function SwipeableCard({ children, onDelete, onClick, deleteText }: SwipeableCardProps) {
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
          onClick={handleDeleteClick}
          className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-red)] text-white transition-all active:bg-[var(--brand-red)]/80"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs font-medium">{deleteText}</span>
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

function MessageCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <div className="flex items-center gap-2 mt-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
      <td className="px-6 py-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
      <td className="px-6 py-4"><div className="flex justify-end"><Skeleton className="w-9 h-9 rounded-lg" /></div></td>
    </tr>
  );
}

function MessagePageSkeleton() {
  return (
    <>
      {/* Mobile Cards Skeleton */}
      <div className="flex flex-col gap-3 md:hidden">
        {[...Array(4)].map((_, i) => (
          <MessageCardSkeleton key={i} />
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--dark-600)]">
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70"><Skeleton className="h-4 w-16" /></th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70"><Skeleton className="h-4 w-24" /></th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70"><Skeleton className="h-4 w-20" /></th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70"><Skeleton className="h-4 w-20" /></th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70"><Skeleton className="h-4 w-16" /></th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <MessageTableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface MessageManagerProps {
  basePath: string;
}

export default function MessageManager({ basePath }: MessageManagerProps) {
  const t = useTranslations('systemMessages');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [allMessagesForAnalytics, setAllMessagesForAnalytics] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  // Filter State
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('message_type') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  
  // Track initial values to detect actual user changes
  const initialSearchRef = useRef(searchParams.get('search') || '');
  const initialTypeRef = useRef(searchParams.get('message_type') || '');
  const initialStatusRef = useRef(searchParams.get('status') || '');
  const hasUserChangedFilters = useRef(false);
  
  // Delete State
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const { success, error, info, warning } = useToast();

  // Build URL with current params preserved
  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const messageType = searchParams.get('message_type');
    const status = searchParams.get('status');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (messageType) params.set('message_type', messageType);
    if (status) params.set('status', status);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  useEffect(() => {
    fetchAllMessagesForAnalytics();
  }, []);

  // Debounced Search/Filter Update - only reset page when user actually changes filters
  useEffect(() => {
    const searchChanged = searchInput !== initialSearchRef.current;
    const typeChanged = typeFilter !== initialTypeRef.current;
    const statusChanged = statusFilter !== initialStatusRef.current;
    
    if (!searchChanged && !typeChanged && !statusChanged && !hasUserChangedFilters.current) {
      return;
    }
    
    hasUserChangedFilters.current = true;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) params.set('search', searchInput); else params.delete('search');
      if (typeFilter) params.set('message_type', typeFilter); else params.delete('message_type');
      if (statusFilter) params.set('status', statusFilter); else params.delete('status');
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
      
      // Update refs to current values
      initialSearchRef.current = searchInput;
      initialTypeRef.current = typeFilter;
      initialStatusRef.current = statusFilter;
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, typeFilter, statusFilter, searchParams, pathname, router]);

  useEffect(() => {
    fetchMessages();
  }, [searchParams]);

  const fetchAllMessagesForAnalytics = async () => {
    try {
      let allMessages: any[] = [];
      let page = 1;
      let totalCount = 0;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/messages/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) break;
        
        let pageMessages: any[] = [];
        
        if (Array.isArray(responseData)) {
          pageMessages = responseData;
          allMessages = [...allMessages, ...pageMessages];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageMessages = responseData.results;
          allMessages = [...allMessages, ...pageMessages];
          
          if (page === 1) {
            totalCount = responseData.count || 0;
          }
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allMessages.length >= totalCount;
          const gotEmptyPage = pageMessages.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) break;
          page++;
        } else {
          break;
        }
      }
      
      setAllMessagesForAnalytics(allMessages);
    } catch (err) {
      console.error('Error fetching messages for analytics:', err);
      setAllMessagesForAnalytics([]);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();

    try {
      const page = searchParams.get('page') || '1';
      const search = searchParams.get('search') || '';
      const messageType = searchParams.get('message_type') || '';
      const status = searchParams.get('status') || '';
      
      const hasFilters = search || messageType || status;
      
      let allMessages: any[] = [];
      
      if (hasFilters) {
        let currentPage = 1;
        const pageSize = 100;
        const maxPages = 100;
        
        while (currentPage <= maxPages) {
          const params = new URLSearchParams();
          params.set('page', currentPage.toString());
          params.set('page_size', pageSize.toString());
          
          const res: any = await api.get(`/messages/?${params.toString()}`);
          const responseData: any = res?.data;
          
          if (!responseData) break;
          
          let pageMessages: any[] = [];
          
          if (Array.isArray(responseData)) {
            pageMessages = responseData;
            allMessages = [...allMessages, ...pageMessages];
            break;
          } else if (responseData.results && Array.isArray(responseData.results)) {
            pageMessages = responseData.results;
            allMessages = [...allMessages, ...pageMessages];
            
            const hasNext = responseData.next !== null && responseData.next !== undefined;
            if (!hasNext || pageMessages.length === 0) break;
            
            currentPage++;
          } else {
            break;
          }
        }
      } else {
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('page_size', '10');
        
        const res = await api.get(`/messages/?${params.toString()}`);
        allMessages = Array.isArray(res.data) ? res.data : res.data.results || [];
        const count = Array.isArray(res.data) ? allMessages.length : (res.data.count || allMessages.length);
        setTotalCount(count);
      }
      
      let messagesData = allMessages;
      
      // Apply message_type filter
      if (messageType) {
        messagesData = messagesData.filter((msg: any) => msg.message_type === messageType);
      }
      
      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        messagesData = messagesData.filter((msg: any) => {
          const titleMatch = msg.title?.toLowerCase().includes(searchLower);
          const messageMatch = msg.message?.toLowerCase().includes(searchLower);
          return titleMatch || messageMatch;
        });
      }
      
      // Apply status filter
      if (status) {
        const now = new Date();
        messagesData = messagesData.filter((msg: any) => {
          if (!msg.expires_at) return false;
          const expiresAt = new Date(msg.expires_at);
          if (status === 'active') {
            return expiresAt > now;
          } else if (status === 'expired') {
            return expiresAt <= now;
          }
          return true;
        });
      }
      
      const totalFiltered = messagesData.length;
      
      if (hasFilters) {
        const pageSize = 10;
        const startIndex = (Number(page) - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        messagesData = messagesData.slice(startIndex, endIndex);
        setTotalCount(totalFiltered);
      }
      
      setMessages(messagesData);
    } catch (err) {
      console.error(err);
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
    setTypeFilter('');
    setStatusFilter('');
    router.push(pathname);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/messages/${itemToDelete.id}/`);
      success(t('toasts.deleteSuccess'));
      fetchMessages();
      fetchAllMessagesForAnalytics();
    } catch (err) {
      error(t('toasts.deleteFailed'));
    } finally {
      setItemToDelete(null);
    }
  };

  // Calculate analytics
  const analytics = {
    total: allMessagesForAnalytics.length,
    info: allMessagesForAnalytics.filter((m: any) => m.message_type === 'INFO').length,
    important: allMessagesForAnalytics.filter((m: any) => m.message_type === 'IMPORTANT').length,
    warning: allMessagesForAnalytics.filter((m: any) => m.message_type === 'WARNING').length,
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'INFO': return <Info className="w-5 h-5 text-white" />;
      case 'IMPORTANT': return <AlertCircle className="w-5 h-5 text-white" />;
      case 'WARNING': return <AlertTriangle className="w-5 h-5 text-white" />;
      default: return <MessageSquare className="w-5 h-5 text-white" />;
    }
  };

  const getTypeStyle = (type: string) => {
    switch(type) {
      case 'INFO': return {
        badge: 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30',
        icon: 'from-[var(--brand-blue)] to-[var(--brand-purple)]'
      };
      case 'IMPORTANT': return {
        badge: 'bg-[var(--brand-yellow)]/20 text-[var(--brand-yellow)] border-[var(--brand-yellow)]/30',
        icon: 'from-[var(--brand-yellow)] to-[var(--brand-peach)]'
      };
      case 'WARNING': return {
        badge: 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30',
        icon: 'from-[var(--brand-red)] to-[var(--brand-peach)]'
      };
      default: return {
        badge: 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30',
        icon: 'from-[var(--brand-primary)] to-[var(--brand-purple)]'
      };
    }
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      'PUBLIC': t('roles.public'),
      'SUPER_ADMIN': t('roles.superAdmin'),
      'MUNICIPALITY_ADMIN': t('roles.municipalityAdmin'),
      'CLUB_ADMIN': t('roles.clubAdmin'),
      'YOUTH_MEMBER': t('roles.youthMember'),
      'GUARDIAN': t('roles.guardian'),
      'ALL': t('roles.allUsers')
    };
    return roleMap[role] || role;
  };

  const formatTargetRoles = (roles: string[]) => {
    if (roles.includes("ALL")) return t('roles.allUsers');
    return roles.map(role => getRoleLabel(role)).join(", ");
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) <= new Date();
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

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1rem'
  };

  const hasFilters = searchInput || typeFilter || statusFilter;

  return (
    <div className="min-h-screen bg-[var(--dark-900)] p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('subtitle')}</p>
          </div>
          <Link href={buildUrlWithParams(`${basePath}/create`)}>
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-2.5 transition-all text-sm">
              <Plus className="h-4 w-4" /> {t('createMessage')}
            </button>
          </Link>
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
                <h3 className="text-sm font-semibold text-[var(--brand-light)]">{t('analytics.title')}</h3>
              </div>
              <ChevronUp className={`h-4 w-4 text-[var(--brand-light)]/50 transition-transform duration-300 ${analyticsExpanded ? 'rotate-0' : 'rotate-180'}`} />
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
              <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                
                {/* Total Messages */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border-l-4 border-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-[var(--dark-900)]" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.total')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total}</div>
                </div>

                {/* Information */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border-l-4 border-[var(--brand-blue)] hover:border-[var(--brand-blue)] transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                      <Info className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.information')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.info}</div>
                </div>

                {/* Important */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border-l-4 border-[#F59E0B] hover:border-[#F59E0B] transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F59E0B] flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-[var(--dark-900)]" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.important')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[#F59E0B]">{analytics.important}</div>
                </div>

                {/* Warning */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border-l-4 border-[var(--brand-red)] hover:border-[var(--brand-red)] transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-red)] flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.warning')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-red)]">{analytics.warning}</div>
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
                placeholder={t('search')} 
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
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  style={selectArrowStyle}
                >
                  <option value="">{t('filters.allTypes')}</option>
                  <option value="INFO">{t('analytics.information')}</option>
                  <option value="IMPORTANT">{t('analytics.important')}</option>
                  <option value="WARNING">{t('analytics.warning')}</option>
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
                  <option value="active">{t('filters.active')}</option>
                  <option value="expired">{t('filters.expired')}</option>
                </select>
              </div>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-xl transition-all"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        {!showSkeleton && messages.length > 0 && (
          <p className="text-sm text-[var(--brand-light)]/50 px-4 sm:px-0">
            {totalCount === 1 ? t('statsPlural', { count: messages.length, total: totalCount }) : t('stats', { count: messages.length, total: totalCount })}
          </p>
        )}

        {/* Content */}
        {showSkeleton ? (
          <MessagePageSkeleton />
        ) : messages.length === 0 ? (
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-[var(--brand-light)]/30" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">No messages found</h3>
            <p className="text-[var(--brand-light)]/50 text-sm mb-6">
              {hasFilters ? 'Try adjusting your search or filters.' : 'Get started by creating your first message.'}
            </p>
            {!hasFilters && (
              <Link href={buildUrlWithParams(`${basePath}/create`)}>
                <button className="inline-flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
                  <Plus className="h-4 w-4" /> Create Message
                </button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {messages.map((msg) => {
                const typeStyle = getTypeStyle(msg.message_type);
                const expired = isExpired(msg.expires_at);
                
                return (
                  <SwipeableCard
                    key={msg.id}
                    onClick={() => router.push(`${basePath}/${msg.id}`)}
                    onDelete={() => setItemToDelete(msg)}
                    deleteText={t('swipeActions.delete')}
                  >
                    <div className="border-y border-[var(--dark-600)] p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${typeStyle.icon} flex items-center justify-center flex-shrink-0`}>
                          {getTypeIcon(msg.message_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-[var(--brand-light)] truncate">
                            {msg.title}
                          </h3>
                          <p className="text-xs text-[var(--brand-light)]/50 line-clamp-2 mt-0.5">{msg.message}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${typeStyle.badge}`}>
                              {msg.message_type}
                            </span>
                            {msg.is_sticky && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30">
                                Sticky
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              expired 
                                ? 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30'
                                : 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30'
                            }`}>
                              {expired ? 'Expired' : 'Active'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--brand-light)]/40">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {formatTargetRoles(msg.target_roles)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(msg.expires_at).toLocaleDateString()}
                            </span>
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
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Type</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Content</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Audience</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Expires</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map(msg => {
                    const typeStyle = getTypeStyle(msg.message_type);
                    const expired = isExpired(msg.expires_at);
                    
                    return (
                      <tr key={msg.id} className="border-b border-[var(--dark-600)]/50 hover:bg-[var(--dark-700)]/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${typeStyle.badge}`}>
                              {msg.message_type}
                            </span>
                            {msg.is_sticky && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30">
                                Sticky
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[var(--brand-light)]">{msg.title}</div>
                          <div className="text-sm text-[var(--brand-light)]/50 max-w-md truncate">{msg.message}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-[var(--brand-light)]/70">
                            <Users className="w-4 h-4" />
                            {formatTargetRoles(msg.target_roles)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center w-fit px-2.5 py-1 rounded-full text-xs font-medium border ${
                              expired 
                                ? 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30'
                                : 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30'
                            }`}>
                              {expired ? 'Expired' : 'Active'}
                            </span>
                            <span className="text-xs text-[var(--brand-light)]/40 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(msg.expires_at).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => setItemToDelete(msg)}
                              className="w-9 h-9 rounded-lg hover:bg-[var(--brand-red)]/20 text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] flex items-center justify-center transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
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
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <button
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>
            <span className="text-sm text-[var(--brand-light)]/50 px-2">
              Page <span className="text-[var(--brand-primary)] font-semibold">{currentPage}</span> of <span className="text-[var(--brand-primary)] font-semibold">{totalPages}</span>
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <DeleteConfirmationModal 
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        itemName={itemToDelete?.title}
        message={`Are you sure you want to delete "${itemToDelete?.title}"? This action cannot be undone.`}
        darkMode={true}
      />
      </div>
  );
}
