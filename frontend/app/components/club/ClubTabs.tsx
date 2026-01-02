'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';

type TabType = 'overview' | 'groups' | 'visits' | 'hours' | 'events' | 'policies' | 'contact';

interface ClubTabsProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
  excludeTabs?: TabType[]; // Optional prop to exclude certain tabs
  darkMode?: boolean;
  isCheckedIn?: boolean;
  isSticky?: boolean;
}

export default function ClubTabs({ activeTab, onChange, excludeTabs = [], darkMode = false, isCheckedIn = false, isSticky = false }: ClubTabsProps) {
  const t = useTranslations('club.tabs');
  
  const allTabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: t('overview') },
    { id: 'groups', label: t('groups') },
    { id: 'visits', label: t('visits') },
    { id: 'hours', label: t('hours') },
    { id: 'events', label: t('events') },
    { id: 'policies', label: t('policies') },
    { id: 'contact', label: t('contact') },
  ];
  
  // Filter out excluded tabs
  const tabs = allTabs.filter(tab => !excludeTabs.includes(tab.id));
  
  // Refs for measuring tab positions
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const navRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Memoized function to update indicator
  const updateIndicator = useCallback(() => {
    const activeTabElement = tabRefs.current.get(activeTab);
    const navElement = navRef.current;
    
    if (activeTabElement && navElement) {
      const navRect = navElement.getBoundingClientRect();
      const tabRect = activeTabElement.getBoundingClientRect();
      
      const newLeft = tabRect.left - navRect.left + navElement.scrollLeft;
      const newWidth = tabRect.width;
      
      // Only update if values actually changed
      setIndicatorStyle(prev => {
        if (prev.left !== newLeft || prev.width !== newWidth) {
          return { left: newLeft, width: newWidth };
        }
        return prev;
      });
    }
  }, [activeTab]);

  // Update indicator position when active tab changes
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timeout = setTimeout(updateIndicator, 10);
    return () => clearTimeout(timeout);
  }, [updateIndicator]);

  // Also update on resize
  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  // Calculate sticky top position based on navbar (h-14/h-16) + check-in bar (~34px if checked in)
  const getStickyTop = () => {
    if (!isSticky) return '';
    // Mobile: top-14 (56px) + check-in bar (34px) = ~90px
    // Desktop: top-16 (64px) + check-in bar (34px) = ~98px
    // Without check-in: top-14 / top-16
    if (isCheckedIn) {
      return 'top-[90px] sm:top-[98px]';
    }
    return 'top-14 sm:top-16';
  };

  return (
    <div className={`w-full border-t z-40 ${
      isSticky ? `fixed ${getStickyTop()} left-0 right-0` : 'relative'
    } ${
      darkMode 
        ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
        : 'bg-white border-[#4D4DA4]/10 shadow-sm'
    }`}>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <nav 
          ref={navRef}
          className="relative flex space-x-8 overflow-x-auto no-scrollbar" 
          aria-label="Tabs"
        >
          {/* Animated indicator */}
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
              onClick={() => onChange(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 font-medium text-sm transition-colors duration-200 relative
                ${activeTab === tab.id
                  ? darkMode
                    ? 'text-[var(--brand-primary)]'
                    : 'text-blue-600'
                  : darkMode
                    ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]'
                    : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
