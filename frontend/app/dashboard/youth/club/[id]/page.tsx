'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import api, { visits } from '@/lib/api';
import { Club } from '@/types/organization';
import ClubHeader from '@/app/components/club/ClubHeader';
import ClubTabs from '@/app/components/club/ClubTabs';
import ClubOverview from '@/app/components/club/tabs/ClubOverview';
import ClubGroups from '@/app/components/club/tabs/ClubGroups';
import ClubHours from '@/app/components/club/tabs/ClubHours';
import ClubPolicies from '@/app/components/club/tabs/ClubPolicies';
import ClubContact from '@/app/components/club/tabs/ClubContact';
import ClubEvents from '@/app/components/club/tabs/ClubEvents';
import NavBar from '@/app/components/NavBar';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import { useAuth } from '@/context/AuthContext';
import { X } from 'lucide-react';
import Footer from '@/app/components/Footer';

export default function ClubDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const t = useTranslations('club.errors');
  const tNav = useTranslations('nav');
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const id = params?.id;

  // Theme detection
  useEffect(() => {
    setMounted(true);
  }, []);
  const darkMode = !mounted || theme === 'dark';

  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTabsSticky, setIsTabsSticky] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabsInitialTopRef = useRef<number | null>(null);
  
  // Get initial tab from URL, default to 'overview'
  const tabFromUrl = searchParams.get('tab');
  const validTabs: Array<'overview' | 'groups' | 'hours' | 'events' | 'policies' | 'contact'> = 
    ['overview', 'groups', 'hours', 'events', 'policies', 'contact'];
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl as any) 
    ? (tabFromUrl as typeof validTabs[number]) 
    : 'overview';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Handle tab change - update both state and URL
  const handleTabChange = (tab: typeof validTabs[number]) => {
    setActiveTab(tab);
    // Update URL without page refresh
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };
  
  // Sync with URL when it changes (e.g., browser back/forward or direct navigation)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && validTabs.includes(tabFromUrl as any)) {
      const tab = tabFromUrl as typeof validTabs[number];
      if (tab !== activeTab) {
        setActiveTab(tab);
      }
    } else if (!tabFromUrl && activeTab !== 'overview') {
      // If no tab in URL and we're not on overview, reset to overview
      setActiveTab('overview');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchClub = async () => {
      try {
        setLoading(true);
        // Ensure this endpoint exists and returns full details including regular_hours
        const response = await api.get(`/clubs/${id}/`);
        setClub(response.data);
      } catch (err) {
        console.error("Failed to fetch club", err);
        setError(t('couldNotLoadClub'));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchClub();
    }
  }, [id]);

  // Check active visit status
  useEffect(() => {
    if (!user || user.role !== 'YOUTH_MEMBER') return;

    const checkVisitStatus = async () => {
      try {
        const res = await visits.getMyActiveVisit();
        setIsCheckedIn(res.data?.is_checked_in || false);
      } catch (e) {
        setIsCheckedIn(false);
      }
    };
    
    checkVisitStatus();
    const interval = setInterval(checkVisitStatus, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Handle tabs sticky behavior - stick when navbar reaches tabs, unstick when scrolling back up
  useEffect(() => {
    // Only run after club data is loaded
    if (!club) return;
    
    // Small delay to ensure DOM has updated after club loads
    const initTimeout = setTimeout(() => {
      if (tabsRef.current) {
        const rect = tabsRef.current.getBoundingClientRect();
        tabsInitialTopRef.current = rect.top + window.scrollY;
      }
    }, 100);
    
    const handleScroll = () => {
      if (!tabsRef.current || tabsInitialTopRef.current === null) return;
      
      const scrollY = window.scrollY;
      const initialTop = tabsInitialTopRef.current;
      // Navbar height: h-14 (56px) on mobile, h-16 (64px) on desktop (sm and up)
      // Plus checked-in bar if present: ~34px
      const navbarHeight = window.innerWidth >= 640 ? 64 : 56;
      const checkedInHeight = isCheckedIn ? 34 : 0;
      const totalHeaderHeight = navbarHeight + checkedInHeight;
      
      // Should stick when: scrolled past the point where tabs top would be at navbar height
      // Should unstick when: scrolled back up before that point
      const threshold = initialTop - totalHeaderHeight;
      const shouldStick = scrollY >= threshold;
      
      setIsTabsSticky(shouldStick);
    };
    
    // Add scroll listener after a short delay to ensure initial position is set
    const scrollTimeout = setTimeout(() => {
      handleScroll();
      window.addEventListener('scroll', handleScroll);
    }, 150);
    
    return () => {
      clearTimeout(initTimeout);
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [club, isCheckedIn]);

  if (loading) return (
    <div className={`min-h-screen ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
      <NavBar showBackButton={true} onMenuToggle={() => setIsSidebarOpen(true)} />
      <div className="pt-14 sm:pt-16 flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
      </div>
    </div>
  );

  if (error || !club) return (
    <div className={`min-h-screen ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
      <NavBar showBackButton={true} onMenuToggle={() => setIsSidebarOpen(true)} />
      <div className="pt-14 sm:pt-16 text-center py-12 text-[var(--brand-red)]">{error || t('clubNotFound')}</div>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
      <div className="flex-1 pb-24 md:pb-12">
      {/* Fixed NavBar with hamburger menu */}
      <NavBar 
        showBackButton={true} 
        onMenuToggle={() => setIsSidebarOpen(true)} 
      />
      
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-black/70 z-40 md:hidden transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      
      {/* Mobile Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-screen w-64 z-50 transform transition-transform duration-300 md:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${darkMode ? 'bg-[var(--dark-800)]' : 'bg-white'}`}
      >
        <div className={`flex items-center justify-between h-14 sm:h-16 px-4 border-b ${darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/10'}`}>
          <h1 className="text-xl font-bold text-[var(--brand-primary)]">{tNav('menu')}</h1>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl ${darkMode ? 'text-[var(--brand-light)] hover:bg-[var(--dark-600)]' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]">
          <YouthSidebar activePath={pathname} />
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="pt-14 sm:pt-16">
        {/* Club Header */}
        <div className="max-w-6xl mx-auto md:pt-6 px-0 md:px-6">
          <ClubHeader club={club} darkMode={darkMode} />
        </div>

        {/* Tabs Navigation - becomes sticky on scroll */}
        <div ref={tabsRef} className="mt-6">
          <ClubTabs 
            activeTab={activeTab} 
            onChange={handleTabChange} 
            excludeTabs={['visits']} 
            darkMode={darkMode}
            isCheckedIn={isCheckedIn}
            isSticky={isTabsSticky}
          />
        </div>
        
        {/* Spacer to maintain layout when tabs are sticky */}
        {isTabsSticky && <div className="h-[57px]"></div>}

        {/* Tab Content */}
        <div className="max-w-6xl mx-auto px-0 sm:px-4 md:px-6 py-6">
          {activeTab === 'overview' && club && (
            <ClubOverview club={club} onChangeTab={handleTabChange} darkMode={darkMode} basePath="youth" />
          )}
          
          {activeTab === 'groups' && club && (
            <ClubGroups clubId={club.id} darkMode={darkMode} />
          )}

          {activeTab === 'hours' && club && (
            <ClubHours club={club} darkMode={darkMode} />
          )}

          {activeTab === 'events' && club && (
            <ClubEvents clubId={club.id} darkMode={darkMode} />
          )}
          
          {activeTab === 'policies' && club && (
            <ClubPolicies club={club} darkMode={darkMode} />
          )}

          {activeTab === 'contact' && club && (
            <ClubContact club={club} darkMode={darkMode} />
          )}
        </div>
      </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
