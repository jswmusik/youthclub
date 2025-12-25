'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { inventoryApi, Item } from '@/lib/inventory-api';
import ItemTable from '@/app/components/inventory/ItemTable';
import { useAuth } from '@/context/AuthContext';
import { 
  Package, TrendingUp, Calendar, ChevronUp, ChevronDown, BarChart3, Search, X, Plus, 
  History, Tag, FolderOpen, Users
} from 'lucide-react';
import { ItemCategory } from '@/lib/inventory-api';
import Toast from '@/app/components/Toast';

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

function ItemCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center gap-2 mt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
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
  );
}

interface Analytics {
  total_items: number;
  borrowings_7d: number;
  borrowings_30d: number;
  borrowings_all_time: number;
}

export default function InventoryDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false });

  // Filter state
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
  
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;

  // Debounced filter update
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) params.set('search', searchInput); else params.delete('search');
      if (selectedCategory) params.set('category', selectedCategory); else params.delete('category');
      if (selectedStatus) params.set('status', selectedStatus); else params.delete('status');
      params.set('page', '1');
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, selectedCategory, selectedStatus]);

  // Load analytics and categories
  useEffect(() => {
    if (user?.assigned_club) {
      loadAnalytics();
      loadCategories();
    }
  }, [user]);

  // Load items when URL params change
  useEffect(() => {
    if (user?.assigned_club) {
      loadItems();
    }
  }, [user, searchParams]);

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const data = await inventoryApi.getAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to load analytics", error);
    } finally {
      setAnalyticsLoading(false);
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

  const loadItems = async () => {
    if (!user?.assigned_club) return;
    
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();
    
    try {
      const search = searchParams.get('search') || '';
      const category = searchParams.get('category') ? Number(searchParams.get('category')) : undefined;
      const status = searchParams.get('status') || '';
      const page = Number(searchParams.get('page')) || 1;
      
      const response = await inventoryApi.getItems(user.assigned_club.id, search, category, page, pageSize);
      
      let itemsList: Item[] = [];
      let total = 0;
      
      if (Array.isArray(response)) {
        itemsList = response;
        total = response.length;
      } else {
        itemsList = response.results || [];
        total = response.count || (response.results?.length || 0);
      }
      
      // Apply status filter on frontend
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
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const searchParam = searchParams.get('search');
    const categoryParam = searchParams.get('category');
    const statusParam = searchParams.get('status');
    
    if (page && page !== '1') params.set('page', page);
    if (searchParam) params.set('search', searchParam);
    if (categoryParam) params.set('category', categoryParam);
    if (statusParam) params.set('status', statusParam);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const clearFilters = () => {
    setSearchInput('');
    setSelectedCategory('');
    setSelectedStatus('');
    router.push(pathname);
  };

  const handleDeleteSuccess = () => {
    setToast({ 
      message: 'Item deleted successfully!', 
      type: 'success', 
      isVisible: true 
    });
    loadItems();
  };

  const handleDeleteError = (errorMessage: string) => {
    setToast({ 
      message: errorMessage, 
      type: 'error', 
      isVisible: true 
    });
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

  const hasFilters = searchInput || selectedCategory || selectedStatus;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (!user?.assigned_club) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--brand-light)]/60">Loading club data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-8 px-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Inventory</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">Manage items available for borrowing.</p>
          </div>
          <div className="flex flex-wrap gap-2 px-4 sm:px-0">
            <Link href="/admin/club/inventory/history">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium">
                <History className="h-4 w-4" /> History
              </button>
            </Link>
            <Link href="/admin/club/inventory/borrowed">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium">
                <Users className="h-4 w-4" /> Borrowed
              </button>
            </Link>
            <Link href="/admin/club/inventory/create">
              <button className="flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-2 transition-all">
                <Plus className="h-4 w-4" /> Add Item
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
                <h3 className="text-sm font-semibold text-[var(--brand-light)]">Analytics Dashboard</h3>
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
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Total Items</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_items}</div>
                </div>

                {/* Borrowings Last 7 Days */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[#38BDF8] flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Last 7 Days</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.borrowings_7d}</div>
                </div>

                {/* Borrowings Last 30 Days */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-[var(--dark-900)]" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Last 30 Days</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{analytics.borrowings_30d}</div>
                </div>

                {/* All Time Borrowings */}
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center">
                      <History className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">All Time</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-peach)]">{analytics.borrowings_all_time}</div>
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
                placeholder="Search by name or tag..." 
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
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  style={selectArrowStyle}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-[140px]">
                <select 
                  className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  style={selectArrowStyle}
                >
                  <option value="">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="BORROWED">Borrowed</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="MISSING">Missing</option>
                  <option value="HIDDEN">Hidden</option>
                </select>
              </div>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-xl transition-all flex items-center gap-2"
                >
                  <X className="h-4 w-4" /> Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        {!showSkeleton && items.length > 0 && (
          <div className="px-4 sm:px-6">
            <p className="text-sm text-[var(--brand-light)]/50">
              Showing <span className="text-[var(--brand-primary)] font-semibold">{items.length}</span> of <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> {totalCount === 1 ? 'item' : 'items'}
            </p>
          </div>
        )}

        {/* Content */}
        {showSkeleton ? (
          <>
            {/* Mobile Cards Skeleton */}
            <div className="flex flex-col md:hidden">
              {[...Array(4)].map((_, i) => (
                <ItemCardSkeleton key={i} />
              ))}
            </div>

            {/* Desktop Table Skeleton */}
            <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden mx-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--dark-600)]">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Item</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Category</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Queue</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <ItemTableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <ItemTable 
            items={items} 
            basePath="/admin/club/inventory" 
            onDelete={handleDeleteSuccess}
            onDeleteError={handleDeleteError}
            buildUrlWithParams={buildUrlWithParams}
          />
        )}

        {/* Pagination */}
        {!showSkeleton && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 py-4 px-4 sm:px-0">
            <button 
              disabled={currentPage === 1} 
              onClick={() => handlePageChange(currentPage - 1)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="text-sm text-[var(--brand-light)]/50">
              Page <span className="text-[var(--brand-primary)] font-semibold">{currentPage}</span> of <span className="text-[var(--brand-primary)] font-semibold">{totalPages}</span>
            </div>
            <button 
              disabled={currentPage >= totalPages} 
              onClick={() => handlePageChange(currentPage + 1)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Toast Notification */}
        <Toast 
          message={toast.message} 
          type={toast.type} 
          isVisible={toast.isVisible} 
          onClose={() => setToast({ ...toast, isVisible: false })}
          darkMode
        />
      </div>
    </div>
  );
}
