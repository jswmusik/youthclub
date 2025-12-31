'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import GuardianProfileTabs from './GuardianProfileTabs';
import GuardianOverviewTab from './GuardianOverviewTab';
import GuardianClubs from './GuardianClubs';
import GuardianEventList from './GuardianEventList';
import GuardianActivityFeed from './GuardianActivityFeed';
import GuardianVerifyTab from './GuardianVerifyTab';
import GuardianChildrenManager from './children/GuardianChildrenManager';
import { fetchMyChildren } from '@/lib/api';

const VALID_TABS = ['overview', 'verify', 'children', 'clubs', 'events', 'activity'];
// Tabs that unverified guardians can access
const UNVERIFIED_ALLOWED_TABS = ['verify', 'children'];

interface GuardianProfileContentProps {
  user: any;
  darkMode?: boolean;
}

export default function GuardianProfileContent({ user, darkMode = false }: GuardianProfileContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const isVerified = user?.verification_status === 'VERIFIED';
  
  // For unverified users, only allow verify and children tabs
  const allowedTabs = isVerified ? VALID_TABS : UNVERIFIED_ALLOWED_TABS;
  const defaultTab = isVerified ? 'overview' : 'verify';
  
  // Get initial tab from URL, default based on verification status
  const tabFromUrl = searchParams.get('tab');
  const initialTab = tabFromUrl && allowedTabs.includes(tabFromUrl) ? tabFromUrl : defaultTab;
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isTabsSticky, setIsTabsSticky] = useState(false);
  const [pendingChildrenCount, setPendingChildrenCount] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabsInitialTopRef = useRef<number | null>(null);

  // Fetch pending children count for the badge
  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const res = await fetchMyChildren();
        const children = res.data?.results || res.data || [];
        const pendingCount = children.filter((c: any) => c.status === 'PENDING').length;
        setPendingChildrenCount(pendingCount);
      } catch (err) {
        console.error('Failed to load children count:', err);
      }
    };
    loadPendingCount();
  }, []);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    // Only allow changing to permitted tabs
    if (!allowedTabs.includes(tab)) {
      return;
    }
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Sync with URL on mount/change and enforce verification restrictions
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    
    // If unverified and trying to access a restricted tab, redirect to verify (but allow children)
    if (!isVerified && tabFromUrl && !UNVERIFIED_ALLOWED_TABS.includes(tabFromUrl)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'verify');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      setActiveTab('verify');
      return;
    }
    
    if (tabFromUrl && allowedTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    } else if (!tabFromUrl && activeTab !== defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [searchParams, isVerified, allowedTabs, defaultTab, pathname, router, activeTab]);

  // Handle tabs sticky behavior
  useEffect(() => {
    if (tabsRef.current && tabsInitialTopRef.current === null) {
      const rect = tabsRef.current.getBoundingClientRect();
      tabsInitialTopRef.current = rect.top + window.scrollY;
    }
    
    const handleScroll = () => {
      if (!tabsRef.current || tabsInitialTopRef.current === null) return;
      
      const scrollY = window.scrollY;
      const initialTop = tabsInitialTopRef.current;
      const navbarHeight = window.innerWidth >= 640 ? 56 : 48;
      
      const threshold = initialTop - navbarHeight;
      const shouldStick = scrollY >= threshold;
      
      setIsTabsSticky(shouldStick);
    };
    
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Callback to refresh pending count when children are approved/rejected
  const handleChildrenChange = () => {
    fetchMyChildren().then(res => {
      const children = res.data?.results || res.data || [];
      const pendingCount = children.filter((c: any) => c.status === 'PENDING').length;
      setPendingChildrenCount(pendingCount);
    }).catch(console.error);
  };

  const renderTabContent = () => {
    // Extra safeguard: unverified users can only see verify and children tab content
    if (!isVerified && activeTab !== 'verify' && activeTab !== 'children') {
      return <GuardianVerifyTab user={user} darkMode={darkMode} />;
    }
    
    switch (activeTab) {
      case 'overview':
        return <GuardianOverviewTab user={user} darkMode={darkMode} onSwitchTab={handleTabChange} />;
      case 'verify':
        return <GuardianVerifyTab user={user} darkMode={darkMode} />;
      case 'children':
        return <GuardianChildrenManager darkMode={darkMode} onChildrenChange={handleChildrenChange} />;
      case 'clubs':
        return <GuardianClubs user={user} childrenData={user.youth_members || []} darkMode={darkMode} />;
      case 'events':
        return <GuardianEventList user={user} darkMode={darkMode} />;
      case 'activity':
        return <GuardianActivityFeed darkMode={darkMode} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Tabs Navigation */}
      <div ref={tabsRef}>
        <GuardianProfileTabs 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
          isSticky={isTabsSticky} 
          darkMode={darkMode}
          verificationStatus={user?.verification_status || 'UNVERIFIED'}
          pendingChildrenCount={pendingChildrenCount}
        />
      </div>
      
      {/* Spacer when tabs are sticky */}
      {isTabsSticky && <div className="h-[49px] sm:h-[57px]"></div>}

      {/* Content Area */}
      <div className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 py-6">
        {renderTabContent()}
      </div>
    </>
  );
}

