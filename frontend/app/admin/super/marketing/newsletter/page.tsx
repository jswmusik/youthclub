'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Mail, Search, BarChart3, ChevronUp, Eye, Trash2, Download,
  Users, UserPlus, Calendar, CheckCircle2, XCircle, Filter,
  UserMinus, MoreVertical
} from 'lucide-react';
import api from '@/lib/api';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { useToast } from '../../../../../hooks/useToast';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

// Types
interface NewsletterSubscriber {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  consent_given: boolean;
  consent_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  source: string;
  unsubscribed_at: string | null;
}

interface Analytics {
  total_subscribers: number;
  new_last_7_days: number;
  new_last_30_days: number;
  new_last_365_days: number;
  total_unsubscribed: number;
  calculated_at: string;
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

function SubscriberCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-2 mt-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TableRowSkeleton() {
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
      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1">
          <Skeleton className="w-9 h-9 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

function PageSkeleton({ t }: { t: (key: string) => string }) {
  return (
    <>
      {/* Mobile Cards Skeleton */}
      <div className="flex flex-col gap-3 md:hidden">
        {[...Array(4)].map((_, i) => (
          <SubscriberCardSkeleton key={i} />
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--dark-600)]">
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.subscriber')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.status')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.subscribed')}</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function NewsletterPage() {
  const t = useTranslations('newsletterAdmin');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Delete/Unsubscribe
  const [subscriberToDelete, setSubscriberToDelete] = useState<NewsletterSubscriber | null>(null);
  const [deleteType, setDeleteType] = useState<'unsubscribe' | 'permanent'>('unsubscribe');
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const { success, error, info, warning } = useToast();

  // Filter State
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') || '');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Debounced Search/Filter Update
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) params.set('search', searchInput); else params.delete('search');
      if (statusFilter) params.set('status', statusFilter); else params.delete('status');
      if (dateFrom) params.set('date_from', dateFrom); else params.delete('date_from');
      if (dateTo) params.set('date_to', dateTo); else params.delete('date_to');
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchSubscribers();
  }, [searchParams]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/marketing/admin/newsletter/analytics/');
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();

    try {
      const params = new URLSearchParams();
      
      const search = searchParams.get('search') || '';
      const status = searchParams.get('status') || '';
      const from = searchParams.get('date_from') || '';
      const to = searchParams.get('date_to') || '';
      const page = searchParams.get('page') || '1';
      
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (from) params.set('date_from', from);
      if (to) params.set('date_to', to);
      params.set('page', page);
      params.set('page_size', '10');

      const res = await api.get(`/marketing/newsletter/subscribers/?${params.toString()}`);
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setSubscribers(data);
      const count = Array.isArray(res.data) ? data.length : (res.data.count || data.length);
      setTotalCount(count);
    } catch (err) {
      console.error(err);
      setSubscribers([]);
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

  const clearFilters = () => {
    setSearchInput('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    router.push(pathname);
  };

  const handleDelete = async () => {
    if (!subscriberToDelete) return;
    try {
      const url = deleteType === 'permanent' 
        ? `/marketing/newsletter/subscribers/${subscriberToDelete.id}/?permanent=true`
        : `/marketing/newsletter/subscribers/${subscriberToDelete.id}/`;
      await api.delete(url);
      const message = deleteType === 'permanent' 
        ? t('toast.deletedPermanently')
        : t('toast.markedInactive');
      fetchSubscribers();
      fetchAnalytics();
    } catch (err) {
      error(t('toast.updateFailed'));
    } finally {
      setSubscriberToDelete(null);
      setDeleteType('unsubscribe');
    }
  };

  const openUnsubscribeModal = (subscriber: NewsletterSubscriber) => {
    setSubscriberToDelete(subscriber);
    setDeleteType('unsubscribe');
    setOpenDropdownId(null);
  };

  const openDeleteModal = (subscriber: NewsletterSubscriber) => {
    setSubscriberToDelete(subscriber);
    setDeleteType('permanent');
    setOpenDropdownId(null);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Build export URL with current filters
      const params = new URLSearchParams();
      const search = searchParams.get('search') || '';
      const status = searchParams.get('status') || '';
      const from = searchParams.get('date_from') || '';
      const to = searchParams.get('date_to') || '';
      
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (from) params.set('date_from', from);
      if (to) params.set('date_to', to);
      
      const res = await api.get(`/marketing/newsletter/subscribers/export/?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `newsletter_subscribers_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      success(t('toast.exportSuccess'));
    } catch (err) {
      error(t('toast.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  const getInitials = (first?: string | null, last?: string | null) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || '?';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusBadgeClasses = (isActive: boolean) => {
    return isActive 
      ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30'
      : 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30';
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

  const hasFilters = searchInput || statusFilter || dateFrom || dateTo;

  return (
    <div className="py-4 sm:py-6 md:py-8 px-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
              <Mail className="w-5 h-5 text-[var(--dark-900)]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
          </div>
          <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
        </div>
        <button 
          onClick={handleExport}
          disabled={isExporting || totalCount === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" /> 
          {isExporting ? t('exporting') : t('exportButton')}
        </button>
      </div>

      {/* Analytics Dashboard */}
      {analytics && !showSkeleton && (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          {/* Header */}
          <button 
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[var(--dark-700)]/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-[var(--brand-primary)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--brand-light)]">{t('analytics.title')}</h3>
            </div>
            <ChevronUp className={`h-4 w-4 text-[var(--brand-light)]/50 transition-transform duration-300 ${analyticsExpanded ? 'rotate-0' : 'rotate-180'}`} />
          </button>
          
          {/* Content */}
          <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Total Subscribers */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                    <Users className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.total')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_subscribers}</div>
              </div>

              {/* New Last 7 Days */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.new7d')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.new_last_7_days}</div>
              </div>

              {/* New Last 30 Days */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)] flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.new30d')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-peach)]">{analytics.new_last_30_days}</div>
              </div>

              {/* New Last 365 Days */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.new365d')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{analytics.new_last_365_days}</div>
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
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={selectArrowStyle}
              >
                <option value="">{t('filters.allStatuses')}</option>
                <option value="active">{t('filters.active')}</option>
                <option value="inactive">{t('filters.unsubscribed')}</option>
              </select>
            </div>
            <div className="w-full sm:w-[160px]">
              <input 
                type="date"
                placeholder={t('filters.fromDate')}
                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[160px]">
              <input 
                type="date"
                placeholder={t('filters.toDate')}
                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
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
      {!showSkeleton && subscribers.length > 0 && (
        <div className="px-4 sm:px-0">
          <p className="text-sm text-[var(--brand-light)]/50">
            {t('stats.showing', { 
              showing: subscribers.length, 
              total: totalCount
            })}
            {' '}
            {totalCount === 1 ? t('stats.subscriber') : t('stats.subscribers')}
          </p>
        </div>
      )}

      {/* Content */}
      {showSkeleton ? (
        <PageSkeleton t={t} />
      ) : subscribers.length === 0 ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-[var(--brand-light)]/30" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.title')}</h3>
          <p className="text-[var(--brand-light)]/50 text-sm mb-6">
            {hasFilters ? t('emptyState.withFilters') : t('emptyState.noFilters')}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {subscribers.map((subscriber) => (
              <div 
                key={subscriber.id}
                className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--dark-600)] border border-[var(--dark-500)] flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[var(--brand-primary)]">
                      {getInitials(subscriber.first_name, subscriber.last_name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-[var(--brand-light)] truncate">
                      {subscriber.first_name} {subscriber.last_name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3 h-3 text-[var(--brand-light)]/40" />
                      <p className="text-xs text-[var(--brand-light)]/50 truncate">{subscriber.email}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClasses(subscriber.is_active)}`}>
                        {subscriber.is_active ? t('status.active') : t('status.unsubscribed')}
                      </span>
                      <span className="text-xs text-[var(--brand-light)]/40">
                        {formatDate(subscriber.created_at)}
                      </span>
                    </div>
                  </div>
                  {/* Actions Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => setOpenDropdownId(openDropdownId === subscriber.id ? null : subscriber.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openDropdownId === subscriber.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setOpenDropdownId(null)}
                        />
                        <div className="absolute right-0 top-10 z-20 w-48 bg-[var(--dark-800)] border border-[var(--dark-600)] rounded-xl shadow-xl overflow-hidden">
                          {subscriber.is_active && (
                            <button
                              onClick={() => openUnsubscribeModal(subscriber)}
                              className="w-full px-4 py-3 text-left text-sm text-[var(--brand-light)] hover:bg-[var(--dark-700)] transition-colors flex items-center gap-2"
                            >
                              <UserMinus className="w-4 h-4 text-[var(--brand-yellow)]" />
                              {t('actions.unsubscribe')}
                            </button>
                          )}
                          <button
                            onClick={() => openDeleteModal(subscriber)}
                            className="w-full px-4 py-3 text-left text-sm text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-colors flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            {t('actions.deletePermanently')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--dark-600)]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.subscriber')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.status')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.subscribed')}</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber, index) => (
                  <tr 
                    key={subscriber.id} 
                    className={`${index !== subscribers.length - 1 ? 'border-b border-[var(--dark-600)]/50' : ''} hover:bg-[var(--dark-700)]/30 transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--dark-700)] border border-[var(--dark-500)] flex items-center justify-center">
                          <span className="text-xs font-bold text-[var(--brand-primary)]">
                            {getInitials(subscriber.first_name, subscriber.last_name)}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--brand-light)]">{subscriber.first_name} {subscriber.last_name}</div>
                          <div className="text-xs text-[var(--brand-light)]/50 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {subscriber.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClasses(subscriber.is_active)}`}>
                        {subscriber.is_active ? t('status.active') : t('status.unsubscribed')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--brand-light)]/70">
                      {formatDate(subscriber.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1 relative">
                        {subscriber.is_active && (
                          <button 
                            onClick={() => openUnsubscribeModal(subscriber)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-yellow)] hover:bg-[var(--brand-yellow)]/20 transition-all"
                            title={t('actions.unsubscribe')}
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => openDeleteModal(subscriber)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/20 transition-all"
                          title={t('actions.deletePermanently')}
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
                {t('pagination.page', { current: currentPage, total: totalPages })}
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
        isVisible={!!subscriberToDelete}
        onClose={() => {
          setSubscriberToDelete(null);
          setDeleteType('unsubscribe');
        }}
        onConfirm={handleDelete}
        title={deleteType === 'permanent' ? t('modal.deleteTitle') : t('modal.unsubscribeTitle')}
        message={
          deleteType === 'permanent'
            ? t('modal.deleteMessage', { 
                firstName: subscriberToDelete?.first_name, 
                lastName: subscriberToDelete?.last_name,
                email: subscriberToDelete?.email 
              })
            : t('modal.unsubscribeMessage', { 
                firstName: subscriberToDelete?.first_name, 
                lastName: subscriberToDelete?.last_name,
                email: subscriberToDelete?.email 
              })
        }
        confirmButtonText={deleteType === 'permanent' ? t('modal.deleteConfirm') : t('modal.unsubscribeConfirm')}
        cancelButtonText={t('modal.cancel')}
        variant="danger"
        darkMode={true}
      />
      </div>
  );
}

