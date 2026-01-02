'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Search, BarChart3, ChevronUp, Edit, Trash2, X, Tag, ArrowLeft, ChevronLeft } from 'lucide-react';
import api from '../../lib/api';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '../../hooks/useToast';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
}

function SwipeableCard({ children, onEdit, onDelete }: SwipeableCardProps) {
  const t = useTranslations('tagManager');
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
    if (isOpen) {
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

function TagCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

function TagTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
          <Skeleton className="h-5 w-28" />
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-32 rounded-lg" /></td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="w-9 h-9 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

function TagPageSkeleton() {
  const t = useTranslations('tagManager');
  return (
    <>
      {/* Mobile Cards Skeleton */}
      <div className="flex flex-col gap-3 md:hidden">
        {[...Array(4)].map((_, i) => (
          <TagCardSkeleton key={i} />
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--dark-600)]">
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.tag')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.slug')}</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <TagTableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface TagManagerProps {
  basePath: string;
}

export default function TagManager({ basePath }: TagManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('tagManager');
  
  const [tags, setTags] = useState<any[]>([]);
  const [allTagsForAnalytics, setAllTagsForAnalytics] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  
  // Track initial values to detect actual user changes
  const initialSearchRef = useRef(searchParams.get('search') || '');
  const hasUserChangedFilters = useRef(false);
  
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const { success, error, info, warning } = useToast();

  // Debounce search input - only reset page when user actually changes search
  useEffect(() => {
    const searchChanged = searchInput !== initialSearchRef.current;
    
    if (!searchChanged && !hasUserChangedFilters.current) {
      return;
    }
    
    hasUserChangedFilters.current = true;

    const timer = setTimeout(() => {
      updateUrl('search', searchInput);
      initialSearchRef.current = searchInput;
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchAllTagsForAnalytics();
  }, []);

  useEffect(() => {
    fetchTags();
  }, [searchParams]);

  const fetchAllTagsForAnalytics = async () => {
    try {
      let allTags: any[] = [];
      let page = 1;
      let totalCount = 0;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/news_tags/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) break;
        
        let pageTags: any[] = [];
        
        if (Array.isArray(responseData)) {
          pageTags = responseData;
          allTags = [...allTags, ...pageTags];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageTags = responseData.results;
          allTags = [...allTags, ...pageTags];
          
          if (page === 1) {
            totalCount = responseData.count || 0;
          }
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allTags.length >= totalCount;
          const gotEmptyPage = pageTags.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) break;
          page++;
        } else {
          break;
        }
      }
      
      setAllTagsForAnalytics(allTags);
    } catch (err) {
      console.error('Error fetching tags for analytics:', err);
      setAllTagsForAnalytics([]);
    }
  };

  const fetchTags = async () => {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      const page = searchParams.get('page') || '1';
      const search = searchParams.get('search') || '';
      
      const hasSearch = search && search.trim() !== '';
      
      let allTags: any[] = [];
      
      if (hasSearch) {
        let currentPage = 1;
        const pageSize = 100;
        const maxPages = 100;
        
        while (currentPage <= maxPages) {
          const params = new URLSearchParams();
          params.set('page', currentPage.toString());
          params.set('page_size', pageSize.toString());
          
          const res: any = await api.get(`/news_tags/?${params.toString()}`);
          const responseData: any = res?.data;
          
          if (!responseData) break;
          
          let pageTags: any[] = [];
          
          if (Array.isArray(responseData)) {
            pageTags = responseData;
            allTags = [...allTags, ...pageTags];
            break;
          } else if (responseData.results && Array.isArray(responseData.results)) {
            pageTags = responseData.results;
            allTags = [...allTags, ...pageTags];
            
            const hasNext = responseData.next !== null && responseData.next !== undefined;
            if (!hasNext || pageTags.length === 0) break;
            
            currentPage++;
          } else {
            break;
          }
        }
      } else {
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('page_size', '10');
        
        const res = await api.get(`/news_tags/?${params.toString()}`);
        allTags = Array.isArray(res.data) ? res.data : res.data.results || [];
        const count = Array.isArray(res.data) ? allTags.length : (res.data.count || allTags.length);
        setTotalCount(count);
      }
      
      let tagsData = allTags;
      
      if (hasSearch) {
        const searchLower = search.toLowerCase();
        tagsData = tagsData.filter((tag: any) => {
          const nameMatch = tag.name?.toLowerCase().includes(searchLower);
          const slugMatch = tag.slug?.toLowerCase().includes(searchLower);
          return nameMatch || slugMatch;
        });
      }
      
      if (hasSearch) {
        const pageSize = 10;
        const startIndex = (Number(page) - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        setTags(tagsData.slice(startIndex, endIndex));
        setTotalCount(tagsData.length);
      } else {
        setTags(tagsData);
      }
      
      // Ensure minimum loading time for skeleton
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_LOADING_TIME) {
        await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed));
      }
    } catch (err) { 
      console.error(err); 
    } 
    finally { 
      setLoading(false);
      setShowSkeleton(false);
    }
  };

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
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/news_tags/${itemToDelete.id}/`);
      success(t('toast.tagDeleted'));
      fetchTags();
      fetchAllTagsForAnalytics();
    } catch (err) {
      error(t('toast.failedToDelete'));
    } finally {
      setItemToDelete(null);
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    router.push(pathname);
  };

  const analytics = {
    total: allTagsForAnalytics.length,
  };

  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedTags = tags;
  const hasFilters = searchInput.trim() !== '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-0">
        <div className="flex flex-col gap-4">
          <Link 
            href="/admin/super/news"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium w-fit"
          >
            <ArrowLeft className="h-4 w-4" /> {t('backToNews')}
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                <Tag className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--dark-900)]" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
                <p className="text-[var(--brand-light)]/50 text-sm mt-0.5">{t('description')}</p>
              </div>
            </div>
            <Link href={buildUrlWithParams(`${basePath}/create`)}>
              <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-5 py-2.5 transition-all">
                <Plus className="h-4 w-4" /> {t('createTag')}
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)]">
        <button 
          onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--brand-primary)]" />
            <span className="text-sm font-semibold text-[var(--brand-light)]">{t('analytics.title')}</span>
          </div>
          <ChevronUp className={`h-4 w-4 text-[var(--brand-light)]/50 transition-transform duration-300 ${analyticsExpanded ? '' : 'rotate-180'}`} />
        </button>
        
        {analyticsExpanded && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-1 gap-3">
              {/* Total Tags */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                    <Tag className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.totalTags')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-primary)]">{analytics.total}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 py-3">
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
              onClick={clearFilters}
              className="text-[var(--brand-light)]/40 hover:text-[var(--brand-red)] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {!showSkeleton && paginatedTags.length > 0 && (
        <div className="px-4 sm:px-0">
          <p className="text-sm text-[var(--brand-light)]/50">
            {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{paginatedTags.length}</span> {t('statsBar.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> {totalCount === 1 ? t('statsBar.tag') : t('statsBar.tags')}
          </p>
        </div>
      )}

      {/* Content */}
      {showSkeleton ? (
        <TagPageSkeleton />
      ) : paginatedTags.length === 0 ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8 text-[var(--brand-light)]/30" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.noTagsFound')}</h3>
          <p className="text-[var(--brand-light)]/50 text-sm mb-6">
            {hasFilters ? t('emptyState.adjustSearch') : t('emptyState.getStarted')}
          </p>
          {!hasFilters && (
            <Link href={buildUrlWithParams(`${basePath}/create`)}>
              <button className="inline-flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
                <Plus className="h-4 w-4" /> {t('createTag')}
              </button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {paginatedTags.map((tag, index) => (
              <SwipeableCard
                key={tag.id}
                onEdit={() => router.push(buildUrlWithParams(`${basePath}/edit/${tag.id}`))}
                onDelete={() => setItemToDelete(tag)}
              >
                <div className="border-y border-[var(--dark-600)] p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/30 flex items-center justify-center flex-shrink-0">
                      <Tag className="w-5 h-5 text-[var(--brand-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-[var(--brand-light)] truncate">
                        {tag.name}
                      </h3>
                      <code className="text-xs text-[var(--brand-light)]/50 font-mono truncate block">
                        {tag.slug}
                      </code>
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
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.tag')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.slug')}</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTags.map((tag, index) => (
                  <tr 
                    key={tag.id} 
                    className={`${index !== paginatedTags.length - 1 ? 'border-b border-[var(--dark-600)]/50' : ''} hover:bg-[var(--dark-700)]/30 transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/30 flex items-center justify-center flex-shrink-0">
                          <Tag className="w-4 h-4 text-[var(--brand-primary)]" />
                        </div>
                        <span className="font-semibold text-[var(--brand-light)]">{tag.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm text-[var(--brand-light)]/60 bg-[var(--dark-600)] px-2.5 py-1 rounded-lg font-mono">
                        {tag.slug}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={buildUrlWithParams(`${basePath}/edit/${tag.id}`)}>
                          <button className="w-9 h-9 rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/10 flex items-center justify-center transition-all">
                            <Edit className="w-4 h-4" />
                          </button>
                        </Link>
                        <button 
                          onClick={() => setItemToDelete(tag)}
                          className="w-9 h-9 rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 flex items-center justify-center transition-all"
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
            onClick={() => updateUrl('page', (currentPage - 1).toString())}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {t('pagination.previous')}
          </button>
          <span className="text-sm text-[var(--brand-light)]/50">
            {t('pagination.page')} <span className="text-[var(--brand-primary)] font-semibold">{currentPage}</span> {t('pagination.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalPages}</span>
          </span>
          <button 
            disabled={currentPage >= totalPages} 
            onClick={() => updateUrl('page', (currentPage + 1).toString())}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {t('pagination.next')}
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal 
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title={t('deleteModal.title')}
        message={t('deleteModal.message', { name: itemToDelete?.name || '' })}
        confirmButtonText={t('deleteModal.delete')}
        cancelButtonText={t('deleteModal.cancel')}
        variant="danger"
        darkMode={true}
      />
      
      {/* Toast Notification */}
      </div>
  );
}
