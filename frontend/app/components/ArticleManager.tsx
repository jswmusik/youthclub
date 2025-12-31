'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X, FileText, Calendar, User, CheckCircle2, Tag, ChevronLeft } from 'lucide-react';
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
  const t = useTranslations('newsManager');
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

function ArticleCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-2 mt-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ArticleTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-16 rounded-full" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-28" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
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

function ArticlePageSkeleton() {
  const t = useTranslations('newsManager');
  return (
    <>
      {/* Mobile Cards Skeleton */}
      <div className="flex flex-col gap-3 md:hidden">
        {[...Array(4)].map((_, i) => (
          <ArticleCardSkeleton key={i} />
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--dark-600)]">
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.article')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.author')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.created')}</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <ArticleTableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface ArticleManagerProps {
  basePath: string;
}

export default function ArticleManager({ basePath }: ArticleManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('newsManager');
  
  const [articles, setArticles] = useState<any[]>([]);
  const [allArticlesForAnalytics, setAllArticlesForAnalytics] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  // Filter State
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [authorFilter, setAuthorFilter] = useState(searchParams.get('author') || '');
  
  // Delete
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const { success, error, info, warning } = useToast();

  useEffect(() => {
    fetchAllArticlesForAnalytics();
  }, []);

  // Debounced Search/Filter Update
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) params.set('search', searchInput); else params.delete('search');
      if (statusFilter) params.set('status', statusFilter); else params.delete('status');
      if (authorFilter) params.set('author', authorFilter); else params.delete('author');
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, statusFilter, authorFilter]);

  useEffect(() => {
    fetchArticles();
  }, [searchParams]);

  const fetchAllArticlesForAnalytics = async () => {
    try {
      let allArticles: any[] = [];
      let page = 1;
      let totalCount = 0;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/news/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) break;
        
        let pageArticles: any[] = [];
        
        if (Array.isArray(responseData)) {
          pageArticles = responseData;
          allArticles = [...allArticles, ...pageArticles];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageArticles = responseData.results;
          allArticles = [...allArticles, ...pageArticles];
          
          if (page === 1) {
            totalCount = responseData.count || 0;
          }
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allArticles.length >= totalCount;
          const gotEmptyPage = pageArticles.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) break;
          page++;
        } else {
          break;
        }
      }
      
      setAllArticlesForAnalytics(allArticles);
    } catch (err) {
      console.error('Error fetching articles for analytics:', err);
      setAllArticlesForAnalytics([]);
    }
  };

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();

    try {
      const page = searchParams.get('page') || '1';
      const search = searchParams.get('search') || '';
      const status = searchParams.get('status') || '';
      const author = searchParams.get('author') || '';
      const dateCreated = searchParams.get('date_created') || '';
      
      const hasClientSideFilters = status || author || dateCreated;
      
      let fetchedArticles: any[] = [];
      
      if (hasClientSideFilters) {
        let currentPage = 1;
        const pageSize = 100;
        const maxPages = 100;
        
        while (currentPage <= maxPages) {
          const params = new URLSearchParams();
          if (search) params.set('search', search);
          params.set('page', currentPage.toString());
          params.set('page_size', pageSize.toString());
          
          const res: any = await api.get(`/news/?${params.toString()}`);
          const responseData: any = res?.data;
          
          if (!responseData) break;
          
          const pageArticles = Array.isArray(responseData) ? responseData : responseData.results || [];
          fetchedArticles = [...fetchedArticles, ...pageArticles];
          
          if (!responseData.next || pageArticles.length === 0) break;
          currentPage++;
        }
      } else {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        params.set('page', page);
        params.set('page_size', '10');
        
        const res = await api.get(`/news/?${params.toString()}`);
        fetchedArticles = Array.isArray(res.data) ? res.data : res.data.results || [];
        const count = Array.isArray(res.data) ? fetchedArticles.length : (res.data.count || fetchedArticles.length);
        setTotalCount(count);
      }
      
      // Apply client-side filters
      let filteredArticles = fetchedArticles;
      
      if (status) {
        filteredArticles = filteredArticles.filter((a: any) => {
          if (status === 'published') return a.is_published;
          if (status === 'draft') return !a.is_published;
          return true;
        });
      }
      
      if (author) {
        filteredArticles = filteredArticles.filter((a: any) => 
          a.author_name === author
        );
      }
      
      if (dateCreated) {
        const filterDate = new Date(dateCreated);
        filterDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        filteredArticles = filteredArticles.filter((a: any) => {
          if (!a.published_at) return false;
          const articleDate = new Date(a.published_at);
          articleDate.setHours(0, 0, 0, 0);
          return articleDate >= filterDate && articleDate < nextDay;
        });
      }
      
      if (hasClientSideFilters) {
        const pageSize = 10;
        const startIndex = (Number(page) - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        setArticles(filteredArticles.slice(startIndex, endIndex));
        setTotalCount(filteredArticles.length);
      } else {
        setArticles(filteredArticles);
      }
    } catch (err) {
      console.error(err);
      setArticles([]);
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

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const author = searchParams.get('author');
    const dateCreated = searchParams.get('date_created');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (author) params.set('author', author);
    if (dateCreated) params.set('date_created', dateCreated);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };
  
  const uniqueAuthors = Array.from(
    new Set(allArticlesForAnalytics.map((a: any) => a.author_name).filter(Boolean))
  ).sort();

  const clearFilters = () => {
    setSearchInput('');
    setStatusFilter('');
    setAuthorFilter('');
    router.push(pathname);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/news/${itemToDelete.id}/`);
      success(t('toast.articleDeleted'));
      fetchArticles();
      fetchAllArticlesForAnalytics();
    } catch (err) {
      error(t('toast.failedToDelete'));
    } finally {
      setItemToDelete(null);
    }
  };

  const analytics = {
    total: allArticlesForAnalytics.length,
    published: allArticlesForAnalytics.filter((a: any) => a.is_published).length,
    unpublished: allArticlesForAnalytics.filter((a: any) => !a.is_published).length,
  };

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

  const hasFilters = searchInput || statusFilter || authorFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
          </div>
          <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`${basePath}/tags`}>
            <button className="flex items-center justify-center gap-2 bg-[var(--dark-700)] hover:bg-[var(--dark-600)] text-[var(--brand-light)] border border-[var(--dark-500)] font-medium rounded-xl px-4 py-2.5 transition-all text-sm">
              <Tag className="h-4 w-4" /> {t('tags')}
            </button>
          </Link>
          <Link href={`${basePath}/create`}>
            <button className="flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-2.5 transition-all text-sm">
              <Plus className="h-4 w-4" /> {t('createArticle')}
            </button>
          </Link>
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
              <h3 className="text-sm font-semibold text-[var(--brand-light)]">{t('analytics.title')}</h3>
            </div>
            <ChevronUp className={`h-4 w-4 text-[var(--brand-light)]/50 transition-transform duration-300 ${analyticsExpanded ? 'rotate-0' : 'rotate-180'}`} />
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-3 gap-3 sm:gap-4">
              
              {/* Total Articles */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.total')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total}</div>
              </div>

              {/* Published */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.published')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{analytics.published}</div>
              </div>

              {/* Draft */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center">
                    <Edit className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.draft')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.unpublished}</div>
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
            <div className="w-full sm:w-[160px]">
              <select 
                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={selectArrowStyle}
              >
                <option value="">{t('filters.allStatuses')}</option>
                <option value="published">{t('filters.published')}</option>
                <option value="draft">{t('filters.draft')}</option>
              </select>
            </div>
            <div className="w-full sm:w-[200px]">
              <select 
                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                value={authorFilter}
                onChange={e => setAuthorFilter(e.target.value)}
                style={selectArrowStyle}
              >
                <option value="">{t('filters.allAuthors')}</option>
                {uniqueAuthors.map((author: string) => (
                  <option key={author} value={author}>{author}</option>
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
      {!showSkeleton && articles.length > 0 && (
        <div className="px-4 sm:px-0">
          <p className="text-sm text-[var(--brand-light)]/50">
            {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{articles.length}</span> {t('statsBar.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> {totalCount === 1 ? t('statsBar.article') : t('statsBar.articles')}
          </p>
        </div>
      )}

      {/* Content */}
      {showSkeleton ? (
        <ArticlePageSkeleton />
      ) : articles.length === 0 ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[var(--brand-light)]/30" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.noArticlesFound')}</h3>
          <p className="text-[var(--brand-light)]/50 text-sm mb-6">
            {hasFilters ? t('emptyState.adjustFilters') : t('emptyState.getStarted')}
          </p>
          {!hasFilters && (
            <Link href={`${basePath}/create`}>
              <button className="inline-flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
                <Plus className="h-4 w-4" /> {t('createArticle')}
              </button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {articles.map((item, index) => (
              <SwipeableCard
                key={item.id}
                onClick={() => router.push(buildUrlWithParams(`${basePath}/${item.id}`))}
                onEdit={() => router.push(buildUrlWithParams(`${basePath}/edit/${item.id}`))}
                onDelete={() => setItemToDelete(item)}
              >
                <div className="border-y border-[var(--dark-600)] p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[var(--dark-600)] border border-[var(--dark-500)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.hero_image ? (
                        <img src={getMediaUrl(item.hero_image) || ''} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-5 h-5 text-[var(--brand-primary)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-[var(--brand-light)] truncate">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <User className="w-3 h-3 text-[var(--brand-light)]/40" />
                        <span className="text-xs text-[var(--brand-light)]/50 truncate">{item.author_name}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          item.is_published 
                            ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30'
                            : 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30'
                        }`}>
                          {item.is_published ? t('status.published') : t('status.draft')}
                        </span>
                        {item.is_hero && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30">
                            {t('status.hero')}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-[var(--brand-light)]/40">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.published_at).toLocaleDateString()}
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
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.article')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.author')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.created')}</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {articles.map(item => (
                  <tr key={item.id} className="border-b border-[var(--dark-600)]/50 hover:bg-[var(--dark-700)]/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--dark-600)] border border-[var(--dark-500)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.hero_image ? (
                            <img src={getMediaUrl(item.hero_image) || ''} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="w-5 h-5 text-[var(--brand-primary)]" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-[var(--brand-light)]">{item.title}</div>
                          {item.is_hero && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30">
                              {t('status.hero')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        item.is_published 
                          ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30'
                          : 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30'
                      }`}>
                        {item.is_published ? t('status.published') : t('status.draft')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-[var(--brand-light)]/70">
                        <User className="w-4 h-4" />
                        {item.author_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-[var(--brand-light)]/70">
                        <Calendar className="w-4 h-4" />
                        {new Date(item.published_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={buildUrlWithParams(`${basePath}/${item.id}`)}>
                          <button className="w-9 h-9 rounded-lg hover:bg-[var(--brand-primary)]/20 text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] flex items-center justify-center transition-all">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <Link href={buildUrlWithParams(`${basePath}/edit/${item.id}`)}>
                          <button className="w-9 h-9 rounded-lg hover:bg-[var(--brand-blue)]/20 text-[var(--brand-light)]/60 hover:text-[var(--brand-blue)] flex items-center justify-center transition-all">
                            <Edit className="w-4 h-4" />
                          </button>
                        </Link>
                        <button 
                          onClick={() => setItemToDelete(item)}
                          className="w-9 h-9 rounded-lg hover:bg-[var(--brand-red)]/20 text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] flex items-center justify-center transition-all"
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
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4 px-4 sm:px-0">
          <button
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {t('pagination.previous')}
          </button>
          <span className="text-sm text-[var(--brand-light)]/50 px-2">
            {t('pagination.page')} <span className="text-[var(--brand-primary)] font-semibold">{currentPage}</span> {t('pagination.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalPages}</span>
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {t('pagination.next')}
          </button>
        </div>
      )}

      <ConfirmationModal 
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title={t('deleteModal.title')}
        message={t('deleteModal.message', { title: itemToDelete?.title || '' })}
        confirmButtonText={t('deleteModal.delete')}
        cancelButtonText={t('deleteModal.cancel')}
        variant="danger"
        darkMode={true}
      />
      </div>
  );
}
