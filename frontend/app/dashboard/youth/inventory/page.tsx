'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { useAuth } from '@/context/AuthContext';
import { inventoryApi, Item, ItemCategory } from '@/lib/inventory-api';
import InventoryCard from '@/app/components/inventory/InventoryCard';
import NavBar from '@/app/components/NavBar';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import { InventoryPageSkeleton } from '@/app/components/ui/Skeleton';
import Footer from '@/app/components/Footer';
import { visits } from '@/lib/api';
import { LogIn, Package, Search, X } from 'lucide-react';

// Minimum skeleton display time (in ms) for better UX
const MIN_LOADING_TIME = 400;


export default function InventoryBrowserPage() {
  const { user } = useAuth();
  const pathname = usePathname();
  const t = useTranslations('inventory');
  const tSidebar = useTranslations('sidebar');
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Theme detection - default to light mode for member pages
  useEffect(() => {
    setMounted(true);
  }, []);
  const darkMode = mounted && theme === 'dark';
  
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
      <div className={`min-h-screen ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-gray-50'}`}>
        <NavBar darkMode={darkMode} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
        <div className="pt-20 px-4">
          <div className="max-w-2xl mx-auto">
            <div className={`p-8 rounded-none sm:rounded-2xl border text-center ${
              darkMode 
                ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
                : 'bg-white border-[#4D4DA4]/15 shadow-sm'
            }`}>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                darkMode ? 'bg-[var(--brand-peach)]/20' : 'bg-[#FF8C42]/10'
              }`}>
                <LogIn className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-peach)]' : 'text-[#FF8C42]'}`} />
              </div>
              <h3 className={`text-2xl font-bold mb-3 font-heading ${
                darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
              }`}>{t('noClubAvailable')}</h3>
              <p className={darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}>
                {t('noClubAvailableMessage')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-gray-50'}`}>
      <div className="flex-1">
      <NavBar darkMode={darkMode} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      
      {/* Mobile Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-screen w-64 z-50 border-r transform transition-transform duration-300 md:hidden ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
            : 'bg-white border-[#4D4DA4]/15'
        } ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`flex items-center justify-between p-4 border-b ${
          darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/15'
        }`}>
          <h1 className={`text-xl font-bold font-heading ${
            darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
          }`}>{tSidebar('menu')}</h1>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg ${
              darkMode 
                ? 'text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)] hover:text-[var(--brand-light)]' 
                : 'text-gray-500 hover:bg-[#EBEBFE] hover:text-gray-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-64px)]">
          <YouthSidebar activePath={pathname} darkMode={darkMode} />
        </div>
      </aside>
      
      {/* Main Layout */}
      <div className="pt-14 sm:pt-16">
        <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 relative">
          {/* Desktop Sidebar - Fixed position aligned with container */}
          <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
            <YouthSidebar activePath={pathname} darkMode={darkMode} />
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
                      <Package className={`w-6 h-6 sm:w-7 sm:h-7 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`} />
                      <h1 className={`text-2xl sm:text-3xl md:text-4xl font-heading font-bold ${
                        darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
                      }`}>
                        {t('borrowItems')}
                      </h1>
                    </div>
                    {activeClubName && (
                      <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 border rounded-xl ml-8 sm:ml-10 inline-flex ${
                        isCheckedIn 
                          ? darkMode 
                            ? 'bg-[var(--brand-third)]/10 border-[var(--brand-third)]/30' 
                            : 'bg-[#10B981]/10 border-[#10B981]/30'
                          : darkMode 
                            ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' 
                            : 'bg-[#EBEBFE] border-[#4D4DA4]/15'
                      }`}>
                        <span className={`text-xs sm:text-sm font-bold ${
                          isCheckedIn 
                            ? darkMode ? 'text-[var(--brand-third)]' : 'text-[#10B981]'
                            : darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                        }`}>
                          {isCheckedIn ? t('checkedInTo') : t('viewing')} {activeClubName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Check-in Warning */}
                  {!isCheckedIn && (
                    <div className={`mb-4 sm:mb-6 mx-0 sm:mx-0 p-4 border-y sm:border sm:rounded-2xl flex items-start gap-3 ${
                      darkMode 
                        ? 'bg-[var(--brand-peach)]/10 border-[var(--brand-peach)]/30' 
                        : 'bg-[#FF8C42]/10 border-[#FF8C42]/30'
                    }`}>
                      <LogIn className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        darkMode ? 'text-[var(--brand-peach)]' : 'text-[#FF8C42]'
                      }`} />
                      <div className="flex-1">
                        <p className={`text-sm font-bold mb-1 ${
                          darkMode ? 'text-[var(--brand-peach)]' : 'text-[#FF8C42]'
                        }`}>
                          {t('checkInRequired')}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                          {t('checkInRequiredMessage', { clubName: activeClubName })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Filters Section */}
                  <div className={`mb-4 sm:mb-6 rounded-none sm:rounded-2xl border-y sm:border p-3 sm:p-4 ${
                    darkMode 
                      ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
                      : 'bg-white border-[#4D4DA4]/15 sm:shadow-sm'
                  }`}>
                    {/* Search Bar */}
                    <div className="relative mb-3">
                      <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                        darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'
                      }`} />
                      <input 
                        type="text" 
                        placeholder={t('searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full border rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 transition-all font-medium ${
                          darkMode 
                            ? 'bg-[var(--dark-700)] border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)]' 
                            : 'bg-[#EBEBFE]/50 border-[#4D4DA4]/20 text-gray-900 placeholder-gray-400 focus:ring-[#4D4DA4]/30 focus:border-[#4D4DA4]'
                        }`}
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                            darkMode ? 'text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]/60' : 'text-gray-400 hover:text-gray-600'
                          }`}
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
                            ? darkMode 
                              ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                              : 'bg-[#4D4DA4] text-white'
                            : darkMode 
                              ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]' 
                              : 'bg-[#EBEBFE] text-gray-600 hover:bg-[#4D4DA4]/20 hover:text-gray-800'
                        }`}
                      >
                        {t('allCategories')}
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            selectedCategory === category.id
                              ? darkMode 
                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                : 'bg-[#4D4DA4] text-white'
                              : darkMode 
                                ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]' 
                                : 'bg-[#EBEBFE] text-gray-600 hover:bg-[#4D4DA4]/20 hover:text-gray-800'
                          }`}
                        >
                          <span>{category.icon}</span>
                          <span>{category.name}</span>
                        </button>
                      ))}
                      {(searchTerm || selectedCategory) && (
                        <button
                          onClick={() => { setSearchTerm(''); setSelectedCategory(null); }}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ml-auto ${
                            darkMode 
                              ? 'text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10' 
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          {t('clear')}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Results Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-4 px-4 sm:px-0">
                    {filteredItems.map(item => (
                      <InventoryCard key={item.id} item={item} onRefresh={loadItems} darkMode={darkMode} />
                    ))}
                  </div>

                  {/* Empty State */}
                  {filteredItems.length === 0 && (
                    <div className="text-center py-12 sm:py-20 px-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                        darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'
                      }`}>
                        <Package className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-light)]/30' : 'text-[#4D4DA4]/30'}`} />
                      </div>
                      <h3 className={`text-xl font-bold mb-2 font-heading ${
                        darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
                      }`}>{t('noItemsFoundTitle')}</h3>
                      <p className={`max-w-sm mx-auto ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                        {searchTerm || selectedCategory 
                          ? t('noItemsFoundMessage')
                          : t('noItemsAvailableAtClub', { clubName: activeClubName })}
                      </p>
                      {(searchTerm || selectedCategory) && (
                        <button 
                          onClick={() => { setSearchTerm(''); setSelectedCategory(null); }}
                          className={`mt-4 px-6 py-2.5 rounded-xl font-bold transition-all active:scale-95 ${
                            darkMode 
                              ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/90' 
                              : 'bg-[#4D4DA4] text-white hover:bg-[#3D3D94]'
                          }`}
                        >
                          {t('clearAllFilters')}
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
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
