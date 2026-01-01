'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X, FileText, 
  CheckCircle2, Clock, Calendar, PlayCircle, ChevronLeft, ClipboardList
} from 'lucide-react';
import { questionnaireApi } from '../../../lib/questionnaire-api';
import api from '../../../lib/api';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import { useToast } from '../../../hooks/useToast';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
  editText: string;
  deleteText: string;
}

function SwipeableCard({ children, onEdit, onDelete, onClick, editText, deleteText }: SwipeableCardProps) {
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
          <span className="text-xs font-medium">{editText}</span>
        </button>
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

function QuestionnaireCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
          <div className="flex items-center gap-2 mt-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionnaireTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="w-8 h-8 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

interface QuestionnaireManagerProps {
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function QuestionnaireManager({ basePath, scope }: QuestionnaireManagerProps) {
  const t = useTranslations('questionnairesAdmin');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [analytics, setAnalytics] = useState({
    total_created: 0,
    total_completed: 0,
    total_started: 0,
  });
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const { success, error, info, warning } = useToast();
  
  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== 'page') {
      params.set('page', '1');
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const buildUrlWithParams = (path: string) => {
    const page = searchParams.get('page');
    if (page && page !== '1') {
      return `${path}?page=${page}`;
    }
    return path;
  };

  const fetchAnalytics = async () => {
    try {
      const res = await questionnaireApi.getSummaryAnalytics();
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const fetchMunicipalities = async () => {
    try {
      const res = await api.get('/municipalities/');
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setMunicipalities(data);
    } catch (err) {
      console.error('Failed to fetch municipalities:', err);
      setMunicipalities([]);
    }
  };

  const fetchClubs = async () => {
    try {
      let allClubs: any[] = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore && page <= 100) {
        const res = await api.get(`/clubs/?page=${page}&page_size=100`);
        const data = res.data;
        const pageClubs = Array.isArray(data) ? data : data.results || [];
        allClubs = [...allClubs, ...pageClubs];
        hasMore = !!data.next;
        page++;
      }
      
      setClubs(allClubs);
    } catch (err) {
      console.error('Failed to fetch clubs:', err);
      setClubs([]);
    }
  };

  useEffect(() => {
    if (scope === 'SUPER') {
      fetchMunicipalities();
      fetchClubs();
    }
  }, [scope]);

  useEffect(() => {
    fetchData();
    fetchAnalytics();
  }, [searchParams]);

  const fetchData = async () => {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      const params = new URLSearchParams(searchParams.toString());
      if (!params.has('page')) params.set('page', '1');
      if (!params.has('page_size')) params.set('page_size', '10');
      
      const res = await questionnaireApi.list(params);
      setItems(Array.isArray(res.data) ? res.data : res.data.results || []);
      setTotalCount(res.data.count || 0);
    } catch (err) {
      console.error(err);
      error(t('toasts.fetchError'));
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = MIN_LOADING_TIME - elapsed;
      
      if (remaining > 0) {
        setTimeout(() => {
          setLoading(false);
          setShowSkeleton(false);
        }, remaining);
      } else {
        setLoading(false);
        setShowSkeleton(false);
      }
    }
  };
  
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await questionnaireApi.delete(itemToDelete.id);
      success('Questionnaire deleted');
      fetchData();
      fetchAnalytics();
    } catch (err) {
      error('Failed to delete');
    } finally {
      setItemToDelete(null);
    }
  };

  const handleTogglePublish = async (item: any) => {
    const newStatus = item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await questionnaireApi.update(item.id, { status: newStatus });
      success(newStatus === 'PUBLISHED' ? t('toasts.published') : t('toasts.unpublished'));
      fetchData();
      fetchAnalytics();
    } catch (err) {
      error(t('toasts.statusUpdateFailed'));
    }
  };

  const getStatusBadgeClasses = (status: string, scheduledPublishDate?: string | null, expirationDate?: string | null) => {
    if (expirationDate) {
      const expDate = new Date(expirationDate);
      if (expDate < new Date()) {
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      }
    }
    
    if (status === 'DRAFT' && scheduledPublishDate) {
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    }
    
    switch (status) {
      case 'PUBLISHED': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'DRAFT': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'ARCHIVED': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]';
    }
  };
  
  const getStatusDisplay = (status: string, scheduledPublishDate?: string | null, expirationDate?: string | null) => {
    if (expirationDate) {
      const expDate = new Date(expirationDate);
      if (expDate < new Date()) {
        return t('statuses.archived');
      }
    }
    
    if (status === 'DRAFT' && scheduledPublishDate) {
      return t('statuses.scheduled');
    }
    
    switch (status) {
      case 'DRAFT': return t('statuses.draft');
      case 'PUBLISHED': return t('statuses.published');
      case 'ARCHIVED': return t('statuses.archived');
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
              <p className="text-[var(--brand-light)]/60 text-sm mt-1">{t('subtitle')}</p>
            </div>
          </div>
          <Link href={buildUrlWithParams(`${basePath}/create`)}>
            <button className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
              <Plus className="w-5 h-5" />
              {t('createNew')}
            </button>
          </Link>
        </div>

        {/* Analytics Dashboard */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] overflow-hidden -mx-4 sm:mx-0">
          <button
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-[var(--dark-700)]/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--brand-primary)]" />
              <span className="text-sm font-semibold text-[var(--brand-light)]">{t('analytics.title')}</span>
            </div>
            <ChevronUp className={`w-4 h-4 text-[var(--brand-light)]/60 transition-transform ${analyticsExpanded ? '' : 'rotate-180'}`} />
          </button>
          
          {analyticsExpanded && (
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border-l-4 border-[var(--brand-primary)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[var(--brand-primary)]" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--brand-light)]/50 font-medium">{t('analytics.totalCreated')}</p>
                      <p className="text-2xl font-bold text-[var(--brand-light)]">{analytics.total_created}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border-l-4 border-green-500">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--brand-light)]/50 font-medium">{t('analytics.completed')}</p>
                      <p className="text-2xl font-bold text-[var(--brand-light)]">{analytics.total_completed}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border-l-4 border-blue-500">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <PlayCircle className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--brand-light)]/50 font-medium">{t('analytics.started')}</p>
                      <p className="text-2xl font-bold text-[var(--brand-light)]">{analytics.total_started}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] p-4 sm:p-6 -mx-4 sm:mx-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-light)]/40" />
              <input
                type="text"
                placeholder={t('filters.search')}
                value={searchParams.get('search') || ''}
                onChange={e => updateUrl('search', e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all"
              />
            </div>
            
            {/* Status Filter */}
            <select
              value={searchParams.get('status') || ''}
              onChange={e => updateUrl('status', e.target.value)}
              className="h-10 px-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all"
            >
              <option value="">{t('filters.allStatuses')}</option>
              <option value="DRAFT">{t('statuses.draft')}</option>
              <option value="PUBLISHED">{t('statuses.published')}</option>
              <option value="ARCHIVED">{t('statuses.archived')}</option>
            </select>
            
            {/* Municipality Filter - Only for SUPER scope */}
            {scope === 'SUPER' && (
              <select
                value={searchParams.get('municipality') || ''}
                onChange={e => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (e.target.value) {
                    params.set('municipality', e.target.value);
                  } else {
                    params.delete('municipality');
                  }
                  params.delete('club');
                  params.set('page', '1');
                  router.replace(`${pathname}?${params.toString()}`);
                }}
                className="h-10 px-3 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all"
              >
                <option value="">{t('filters.allMunicipalities')}</option>
                {municipalities.map(m => (
                  <option key={m.id} value={m.id.toString()}>{m.name}</option>
                ))}
              </select>
            )}
            
            {/* Clear Button */}
            <button
              onClick={() => router.push(pathname)}
              className="h-10 px-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)]/60 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              {t('filters.clear')}
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between text-sm px-4 sm:px-0">
          <span className="text-[var(--brand-light)]/60">
            {t('stats.showing')} <span className="font-semibold text-[var(--brand-light)]">{items.length}</span> {t('stats.of')}{' '}
            <span className="font-semibold text-[var(--brand-light)]">{totalCount}</span> {t('stats.questionnaires')}
          </span>
        </div>

        {/* Content */}
        {showSkeleton ? (
          <>
            {/* Mobile Skeletons */}
            <div className="flex flex-col gap-3 md:hidden">
              {[...Array(5)].map((_, i) => (
                <QuestionnaireCardSkeleton key={i} />
              ))}
            </div>
            
            {/* Desktop Skeleton */}
            <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--dark-600)]">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.title')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.status')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.expires')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.responses')}</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <QuestionnaireTableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : items.length === 0 ? (
          <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-700)] p-12 sm:p-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-[var(--brand-light)]/40" />
            </div>
            <p className="text-[var(--brand-light)]/60 text-lg">{t('empty')}</p>
            <p className="text-[var(--brand-light)]/40 text-sm mt-1">Try adjusting your filters or create a new questionnaire</p>
          </div>
        ) : (
          <>
            {/* MOBILE: Swipeable Cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {items.map((q) => (
                <SwipeableCard
                  key={q.id}
                  onClick={() => router.push(buildUrlWithParams(`${basePath}/${q.id}/analytics`))}
                  onEdit={() => router.push(buildUrlWithParams(`${basePath}/edit/${q.id}`))}
                  onDelete={() => setItemToDelete(q)}
                  editText={t('swipeActions.edit')}
                  deleteText={t('swipeActions.delete')}
                >
                  <div className="p-4 border-y border-[var(--dark-600)]">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-[var(--brand-primary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[var(--brand-light)] truncate">{q.title}</h3>
                        {q.description && (
                          <p className="text-sm text-[var(--brand-light)]/60 truncate mt-0.5">{q.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClasses(q.status, q.scheduled_publish_date, q.expiration_date)}`}>
                            {getStatusDisplay(q.status, q.scheduled_publish_date, q.expiration_date)}
                          </span>
                          <span className="text-xs text-[var(--brand-light)]/50">
                            {q.expiration_date ? new Date(q.expiration_date).toLocaleDateString() : 'No expiry'}
                          </span>
                          <span className="text-xs text-[var(--brand-light)]/50">
                            {t('responses.count', { count: q.response_count || 0 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </SwipeableCard>
              ))}
            </div>

            {/* DESKTOP: Table */}
            <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--dark-600)]">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.title')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.status')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.expires')}</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.responses')}</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((q) => (
                    <tr 
                      key={q.id} 
                      className="border-b border-[var(--dark-600)]/50 hover:bg-[var(--dark-700)]/50 transition-colors cursor-pointer"
                      onClick={() => router.push(buildUrlWithParams(`${basePath}/${q.id}/analytics`))}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-[var(--brand-light)] hover:text-[var(--brand-primary)] transition-colors">
                            {q.title}
                          </p>
                          {q.description && (
                            <p className="text-xs text-[var(--brand-light)]/50 mt-1 truncate max-w-md">
                              {q.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClasses(q.status, q.scheduled_publish_date, q.expiration_date)}`}>
                          {getStatusDisplay(q.status, q.scheduled_publish_date, q.expiration_date)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--brand-light)]/70">
                          {q.expiration_date ? new Date(q.expiration_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--brand-light)]">
                          <span className="font-semibold">{q.response_count || 0}</span>{' '}
                          <span className="text-[var(--brand-light)]/50">{t('responses.completed')}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Link href={buildUrlWithParams(`${basePath}/${q.id}/analytics`)}>
                            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all">
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          {q.status === 'PUBLISHED' ? (
                            <button 
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-500/20 transition-all"
                              onClick={() => handleTogglePublish(q)}
                              title={t('actions.published')}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          ) : q.status === 'DRAFT' && (
                            <button 
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-yellow-400 hover:bg-yellow-500/20 transition-all"
                              onClick={() => handleTogglePublish(q)}
                              title={t('actions.notPublished')}
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          )}
                          <Link href={buildUrlWithParams(`${basePath}/edit/${q.id}`)}>
                            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all">
                              <Edit className="w-4 h-4" />
                            </button>
                          </Link>
                          <button 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--brand-light)]/60 hover:text-red-400 hover:bg-red-500/20 transition-all"
                            onClick={() => setItemToDelete(q)}
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
              <div className="flex items-center justify-center gap-3 py-4">
                <button
                  disabled={currentPage === 1}
                  onClick={() => updateUrl('page', (currentPage - 1).toString())}
                  className="px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--dark-600)] transition-all"
                >
                  Previous
                </button>
                <span className="text-sm text-[var(--brand-light)]/60">
                  Page <span className="font-semibold text-[var(--brand-light)]">{currentPage}</span> of{' '}
                  <span className="font-semibold text-[var(--brand-light)]">{totalPages}</span>
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => updateUrl('page', (currentPage + 1).toString())}
                  className="px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-600)] text-[var(--brand-light)] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--dark-600)] transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <DeleteConfirmationModal 
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        itemName={itemToDelete?.title}
        darkMode={true}
      />
      </div>
  );
}
