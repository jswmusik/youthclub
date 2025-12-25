'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';
import { inventoryApi, Item, ItemCategory } from '@/lib/inventory-api';
import InventoryCard from '@/app/components/inventory/InventoryCard';
import NavBar from '@/app/components/NavBar';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import { InventoryPageSkeleton } from '@/app/components/ui/Skeleton';
import YouthFooter from '@/app/components/youth/YouthFooter';
import { visits } from '@/lib/api';
import { LogIn, Package, Search, X } from 'lucide-react';

// Minimum skeleton display time (in ms) for better UX
const MIN_LOADING_TIME = 400;


export default function InventoryBrowserPage() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Active club ID - determined by check-in status or preferred club
  const [activeClubId, setActiveClubId] = useState<number | null>(null);
  const [activeClubName, setActiveClubName] = useState<string>('');
  const [checkingClub, setCheckingClub] = useState(true);
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);

  // Minimum loading time for skeleton display
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingComplete(true);
    }, MIN_LOADING_TIME);
    return () => clearTimeout(timer);
  }, []);

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

  // Show skeleton while checking club or loading items (with minimum display time)
  const showSkeleton = checkingClub || loading || !minLoadingComplete;

  if (!activeClubId && !checkingClub && minLoadingComplete) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)]">
        <NavBar darkMode={true} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
        <div className="pt-20 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-[var(--dark-800)] p-8 rounded-none sm:rounded-2xl border border-[var(--dark-600)] text-center">
              <div className="w-16 h-16 bg-[var(--brand-peach)]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-8 h-8 text-[var(--brand-peach)]" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--brand-light)] mb-3 font-heading">No Club Available</h3>
              <p className="text-[var(--brand-light)]/60">
                You need to be checked in to a club or have a preferred club set to browse inventory items.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <NavBar darkMode={true} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      
      {/* Mobile Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-screen w-64 z-50 bg-[var(--dark-800)] border-r border-[var(--dark-600)] transform transition-transform duration-300 md:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--dark-600)]">
          <h1 className="text-xl font-bold text-[var(--brand-light)] font-heading">Menu</h1>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)] hover:text-[var(--brand-light)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-64px)]">
          <YouthSidebar activePath={pathname} darkMode={true} />
        </div>
      </aside>
      
      {/* Main Layout */}
      <div className="pt-14 sm:pt-16">
        <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 relative">
          {/* Desktop Sidebar - Fixed position aligned with container */}
          <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 bg-[var(--dark-900)] z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
            <YouthSidebar activePath={pathname} darkMode={true} />
          </aside>
          
          {/* Content wrapper with left margin for sidebar */}
          <div className="md:ml-60">
            <main className="p-0 sm:p-4 md:p-6 pb-24 md:pb-6">
              {showSkeleton ? (
                <InventoryPageSkeleton />
              ) : (
                <>
                  {/* Header Section */}
                  <div className="mb-4 sm:mb-6 px-4 sm:px-0 pt-4 sm:pt-0">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <Package className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--brand-primary)]" />
                      <h1 className="text-2xl sm:text-3xl md:text-4xl text-[var(--brand-light)] font-heading font-bold">
                        Borrow Items
                      </h1>
                    </div>
                    {activeClubName && (
                      <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 border rounded-xl ml-8 sm:ml-10 inline-flex ${
                        isCheckedIn 
                          ? 'bg-[var(--brand-third)]/10 border-[var(--brand-third)]/30' 
                          : 'bg-[var(--dark-700)] border-[var(--dark-600)]'
                      }`}>
                        <span className={`text-xs sm:text-sm font-bold ${
                          isCheckedIn ? 'text-[var(--brand-third)]' : 'text-[var(--brand-light)]/60'
                        }`}>
                          {isCheckedIn ? '✓ Checked in to' : 'Viewing'} {activeClubName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Check-in Warning */}
                  {!isCheckedIn && (
                    <div className="mb-4 sm:mb-6 mx-0 sm:mx-0 p-4 bg-[var(--brand-peach)]/10 border-y sm:border border-[var(--brand-peach)]/30 sm:rounded-2xl flex items-start gap-3">
                      <LogIn className="w-5 h-5 text-[var(--brand-peach)] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-[var(--brand-peach)] mb-1">
                          Check in required to borrow
                        </p>
                        <p className="text-xs text-[var(--brand-light)]/60">
                          You're viewing items from your preferred club. Check in to {activeClubName} to borrow items.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Filters Section */}
                  <div className="mb-4 sm:mb-6 bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-3 sm:p-4">
                    {/* Search Bar */}
                    <div className="relative mb-3">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 w-5 h-5" />
                      <input 
                        type="text" 
                        placeholder="Search for an item..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl py-3 pl-12 pr-4 text-sm text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] transition-all font-medium"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]/60"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Category Filter Chips */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedCategory === null
                            ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                            : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]'
                        }`}
                      >
                        All Categories
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            selectedCategory === category.id
                              ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                              : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]'
                          }`}
                        >
                          <span>{category.icon}</span>
                          <span>{category.name}</span>
                        </button>
                      ))}
                      {(searchTerm || selectedCategory) && (
                        <button
                          onClick={() => { setSearchTerm(''); setSelectedCategory(null); }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all ml-auto"
                        >
                          <X className="w-3.5 h-3.5" />
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Results Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-4 px-4 sm:px-0">
                    {filteredItems.map(item => (
                      <InventoryCard key={item.id} item={item} onRefresh={loadItems} darkMode={true} />
                    ))}
                  </div>

                  {/* Empty State */}
                  {filteredItems.length === 0 && (
                    <div className="text-center py-12 sm:py-20 px-4">
                      <div className="w-16 h-16 bg-[var(--dark-700)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-[var(--brand-light)]/30" />
                      </div>
                      <h3 className="text-xl font-bold text-[var(--brand-light)] mb-2 font-heading">No items found</h3>
                      <p className="text-[var(--brand-light)]/60 max-w-sm mx-auto">
                        {searchTerm || selectedCategory 
                          ? "Try adjusting your filters or search terms to find more items."
                          : `No items available at ${activeClubName} right now.`}
                      </p>
                      {(searchTerm || selectedCategory) && (
                        <button 
                          onClick={() => { setSearchTerm(''); setSelectedCategory(null); }}
                          className="mt-4 bg-[var(--brand-primary)] text-[var(--dark-900)] px-6 py-2.5 rounded-xl font-bold hover:bg-[var(--brand-primary)]/90 transition-all active:scale-95"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <YouthFooter />
    </div>
  );
}
