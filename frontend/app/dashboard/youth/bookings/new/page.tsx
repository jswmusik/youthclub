'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import api from '../../../../../lib/api';
import BookingResourceCard from '../../../../components/bookings/youth/BookingResourceCard';
import NavBar from '../../../../components/NavBar';
import YouthSidebar from '../../../../components/youth/YouthSidebar';
import { NewBookingPageSkeleton } from '../../../../components/ui/Skeleton';
import { Calendar, Search, Building2, CalendarDays, X } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import Cookies from 'js-cookie';

// Minimum skeleton display time (in ms) for better UX
const MIN_LOADING_TIME = 400;

type FilterType = 'CLUB' | 'MUNICIPALITY';

export default function BrowseResourcesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const t = useTranslations('bookings.browseResources');
  const tSidebar = useTranslations('sidebar');
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('CLUB');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [minLoadingComplete, setMinLoadingComplete] = useState(false);

  // Minimum loading time for skeleton display
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingComplete(true);
    }, MIN_LOADING_TIME);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Check if user is authenticated
    const token = Cookies.get('access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    // Check if user has correct role
    if (user && user.role !== 'YOUTH_MEMBER') {
      router.push('/login');
      return;
    }
    
    fetchResources();
  }, [user, router, filter]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      // The backend viewset filters 'is_active=True' automatically for youth.
      // Pass scope parameter to filter by club or municipality
      const scopeParam = filter === 'CLUB' ? 'club' : 'municipality';
      const res = await api.get(`/bookings/resources/?scope=${scopeParam}`);
      setResources(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search logic
  const getFilteredResources = () => {
    let filtered = resources;

    // Backend already filters by scope and club, so we just need to filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(res => 
        res.name.toLowerCase().includes(query) ||
        res.description?.toLowerCase().includes(query) ||
        res.club_name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const displayedResources = getFilteredResources();
  
  // Show skeleton while loading (with minimum display time)
  const showSkeleton = loading || !minLoadingComplete;

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <NavBar darkMode={true} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} showBackButton={true} />
      
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
          <h1 className="text-xl font-bold text-[var(--brand-light)] font-heading">{tSidebar('menu')}</h1>
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
          <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
            <YouthSidebar activePath={pathname} darkMode={true} />
          </aside>
          
          {/* Content wrapper with left margin for sidebar */}
          <div className="md:ml-60">
            <main className="p-0 sm:p-4 md:p-6 pb-24 md:pb-6">
              {showSkeleton ? (
                <NewBookingPageSkeleton />
              ) : (
                <>
                  {/* Header Section */}
                  <div className="mb-4 sm:mb-6 px-4 sm:px-0 pt-4 sm:pt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div>
                        <div className="flex items-center gap-2 sm:gap-3 mb-1">
                          <CalendarDays className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--brand-primary)]" />
                          <h1 className="text-2xl sm:text-3xl md:text-4xl text-[var(--brand-light)] font-heading font-bold">
                            {t('title')}
                          </h1>
                        </div>
                        <p className="text-[var(--brand-light)]/60 text-sm pl-8 sm:pl-10">
                          {filter === 'CLUB' 
                            ? t('browseClubResources')
                            : t('browseMunicipalityResources')}
                        </p>
                      </div>
                    </div>

                    {/* Filters Section */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-3 sm:p-4">
                      {/* Search Bar */}
                      <div className="relative mb-3">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 w-5 h-5" />
                        <input 
                          type="text" 
                          placeholder={t('searchPlaceholder')} 
                          className="w-full bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl py-3 pl-12 pr-4 text-sm text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] transition-all"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]/60"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Filter Chips */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setFilter('CLUB')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            filter === 'CLUB'
                              ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                              : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          {t('myClub')}
                        </button>
                        
                        <button
                          onClick={() => setFilter('MUNICIPALITY')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            filter === 'MUNICIPALITY'
                              ? 'bg-[var(--brand-purple)] text-[var(--brand-light)]'
                              : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          {t('municipality')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {displayedResources.length === 0 ? (
                <div className="text-center py-12 mx-4 sm:mx-0 bg-[var(--dark-800)] rounded-xl sm:rounded-2xl border border-[var(--dark-600)]">
                  <div className="max-w-md mx-auto px-4">
                    <div className="w-20 h-20 bg-[var(--brand-primary)]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-10 h-10 text-[var(--brand-primary)]" />
                    </div>
                    <p className="text-[var(--brand-light)] mb-2 font-bold text-lg font-heading">
                      {searchQuery 
                        ? t('noResourcesFound', { query: searchQuery })
                        : filter === 'CLUB'
                          ? t('noClubResources')
                          : t('noMunicipalityResources')}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="inline-flex items-center gap-2 bg-[var(--brand-primary)] text-[var(--dark-900)] px-5 py-2.5 rounded-xl font-bold hover:bg-[var(--brand-primary)]/90 transition-all mt-4"
                      >
                        {t('clearSearch')}
                      </button>
                    )}
                  </div>
                </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 sm:px-0">
                      {displayedResources.map((res: any) => (
                        <BookingResourceCard key={res.id} resource={res} darkMode={true} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
