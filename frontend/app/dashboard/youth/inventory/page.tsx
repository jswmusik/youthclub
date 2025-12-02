'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { inventoryApi, Item, ItemCategory } from '@/lib/inventory-api';
import InventoryCard from '@/app/components/inventory/InventoryCard';
import NavBar from '@/app/components/NavBar';
import { visits } from '@/lib/api';
import { LogIn } from 'lucide-react';

export default function InventoryBrowserPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  
  // Active club ID - determined by check-in status or preferred club
  const [activeClubId, setActiveClubId] = useState<number | null>(null);
  const [activeClubName, setActiveClubName] = useState<string>('');
  const [checkingClub, setCheckingClub] = useState(true);
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);

  // Determine which club to show items from
  useEffect(() => {
    const determineActiveClub = async () => {
      if (!user) {
        setCheckingClub(false);
        return;
      }

      try {
        // First, check if user is checked in
        const response = await visits.getMyActiveVisit();
        const activeVisit = response.data;
        
        if (activeVisit.is_checked_in && activeVisit.club_id) {
          // User is checked in - use that club
          setActiveClubId(activeVisit.club_id);
          setActiveClubName(activeVisit.club_name || '');
          setIsCheckedIn(true);
        } else {
          // User is not checked in - use preferred club
          const preferredClub = user.preferred_club;
          if (preferredClub) {
            const clubId = typeof preferredClub === 'object' ? preferredClub.id : preferredClub;
            const clubName = typeof preferredClub === 'object' ? preferredClub.name : '';
            setActiveClubId(clubId);
            setActiveClubName(clubName);
            setIsCheckedIn(false);
          } else {
            // No preferred club - can't show items
            setActiveClubId(null);
            setActiveClubName('');
            setIsCheckedIn(false);
          }
        }
      } catch (error) {
        console.error('Error determining active club:', error);
        // Fallback to preferred club
        const preferredClub = user?.preferred_club;
        if (preferredClub) {
          const clubId = typeof preferredClub === 'object' ? preferredClub.id : preferredClub;
          const clubName = typeof preferredClub === 'object' ? preferredClub.name : '';
          setActiveClubId(clubId);
          setActiveClubName(clubName);
          setIsCheckedIn(false);
        } else {
          setActiveClubId(null);
          setActiveClubName('');
        }
      } finally {
        setCheckingClub(false);
      }
    };

    determineActiveClub();
  }, [user]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await inventoryApi.getCategories();
      setCategories(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadItems = useCallback(async () => {
    if (!activeClubId) return;

    setLoading(true);
    try {
      const data = await inventoryApi.getClubItems(activeClubId, debouncedSearchTerm, selectedCategory || undefined);
      // Handle paginated response (results array) or direct array
      setItems(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeClubId, debouncedSearchTerm, selectedCategory]);
  
  // Debounce search term for API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);
  
  // Load items when club or filters change
  useEffect(() => {
    if (activeClubId && !checkingClub) {
      loadItems();
    } else {
      setItems([]);
      setLoading(false);
    }
  }, [activeClubId, debouncedSearchTerm, selectedCategory, loadItems, checkingClub]);

  // Client-side filtering for search (backend also filters, but this provides instant feedback)
  const filteredItems = items.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (checkingClub) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!activeClubId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="text-center">
              <div className="bg-orange-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Club Available</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                You need to be checked in to a club or have a preferred club set to browse inventory items.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* --- SIDEBAR FILTERS (Sticky) --- */}
          <aside className="w-full md:w-64 flex-shrink-0 space-y-8 md:sticky md:top-[72px] md:self-start md:max-h-[calc(100vh-88px)] md:overflow-y-auto">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
              <p className="text-sm text-gray-500 mt-1">Borrow Items</p>
              {activeClubName && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-xs font-medium text-blue-700">
                    {isCheckedIn ? '✓ Checked in to' : 'Viewing'} {activeClubName}
                  </span>
                </div>
              )}
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Search</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Find an item..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Category Filters */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category</label>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedCategory === null 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                      selectedCategory === category.id 
                        ? 'bg-blue-50 text-blue-700 font-medium' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* --- RESULTS GRID --- */}
          <main className="flex-1">
            {!isCheckedIn && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                <LogIn className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900 mb-1">
                    Check in required to borrow
                  </p>
                  <p className="text-xs text-orange-700">
                    You're viewing items from your preferred club. Check in to {activeClubName} to borrow items.
                  </p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <InventoryCard key={item.id} item={item} onRefresh={loadItems} />
              ))}
            </div>

            {filteredItems.length === 0 && !loading && (
              <div className="text-center py-20">
                <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">No items found</h3>
                <p className="text-gray-500 max-w-sm mx-auto mt-1">
                  {searchTerm || selectedCategory 
                    ? "Try adjusting your filters or search terms to find more items."
                    : `No items available at ${activeClubName} right now.`}
                </p>
                {(searchTerm || selectedCategory) && (
                  <button 
                    onClick={() => { setSearchTerm(''); setSelectedCategory(null); }}
                    className="mt-4 text-blue-600 font-medium hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
