'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldAlert, Lock } from 'lucide-react';

interface GuardianProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isSticky?: boolean;
  darkMode?: boolean;
  verificationStatus?: string;
  pendingChildrenCount?: number;
}

export default function GuardianProfileTabs({ 
  activeTab, 
  onTabChange, 
  isSticky = false, 
  darkMode = false,
  verificationStatus = 'UNVERIFIED',
  pendingChildrenCount = 0
}: GuardianProfileTabsProps) {
  // Using generic 'profile' translations or creating specific ones
  // You might want to add these keys to your dictionary later
  const t = useTranslations('profile'); 
  const tVerify = useTranslations('verification');
  const tChildren = useTranslations('children');
  
  const isVerified = verificationStatus === 'VERIFIED';
  const showVerifyBadge = !isVerified;
  const showChildrenBadge = pendingChildrenCount > 0;
  
  // Define all tabs with their locked status for unverified users
  const allTabs = [
    { id: 'overview', label: t('overview') || 'Overview', lockedForUnverified: true },
    { id: 'verify', label: tVerify('verify') || 'Verify', showBadge: showVerifyBadge, lockedForUnverified: false },
    { id: 'children', label: tChildren('myChildren') || 'My Children', showBadge: showChildrenBadge, badgeCount: pendingChildrenCount, lockedForUnverified: false },
    { id: 'clubs', label: t('youthClubs') || 'Youth Clubs', lockedForUnverified: true },
    { id: 'events', label: t('eventList') || 'Event Applications', lockedForUnverified: true },
    { id: 'activity', label: t('activity') || 'Activity', lockedForUnverified: true },
  ];
  
  // For unverified users, only show the verify and children tabs
  const tabs = isVerified ? allTabs : allTabs.filter(tab => !tab.lockedForUnverified);

  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const navRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const activeTabElement = tabRefs.current.get(activeTab);
    const navElement = navRef.current;
    
    if (activeTabElement && navElement) {
      const navRect = navElement.getBoundingClientRect();
      const tabRect = activeTabElement.getBoundingClientRect();
      
      const newLeft = tabRect.left - navRect.left + navElement.scrollLeft;
      const newWidth = tabRect.width;
      
      setIndicatorStyle(prev => {
        if (prev.left !== newLeft || prev.width !== newWidth) {
          return { left: newLeft, width: newWidth };
        }
        return prev;
      });
    }
  }, [activeTab]);

  useEffect(() => {
    const timeout = setTimeout(updateIndicator, 10);
    return () => clearTimeout(timeout);
  }, [updateIndicator]);

  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  // Simplified sticky logic (Guardian header is static size usually)
  const getStickyTop = () => {
    if (!isSticky) return '';
    return 'top-14 sm:top-14';
  };

  return (
    <div className={`w-full border-t z-40 ${
      isSticky ? `fixed ${getStickyTop()} left-0 right-0` : 'relative'
    } ${
      darkMode 
        ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
        : 'bg-white border-gray-200 shadow-sm'
    }`}>
      <div className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6">
        <nav 
          ref={navRef}
          className="relative flex space-x-8 overflow-x-auto no-scrollbar"
        >
          <div 
            className={`absolute bottom-0 h-0.5 transition-all duration-300 ease-out ${
              darkMode ? 'bg-[var(--brand-primary)]' : 'bg-[#4D4DA4]'
            }`}
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
          />
          
          {tabs.map((tab) => (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
              }}
              onClick={() => onTabChange(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 font-medium text-sm transition-colors duration-200 relative flex items-center gap-1.5
                ${activeTab === tab.id 
                  ? darkMode 
                    ? 'text-[var(--brand-primary)]' 
                    : 'text-[#6D6DD4]'
                  : darkMode
                    ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]'
                    : 'text-gray-600 hover:text-gray-800'}
              `}
            >
              {tab.label}
              {tab.showBadge && (
                tab.badgeCount ? (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--brand-red)] text-white text-[10px] font-bold">
                    {tab.badgeCount}
                  </span>
                ) : (
                  <span className="flex items-center justify-center w-2 h-2 rounded-full bg-[var(--brand-red)] animate-pulse" />
                )
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

