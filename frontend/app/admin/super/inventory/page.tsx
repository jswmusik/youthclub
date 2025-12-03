'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { inventoryApi, Item, ClubOption, ItemCategory } from '@/lib/inventory-api';
import ItemTable from '@/app/components/inventory/ItemTable';
import { Package, TrendingUp, Calendar, Clock, ChevronDown, BarChart3, Filter } from 'lucide-react';
import Toast from '@/app/components/Toast';

interface Analytics {
  total_items: number;
  borrowings_7d: number;
  borrowings_30d: number;
  borrowings_all_time: number;
}

export default function SuperInventoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [items, setItems] = useState<Item[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false });
  
  // Get filter values from URL
  const search = searchParams.get('search') || '';
  const selectedClub = searchParams.get('club') || '';
  const selectedCategory = searchParams.get('category') ? Number(searchParams.get('category')) : null;
  const selectedStatus = searchParams.get('status') || '';
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;

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
      // If club is selected, pass clubId; otherwise pass undefined for aggregated results
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

  const loadItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Add filters from URL
      if (selectedClub) params.append('club', selectedClub);
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', String(selectedCategory));
      
      // Add pagination
      params.append('page', String(currentPage));
      params.append('page_size', String(pageSize));
      
      const response = await inventoryApi.getItems(
        selectedClub || undefined, 
        search, 
        selectedCategory || undefined, 
        currentPage, 
        pageSize
      );
      
      // Handle paginated response (results) or direct array
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
      if (selectedStatus) {
        itemsList = itemsList.filter((item: Item) => item.status === selectedStatus);
      }
      
      setItems(itemsList);
      setTotalCount(total);
    } catch (error) {
      console.error("Failed to load inventory", error);
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset page to 1 when filters change (except when changing page itself)
    if (key !== 'page') {
      params.set('page', '1');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

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

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Global Inventory</h1>
          <p className="text-slate-500">Manage items across all clubs in the system.</p>
        </div>
        <div className="flex gap-2">
          <Link 
            href="/admin/super/inventory/history"
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
          >
            View History
          </Link>
          <Link 
            href="/admin/super/inventory/borrowed"
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
          >
            Currently Borrowed
          </Link>
          <Link 
            href="/admin/super/inventory/categories"
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
          >
            Categories
          </Link>
          <Link 
            href="/admin/super/inventory/tags"
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
          >
            Tags
          </Link>
          <Link 
            href="/admin/super/inventory/create"
            className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 flex items-center gap-2 transition-colors"
          >
            <span>+</span> Add Item
          </Link>
        </div>
      </div>

      {/* Analytics Dashboard - Collapsible */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Analytics Header */}
        <button
          onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Analytics Dashboard</span>
            {selectedClub && (
              <span className="text-xs text-gray-500 ml-2">
                ({clubs.find(c => String(c.id) === selectedClub)?.name || 'Selected Club'})
              </span>
            )}
            {!selectedClub && (
              <span className="text-xs text-gray-500 ml-2">
                (All Clubs)
              </span>
            )}
          </div>
          <ChevronDown 
            className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${analyticsExpanded ? 'rotate-180' : ''}`}
          />
        </button>

          {/* Analytics Cards - Collapsible */}
          <div 
            className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${
              analyticsExpanded 
                ? 'max-h-[500px] opacity-100' 
                : 'max-h-0 opacity-0'
            } overflow-hidden`}
          >
            {analyticsLoading ? (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-gray-50 p-5 rounded-lg border border-gray-200 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : analytics ? (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Items */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Items</h3>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{analytics.total_items}</p>
                </div>

                {/* Borrowings Last 7 Days */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-emerald-300 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Last 7 Days</h3>
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-emerald-600">{analytics.borrowings_7d}</p>
                </div>

                {/* Borrowings Last 30 Days */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-purple-300 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Last 30 Days</h3>
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-purple-600">{analytics.borrowings_30d}</p>
                </div>

                {/* All Time Borrowings */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">All Time</h3>
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-indigo-600">{analytics.borrowings_all_time}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

      {/* Filters - Collapsible */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Filters Header */}
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Filters</span>
          </div>
          <ChevronDown 
            className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Filter Fields - Collapsible */}
        <div 
          className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${
            filtersExpanded 
              ? 'max-h-[1000px] opacity-100' 
              : 'max-h-0 opacity-0'
          } overflow-hidden`}
        >
          <div className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Club Filter */}
              <div className="w-64">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Club</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={selectedClub} 
                  onChange={(e) => updateUrl('club', e.target.value)}
        >
            <option value="">All Clubs</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
        </select>
              </div>

              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
        <input 
            type="text" 
                  placeholder="Search by name or tag..." 
                  className="w-full border rounded p-2 text-sm bg-gray-50"
            value={search}
                  onChange={(e) => updateUrl('search', e.target.value)}
                />
              </div>

              {/* Category */}
              <div className="w-48">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={selectedCategory || ''} 
                  onChange={(e) => updateUrl('category', e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No categories available</option>
                  )}
                </select>
              </div>

              {/* Status */}
              <div className="w-40">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={selectedStatus} 
                  onChange={(e) => updateUrl('status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="BORROWED">Borrowed</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="MISSING">Missing</option>
                  <option value="HIDDEN">Hidden</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading inventory...</div>
      ) : (
        <ItemTable 
          items={items} 
          basePath="/admin/super/inventory" 
          onDelete={handleDeleteSuccess}
          onDeleteError={handleDeleteError}
          buildUrlWithParams={buildUrlWithParams}
        />
      )}

      {/* Pagination Controls */}
      {(() => {
        const totalPages = Math.ceil(totalCount / pageSize);
        if (totalPages <= 1) return null;
        
        return (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
            <div className="flex flex-1 justify-between sm:hidden">
              <button 
                disabled={currentPage === 1}
                onClick={() => updateUrl('page', (currentPage - 1).toString())}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                disabled={currentPage >= totalPages}
                onClick={() => updateUrl('page', (currentPage + 1).toString())}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                  {' '}(Total: {totalCount})
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => updateUrl('page', (currentPage - 1).toString())}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    ← Prev
                  </button>
                  
                  {/* Simple Pagination Numbers */}
                  {[...Array(totalPages)].map((_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => updateUrl('page', p.toString())}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold 
                          ${p === currentPage 
                            ? 'bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' 
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => updateUrl('page', (currentPage + 1).toString())}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    Next →
                  </button>
                </nav>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast Notification */}
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast({ ...toast, isVisible: false })} 
      />
    </div>
  );
}

