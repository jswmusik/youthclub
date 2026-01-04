'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { inventoryApi, Item, ClubOption, ItemCategory } from '@/lib/inventory-api';
import ItemTable from '@/app/components/inventory/ItemTable';
import { Package, TrendingUp, Calendar, Clock, ChevronUp, ChevronDown, BarChart3, Search, X, Plus, History } from 'lucide-react';
import { useToast } from '../../../../hooks/useToast';

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

function AnalyticsCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)]">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

interface Analytics {
  total_items: number;
  borrowings_7d: number;
  borrowings_30d: number;
  borrowings_all_time: number;
}

export default function MuniInventoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('inventoryAdmin');
  
  const [items, setItems] = useState<Item[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const { success, error, info, warning } = useToast();
  
  // Filter state
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [selectedClub, setSelectedClub] = useState(searchParams.get('club') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
  
  // Track initial values to detect actual user changes
  const initialSearchRef = useRef(searchParams.get('search') || '');
  const initialClubRef = useRef(searchParams.get('club') || '');
  const initialCategoryRef = useRef(searchParams.get('category') || '');
  const initialStatusRef = useRef(searchParams.get('status') || '');
  const hasUserChangedFilters = useRef(false);
  
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;

  // Debounced filter update - only reset page when user actually changes filters
  useEffect(() => {
    const searchChanged = searchInput !== initialSearchRef.current;
    const clubChanged = selectedClub !== initialClubRef.current;
    const categoryChanged = selectedCategory !== initialCategoryRef.current;
    const statusChanged = selectedStatus !== initialStatusRef.current;
    
    if (!searchChanged && !clubChanged && !categoryChanged && !statusChanged && !hasUserChangedFilters.current) {
      return;
    }
    
    hasUserChangedFilters.current = true;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) params.set('search', searchInput); else params.delete('search');
      if (selectedClub) params.set('club', selectedClub); else params.delete('club');
      if (selectedCategory) params.set('category', selectedCategory); else params.delete('category');
      if (selectedStatus) params.set('status', selectedStatus); else params.delete('status');
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
      
      // Update refs to current values
      initialSearchRef.current = searchInput;
      initialClubRef.current = selectedClub;
      initialCategoryRef.current = selectedCategory;
      initialStatusRef.current = selectedStatus;
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, selectedClub, selectedCategory, selectedStatus, searchParams, pathname, router]);

  useEffect(() => {
    loadClubs();
    loadCategories();
  }, []);

  useEffect(() => {
    loadItems();
    loadAnalytics();
  }, [searchParams]);

  const loadClubs = async () => {
    try {
      const data = await inventoryApi.getSelectableClubs();
      const clubsList = Array.isArray(data) ? data : (data.results || []);
      setClubs(clubsList);
    } catch (error) {
      console.error("Failed to load clubs", error);
      setClubs([]);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await inventoryApi.getCategories();
      const categoriesList = Array.isArray(data) ? data : (data.results || []);
      setCategories(categoriesList);
    } catch (error) {
      console.error("Failed to load categories", error);
      setCategories([]);
    }
  };

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const clubId = selectedClub ? Number(selectedClub) : undefined;
      const data = await inventoryApi.getAnalytics(clubId);
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to load analytics", error);
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadItems = useCallback(async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();
    
    try {
      const search = searchParams.get('search') || '';
      const club = searchParams.get('club') || '';
      const category = searchParams.get('category') || '';
      const status = searchParams.get('status') || '';
      const page = searchParams.get('page') || '1';
      
      const categoryId = category ? Number(category) : undefined;
      const clubId = club ? Number(club) : undefined;
      
      const response = await inventoryApi.getItems(
        clubId, 
        search, 
        categoryId, 
        Number(page), 
        pageSize
      );
      
      let itemsList: Item[] = [];
      let total = 0;
      
      if (Array.isArray(response)) {
        itemsList = response;
        total = response.length;
      } else {
        itemsList = response.results || [];
        total = response.count || (response.results?.length || 0);
      }
      
      // Apply status filter on frontend (backend doesn't support status filter yet)
      if (status) {
        itemsList = itemsList.filter((item: Item) => item.status === status);
      }
      
      setItems(itemsList);
      setTotalCount(total);
    } catch (error) {
      console.error("Failed to load inventory", error);
      setItems([]);
      setTotalCount(0);
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      
      setTimeout(() => {
        setLoading(false);
        setShowSkeleton(false);
      }, remaining);
    }
  }, [searchParams, pageSize]);

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const searchParam = searchParams.get('search');
    const clubParam = searchParams.get('club');
    const categoryParam = searchParams.get('category');
    const statusParam = searchParams.get('status');
    
    if (page && page !== '1') params.set('page', page);
    if (searchParam) params.set('search', searchParam);
    if (clubParam) params.set('club', clubParam);
    if (categoryParam) params.set('category', categoryParam);
    if (statusParam) params.set('status', statusParam);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const clearFilters = () => {
    setSearchInput('');
    setSelectedClub('');
    setSelectedCategory('');
    setSelectedStatus('');
    router.push(pathname);
  };

  const handleDeleteSuccess = () => {
    success('Item deleted successfully!');
    loadItems();
  };

  const handleDeleteError = (errorMessage: string) => {
    error(errorMessage);
  };

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

  const hasFilters = searchInput || selectedClub || selectedCategory || selectedStatus;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-6 md:py-8 px-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
              <Package className="w-5 h-5 text-[var(--dark-900)]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
          </div>
          <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
        </div>
        <div className="flex flex-wrap gap-2 pl-[52px] sm:pl-0">
          <Link href="/admin/municipality/inventory/history">
            <button className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all">
              {t('actions.history')}
            </button>
          </Link>
          <Link href="/admin/municipality/inventory/borrowed">
            <button className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all">
              {t('actions.borrowed')}
            </button>
          </Link>
          <Link href={buildUrlWithParams("/admin/municipality/inventory/create")}>
            <button className="flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-4 py-2.5 transition-all text-sm">
              <Plus className="h-4 w-4" /> {t('actions.addItem')}
            </button>
          </Link>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {!analyticsLoading && analytics && (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <button 
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[var(--dark-700)]/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-[var(--brand-purple)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--brand-light)]">{t('analyticsDashboard')}</h3>
              {selectedClub && (
                <span className="text-xs text-[var(--brand-light)]/50 ml-2">
                  ({clubs.find(c => String(c.id) === selectedClub)?.name || t('selectedClub')})
                </span>
              )}
              {!selectedClub && (
                <span className="text-xs text-[var(--brand-light)]/50 ml-2">
                  ({t('allClubs')})
                </span>
              )}
            </div>
            {analyticsExpanded ? (
              <ChevronUp className="h-4 w-4 text-[var(--brand-light)]/50" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[var(--brand-light)]/50" />
            )}
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* Total Items */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                    <Package className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.totalItems')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_items}</div>
              </div>

              {/* Borrowings Last 7 Days */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.last7Days')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.borrowings_7d}</div>
              </div>

              {/* Borrowings Last 30 Days */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.last30Days')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.borrowings_30d}</div>
              </div>

              {/* All Time Borrowings */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)] flex items-center justify-center">
                    <History className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.allTime')}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.borrowings_all_time}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Loading Skeleton */}
      {analyticsLoading && (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <AnalyticsCardSkeleton key={i} />
              ))}
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
                value={selectedClub}
                onChange={e => setSelectedClub(e.target.value)}
                style={selectArrowStyle}
              >
                <option value="">{t('filters.allClubs')}</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="w-full sm:w-[180px]">
              <select 
                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                style={selectArrowStyle}
              >
                <option value="">{t('filters.allCategories')}</option>
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>{t('filters.noCategoriesAvailable')}</option>
                )}
              </select>
            </div>
            
            <div className="w-full sm:w-[180px]">
              <select 
                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                style={selectArrowStyle}
              >
                <option value="">{t('filters.allStatuses')}</option>
                <option value="AVAILABLE">{t('filters.available')}</option>
                <option value="BORROWED">{t('filters.borrowed')}</option>
                <option value="MAINTENANCE">{t('filters.maintenance')}</option>
                <option value="MISSING">{t('filters.missing')}</option>
                <option value="HIDDEN">{t('filters.hidden')}</option>
              </select>
            </div>
            
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-xl transition-all flex items-center gap-2"
              >
                <X className="h-4 w-4" /> {t('filters.clearAll')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {!showSkeleton && items.length > 0 && (
        <div className="px-4 sm:px-6 md:px-8">
          <p className="text-sm text-[var(--brand-light)]/50">
            {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{items.length}</span> {t('statsBar.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> {totalCount === 1 ? t('statsBar.item') : t('statsBar.items')}
          </p>
        </div>
      )}

      {/* Content */}
      {showSkeleton ? (
        <div className="px-4 sm:px-6 md:px-8">
          <div className="flex flex-col gap-3 md:hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-4 w-24" />
                    <div className="flex items-center gap-2 mt-2">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--dark-600)]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.item')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.category')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.queue')}</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-[var(--dark-600)]/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Skeleton className="w-9 h-9 rounded-lg" />
                        <Skeleton className="w-9 h-9 rounded-lg" />
                        <Skeleton className="w-9 h-9 rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="px-4 sm:px-6 md:px-8">
          <ItemTable 
            items={items} 
            basePath="/admin/municipality/inventory" 
            onDelete={handleDeleteSuccess}
            onDeleteError={handleDeleteError}
            buildUrlWithParams={buildUrlWithParams}
          />
        </div>
      )}

      {/* Pagination */}
      {!showSkeleton && totalPages > 1 && (
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
      )}

      {/* Toast Notification */}
      </div>
  );
}
