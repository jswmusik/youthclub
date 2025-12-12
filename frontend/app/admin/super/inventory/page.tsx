'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { inventoryApi, Item, ClubOption, ItemCategory } from '@/lib/inventory-api';
import ItemTable from '@/app/components/inventory/ItemTable';
import { Package, TrendingUp, Calendar, Clock, ChevronUp, BarChart3, Search, X, Plus } from 'lucide-react';
import Toast from '@/app/components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Global Inventory</h1>
          <p className="text-gray-500 mt-1">Manage items across all clubs in the system.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/super/inventory/history">
            <Button variant="outline" className="text-gray-600 hover:text-gray-900 hover:bg-gray-50">
              View History
            </Button>
          </Link>
          <Link href="/admin/super/inventory/borrowed">
            <Button variant="outline" className="text-gray-600 hover:text-gray-900 hover:bg-gray-50">
              Currently Borrowed
            </Button>
          </Link>
          <Link href="/admin/super/inventory/categories">
            <Button variant="outline" className="text-gray-600 hover:text-gray-900 hover:bg-gray-50">
              Categories
            </Button>
          </Link>
          <Link href="/admin/super/inventory/tags">
            <Button variant="outline" className="text-gray-600 hover:text-gray-900 hover:bg-gray-50">
              Tags
            </Button>
          </Link>
          <Link href="/admin/super/inventory/create">
            <Button className="gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Analytics */}
      <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-500">Analytics</h3>
            {selectedClub && (
              <span className="text-xs text-gray-400 ml-2">
                ({clubs.find(c => String(c.id) === selectedClub)?.name || 'Selected Club'})
              </span>
            )}
            {!selectedClub && (
              <span className="text-xs text-gray-400 ml-2">
                (All Clubs)
              </span>
            )}
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0 h-8">
              <ChevronUp className={cn(
                "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                analyticsExpanded ? "rotate-0" : "rotate-180"
              )} />
              <span className="sr-only">Toggle Analytics</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-2">
          {analyticsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-[#EBEBFE]/30 border-none shadow-sm animate-pulse">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 h-4 bg-gray-200 rounded w-24"></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* Total Items */}
              <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total_items}</div>
                </CardContent>
              </Card>

              {/* Borrowings Last 7 Days */}
              <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Last 7 Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.borrowings_7d}</div>
                </CardContent>
              </Card>

              {/* Borrowings Last 30 Days */}
              <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Last 30 Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.borrowings_30d}</div>
                </CardContent>
              </Card>

              {/* All Time Borrowings */}
              <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">All Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.borrowings_all_time}</div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </CollapsibleContent>
      </Collapsible>

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <div className="p-4 space-y-4">
          {/* Main Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Search - Takes more space on larger screens */}
            <div className="relative md:col-span-4 lg:col-span-3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search by name or tag..." 
                className="pl-9 bg-gray-50 border-0"
                value={search}
                onChange={e => updateUrl('search', e.target.value)}
              />
            </div>
            
            {/* Club Filter */}
            <div className="md:col-span-2 lg:col-span-2">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={selectedClub} 
                onChange={e => updateUrl('club', e.target.value)}
              >
                <option value="">All Clubs</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Category Filter */}
            <div className="md:col-span-2 lg:col-span-2">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={selectedCategory || ''} 
                onChange={e => updateUrl('category', e.target.value)}
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
            
            {/* Status Filter */}
            <div className="md:col-span-2 lg:col-span-2">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={selectedStatus} 
                onChange={e => updateUrl('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="BORROWED">Borrowed</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="MISSING">Missing</option>
                <option value="HIDDEN">Hidden</option>
              </select>
            </div>
            
            {/* Clear Button */}
            <div className="md:col-span-2 lg:col-span-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
              >
                <X className="h-4 w-4" /> Clear
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex justify-center text-gray-400">
          <div className="animate-pulse">Loading...</div>
        </div>
      ) : (
        <ItemTable 
          items={items} 
          basePath="/admin/super/inventory" 
          onDelete={handleDeleteSuccess}
          onDeleteError={handleDeleteError}
          buildUrlWithParams={buildUrlWithParams}
        />
      )}

      {/* Pagination */}
      {(() => {
        const totalPages = Math.ceil(totalCount / pageSize);
        if (totalPages <= 1) return null;
        
        return (
          <div className="flex items-center justify-center gap-2 py-4">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === 1} 
              onClick={() => updateUrl('page', (currentPage - 1).toString())}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              Prev
            </Button>
            <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage >= totalPages} 
              onClick={() => updateUrl('page', (currentPage + 1).toString())}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              Next
            </Button>
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

