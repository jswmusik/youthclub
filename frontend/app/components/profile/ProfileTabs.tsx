'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isSticky?: boolean;
  darkMode?: boolean;
  isCheckedIn?: boolean;
}

export default function ProfileTabs({ activeTab, onTabChange, isSticky = false, darkMode = false, isCheckedIn = false }: ProfileTabsProps) {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'clubs', label: 'Clubs & Groups' },
    { id: 'inventory', label: 'Inventory History' },
    { id: 'guardians', label: 'Guardians' },
    { id: 'wallet', label: 'My Wallet' },
    { id: 'timeline', label: 'Activity' },
  ];

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

  // Calculate sticky top position based on navbar (h-14/h-16) + check-in bar (~36px if checked in)
  const getStickyTop = () => {
    if (!isSticky) return '';
    // Mobile: top-14 (56px) + check-in bar (36px) = ~92px -> top-[5.75rem]
    // Desktop: top-14 (56px) + check-in bar (36px) = ~92px -> sm:top-[5.75rem]
    // Without check-in: top-14 sm:top-14
    if (isCheckedIn) {
      return 'top-[5.25rem] sm:top-[5.75rem]';
    }
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
              onClick={() => onTabChange(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 font-medium text-sm transition-colors duration-200 relative
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
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
