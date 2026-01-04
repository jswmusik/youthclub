'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import api from '../../../../lib/api';
import { useToast } from '../../../../hooks/useToast';
import { useAuth } from '../../../../context/AuthContext';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';
import { BarChart3, ChevronUp, Search, X, MessageSquare, Info, AlertTriangle, AlertCircle, ChevronDown } from 'lucide-react';

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
      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
      <td className="px-6 py-4"><div className="flex justify-end"><Skeleton className="w-9 h-9 rounded-lg" /></div></td>
    </tr>
  );
}

interface SystemMessage {
  id: number;
  title: string;
  message: string;
  message_type: 'INFO' | 'IMPORTANT' | 'WARNING';
  created_at: string;
  expires_at: string;
  is_sticky: boolean;
  external_link?: string | null;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function ClubMessageBoardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('clubAdmin.msgboard');
  
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<SystemMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Pagination state
  const pageSize = 10;
  const { success, error, info, warning } = useToast();
  const { refreshMessageCount } = useAuth();
  
  // Hide Confirmation Modal State
  const [showHideModal, setShowHideModal] = useState(false);
  const [messageToHide, setMessageToHide] = useState<{ id: number; title: string } | null>(null);
  const [isHiding, setIsHiding] = useState(false);

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    // Reset page to 1 when filters change (except when changing page itself)
    if (key !== 'page') {
      params.set('page', '1');
    }
    router.push(`${pathname}?${params.toString()}`);
  };
  
  const handlePageChange = (newPage: number) => {
    updateUrl('page', newPage.toString());
  };

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = searchParams.get('search') || '';
      if (searchInput !== currentSearch) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) params.set('search', searchInput); else params.delete('search');
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 0);
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Sync searchInput with URL when it changes externally
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== searchInput && document.activeElement !== searchInputRef.current) {
      setSearchInput(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Apply filters and pagination
  useEffect(() => {
    let filtered = [...messages];
    
    // Search filter
    const search = searchParams.get('search') || '';
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(searchLower) || 
        m.message.toLowerCase().includes(searchLower)
      );
    }
    
    // Type filter
    const type = searchParams.get('type') || '';
    if (type) {
      filtered = filtered.filter(m => m.message_type === type);
    }
    
    // Pagination
    const page = Number(searchParams.get('page')) || 1;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = filtered.slice(startIndex, endIndex);
    
    setFilteredMessages(paginated);
  }, [searchParams, messages]);
  
  // Calculate total pages for pagination
  const getTotalFilteredCount = () => {
    let filtered = [...messages];
    const search = searchParams.get('search') || '';
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(searchLower) || 
        m.message.toLowerCase().includes(searchLower)
      );
    }
    const type = searchParams.get('type') || '';
    if (type) {
      filtered = filtered.filter(m => m.message_type === type);
    }
    return filtered.length;
  };
  
  const totalFilteredCount = getTotalFilteredCount();
  const totalPages = Math.ceil(totalFilteredCount / pageSize);

  // Calculate analytics from all messages (not filtered)
  const analytics = {
    total: messages.length,
    info: messages.filter(m => m.message_type === 'INFO').length,
    important: messages.filter(m => m.message_type === 'IMPORTANT').length,
    warning: messages.filter(m => m.message_type === 'WARNING').length,
  };

  const fetchMessages = async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();
    
    try {
      const res = await api.get('/messages/active_list/');
      const list: SystemMessage[] = Array.isArray(res.data) ? res.data : [];
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setMessages(list);
      refreshMessageCount();
    } catch (err) {
      console.error(err);
      error(t('toast.loadFailed'));
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      
      setTimeout(() => {
        setLoading(false);
        setShowSkeleton(false);
      }, remaining);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleHideClick = (msg: SystemMessage) => {
    if (msg.is_sticky) return;
    setMessageToHide({ id: msg.id, title: msg.title });
    setShowHideModal(true);
  };

  const handleHideConfirm = async () => {
    if (!messageToHide) return;

    setIsHiding(true);
    try {
      await api.post(`/messages/${messageToHide.id}/dismiss/`);
      success(t('toast.hideSuccess'));
      setShowHideModal(false);
      setMessageToHide(null);
      fetchMessages();
    } catch (err) {
      console.error(err);
      error(t('toast.hideFailed'));
    } finally {
      setIsHiding(false);
    }
  };

  const getTypeStyle = (type: string) => {
    switch(type) {
      case 'INFO': return {
        badge: 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30',
        iconBg: 'bg-[var(--brand-blue)]'
      };
      case 'IMPORTANT': return {
        badge: 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30',
        iconBg: 'bg-[#F59E0B]'
      };
      case 'WARNING': return {
        badge: 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30',
        iconBg: 'bg-[var(--brand-red)]'
      };
      default: return {
        badge: 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30',
        iconBg: 'bg-[var(--brand-primary)]'
      };
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'INFO': return t('info');
      case 'IMPORTANT': return t('important');
      case 'WARNING': return t('warning');
      default: return type;
    }
  };

  const selectArrowStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1rem'
  };

  const hasFilters = searchInput || searchParams.get('type');

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-6 md:py-8 px-0 space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
          </div>
          <button
            onClick={fetchMessages}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all"
          >
            {t('refresh')}
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {!showSkeleton && (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mx-0 sm:mx-4 md:mx-6 lg:mx-8">
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
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Total Messages */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border-l-4 border-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('total')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total}</div>
              </div>

              {/* Info */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border-l-4 border-[var(--brand-blue)] hover:border-[var(--brand-blue)] transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                    <Info className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('info')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.info}</div>
              </div>

              {/* Important */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border-l-4 border-[#F59E0B] hover:border-[#F59E0B] transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F59E0B] flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('important')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[#F59E0B]">{analytics.important}</div>
              </div>

              {/* Warning */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border-l-4 border-[var(--brand-red)] hover:border-[var(--brand-red)] transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-red)] flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('warning')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-red)]">{analytics.warning}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 py-3 mx-0 sm:mx-4 md:mx-6 lg:mx-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--brand-light)]/40 w-5 h-5 z-10" />
            <input 
              ref={searchInputRef}
              type="text"
              placeholder={t('searchPlaceholder')} 
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 outline-none transition-all hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-[200px]">
            <select 
              className="w-full h-10 px-4 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
              style={selectArrowStyle}
              value={searchParams.get('type') || ''} 
              onChange={e => updateUrl('type', e.target.value)}
            >
              <option value="">{t('allTypes')}</option>
              <option value="INFO">{t('info')}</option>
              <option value="IMPORTANT">{t('important')}</option>
              <option value="WARNING">{t('warning')}</option>
            </select>
          </div>
          {hasFilters && (
            <button
              onClick={() => router.push(pathname)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all flex items-center justify-center gap-2"
            >
              <X className="h-4 w-4" /> {t('clear')}
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {!showSkeleton && filteredMessages.length > 0 && (
        <div className="px-4 sm:px-6 md:px-8">
          <p className="text-sm text-[var(--brand-light)]/50">
            {t('showing')} <span className="text-[var(--brand-primary)] font-semibold">{filteredMessages.length}</span> {t('of')} <span className="text-[var(--brand-primary)] font-semibold">{totalFilteredCount}</span> {totalFilteredCount === 1 ? t('message') : t('messages')}
          </p>
        </div>
      )}

      {/* CONTENT */}
      {showSkeleton ? (
        <>
          {/* Mobile Cards Skeleton */}
          <div className="flex flex-col gap-3 md:hidden px-4 sm:px-6 md:px-8">
            {[...Array(4)].map((_, i) => (
              <MessageCardSkeleton key={i} />
            ))}
          </div>

          {/* Desktop Table Skeleton */}
          <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden mx-4 md:mx-6 lg:mx-8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--dark-600)]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Type</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Title</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Message</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Created</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Expires</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Actions</th>
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
      ) : filteredMessages.length === 0 ? (
        <div className="px-4 sm:px-6 md:px-8">
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-[var(--brand-light)]/30" />
            </div>
            <p className="text-[var(--brand-light)]">
              {messages.length === 0 
                ? t('emptyStates.noMessages')
                : t('emptyStates.noMatches')}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden px-4 sm:px-6 md:px-8">
            {filteredMessages.map((msg) => {
              const styles = getTypeStyle(msg.message_type);
              return (
                <div key={msg.id} className="bg-[var(--dark-800)] rounded-none border-y border-[var(--dark-600)] overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles.badge}`}>
                            {getTypeLabel(msg.message_type)}
                          </span>
                          {msg.is_sticky && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30">
                              {t('sticky')}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-semibold text-[var(--brand-light)] truncate mb-1">{msg.title}</h3>
                        <p className="text-sm text-[var(--brand-light)]/50 line-clamp-2">{msg.message}</p>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-[var(--dark-600)]">
                      <div className="flex items-center justify-between text-[var(--brand-light)]/60">
                        <span className="text-xs uppercase font-semibold">{t('tableHeaders.created')}</span>
                        <span className="text-xs">{formatDate(msg.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[var(--brand-light)]/60">
                        <span className="text-xs uppercase font-semibold">{t('tableHeaders.expires')}</span>
                        <span className="text-xs">{formatDate(msg.expires_at)}</span>
                      </div>
                    </div>
                    {(msg.external_link || !msg.is_sticky) && (
                      <div className="flex items-center gap-2 pt-2 border-t border-[var(--dark-600)]">
                        {msg.external_link && (
                          <a
                            href={msg.external_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1"
                          >
                            <button className="w-full px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all">
                              {t('viewMore')}
                            </button>
                          </a>
                        )}
                        <button
                          onClick={() => handleHideClick(msg)}
                          disabled={msg.is_sticky}
                          className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            msg.is_sticky
                              ? 'text-[var(--brand-light)]/30 cursor-not-allowed bg-[var(--dark-700)] border border-[var(--dark-500)]'
                              : 'text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30'
                          }`}
                        >
                          {t('hide')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP: Table */}
          <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden mx-4 md:mx-6 lg:mx-8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--dark-600)]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Type</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Title</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Message</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Created</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Expires</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMessages.map((msg) => {
                  const styles = getTypeStyle(msg.message_type);
                  return (
                    <tr key={msg.id} className="border-b border-[var(--dark-600)]/50 hover:bg-[var(--dark-700)]/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles.badge}`}>
                            {getTypeLabel(msg.message_type)}
                          </span>
                          {msg.is_sticky && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30">
                              {t('sticky')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-[var(--brand-light)]">{msg.title}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[var(--brand-light)]/70 line-clamp-2">{msg.message}</span>
                      </td>
                      <td className="px-6 py-4 text-[var(--brand-light)]/60">
                        <span className="text-sm">{formatDate(msg.created_at)}</span>
                      </td>
                      <td className="px-6 py-4 text-[var(--brand-light)]/60">
                        <span className="text-sm">{formatDate(msg.expires_at)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {msg.external_link && (
                            <a
                              href={msg.external_link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                            </a>
                          )}
                          <button
                            onClick={() => handleHideClick(msg)}
                            disabled={msg.is_sticky}
                            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                              msg.is_sticky
                                ? 'text-[var(--brand-light)]/30 cursor-not-allowed'
                                : 'text-[var(--brand-light)]/50 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10'
                            }`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (() => {
            const currentPage = Number(searchParams.get('page')) || 1;
            return (
              <div className="flex items-center justify-center gap-3 py-4 px-4 sm:px-6 md:px-8">
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
            );
          })()}
        </>
      )}

      {/* Hide Confirmation Modal */}
      <DeleteConfirmationModal
        isVisible={showHideModal}
        onClose={() => {
          if (!isHiding) {
            setShowHideModal(false);
            setMessageToHide(null);
          }
        }}
        onConfirm={handleHideConfirm}
        title={t('hideModal.title')}
        itemName={messageToHide?.title}
        message={messageToHide ? t('hideModal.message', { title: messageToHide.title }) : undefined}
        confirmButtonText={t('hideModal.confirm')}
        isLoading={isHiding}
        darkMode
      />

    </div>
  );
}

function LoadingFallback() {
  const t = useTranslations('clubAdmin.msgboard');
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
        <MessageSquare className="w-6 h-6 text-[var(--dark-900)]" />
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">{t('loading')}</div>
    </div>
  );
}

export default function ClubMessageBoardPage() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <Suspense fallback={<LoadingFallback />}>
        <ClubMessageBoardContent />
      </Suspense>
    </div>
  );
}
