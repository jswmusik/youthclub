'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import api from '@/lib/api';
import { Club } from '@/types/organization';
import ClubHeader from '@/app/components/club/ClubHeader';
import ClubTabs from '@/app/components/club/ClubTabs';
import ClubOverview from '@/app/components/club/tabs/ClubOverview';
import ClubHours from '@/app/components/club/tabs/ClubHours';
import ClubPolicies from '@/app/components/club/tabs/ClubPolicies';
import ClubContact from '@/app/components/club/tabs/ClubContact';
import ClubEvents from '@/app/components/club/tabs/ClubEvents';
import GuardianNavBar from '@/app/components/guardian/GuardianNavBar';
import GuardianSidebar from '@/app/components/guardian/GuardianSidebar';
import { useAuth } from '@/context/AuthContext';
import { X } from 'lucide-react';
import Footer from '@/app/components/Footer';

export default function GuardianClubDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('club.errors');
  const tNav = useTranslations('nav');
  const id = params?.id;

  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTabsSticky, setIsTabsSticky] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabsInitialTopRef = useRef<number | null>(null);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const darkMode = !mounted || theme === 'dark';
  
  // Get initial tab from URL, default to 'overview'
  // Note: 'groups' tab is excluded for guardians - it's a youth-only feature
  const tabFromUrl = searchParams.get('tab');
  const validTabs: Array<'overview' | 'hours' | 'events' | 'policies' | 'contact'> = 
    ['overview', 'hours', 'events', 'policies', 'contact'];
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

  // Handle tabs sticky behavior
  useEffect(() => {
    if (!club) return;
    
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
      const navbarHeight = window.innerWidth >= 640 ? 64 : 56;
      const threshold = initialTop - navbarHeight;
      const shouldStick = scrollY >= threshold;
      
      setIsTabsSticky(shouldStick);
    };
    
    const scrollTimeout = setTimeout(() => {
      handleScroll();
      window.addEventListener('scroll', handleScroll);
    }, 150);
    
    return () => {
      clearTimeout(initTimeout);
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [club]);

  if (loading) return (
    <div className={`min-h-screen ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
      <GuardianNavBar darkMode={darkMode} onMenuToggle={() => setIsSidebarOpen(true)} />
      <div className="pt-14 sm:pt-16 flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
      </div>
    </div>
  );

  if (error || !club) return (
    <div className={`min-h-screen ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
      <GuardianNavBar darkMode={darkMode} onMenuToggle={() => setIsSidebarOpen(true)} />
      <div className="pt-14 sm:pt-16 text-center py-12 text-[var(--brand-red)]">{error || t('clubNotFound')}</div>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
      <div className="flex-1 pb-24 md:pb-12">
        {/* Fixed NavBar with hamburger menu */}
        <GuardianNavBar 
          darkMode={darkMode} 
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
          className={`fixed top-0 left-0 h-screen w-64 z-50 border-r transform transition-transform duration-300 md:hidden ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } ${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/10'}`}
        >
          <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/10'}`}>
            <h1 className={`text-xl font-bold font-heading ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{tNav('menu')}</h1>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg ${darkMode ? 'text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)] hover:text-[var(--brand-light)]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto h-[calc(100vh-64px)]">
            <GuardianSidebar />
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
              excludeTabs={['visits', 'groups']} 
              darkMode={darkMode}
              isCheckedIn={false}
              isSticky={isTabsSticky}
            />
          </div>
          
          {/* Spacer to maintain layout when tabs are sticky */}
          {isTabsSticky && <div className="h-[57px]"></div>}

          {/* Tab Content */}
          <div className="max-w-6xl mx-auto px-0 sm:px-4 md:px-6 py-6">
            {activeTab === 'overview' && club && (
              <ClubOverview club={club} onChangeTab={handleTabChange} darkMode={darkMode} basePath="guardian" />
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
      <Footer homeLink="/dashboard/guardian" />
    </div>
  );
}

