'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Clock, BarChart3, Users } from 'lucide-react';

interface VisitsTabsProps {
  clubId: string;
  basePath: string;
  liveHref?: string;
  historyHref?: string;
  analyticsHref?: string;
}

export default function VisitsTabs({ 
  clubId, 
  basePath, 
  liveHref,
  historyHref,
  analyticsHref
}: VisitsTabsProps) {
  const pathname = usePathname();
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<{ [key: string]: HTMLAnchorElement | HTMLButtonElement | null }>({});

  // Determine active tab from pathname
  const getActiveTab = () => {
    if (pathname?.includes('/analytics')) return 'analytics';
    if (pathname?.includes('/history')) return 'history';
    return 'live';
  };

  const activeTab = getActiveTab();
  
  // Use custom hrefs if provided, otherwise use default pattern
  const getLiveHref = () => liveHref !== undefined ? liveHref : `${basePath}/${clubId}/visits`;
  const getHistoryHref = () => historyHref !== undefined ? historyHref : `${basePath}/${clubId}/visits/history`;
  const getAnalyticsHref = () => analyticsHref !== undefined ? analyticsHref : `${basePath}/${clubId}/visits/analytics`;

  // Update indicator position
  const updateIndicator = useCallback(() => {
    const activeTabElement = tabRefs.current[activeTab];
    if (activeTabElement) {
      const container = activeTabElement.parentElement?.parentElement; // nav -> container div
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const tabRect = activeTabElement.getBoundingClientRect();
        setIndicatorStyle({
          left: tabRect.left - containerRect.left,
          width: tabRect.width,
        });
      }
    }
  }, [activeTab]);

  // Initialize indicator position on mount and when tab changes
  useEffect(() => {
    const timer = setTimeout(() => {
      updateIndicator();
    }, 100);
    return () => clearTimeout(timer);
  }, [updateIndicator, pathname]);

  // Update indicator on window resize
  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  const tabs = [
    {
      key: 'live',
      label: 'Live Attendance',
      icon: Users,
      href: getLiveHref(),
    },
    {
      key: 'history',
      label: 'History Log',
      icon: Clock,
      href: getHistoryHref(),
    },
    {
      key: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      href: getAnalyticsHref(),
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-1.5 mb-6 relative">
      {/* Sliding Background Indicator */}
      <div
        className="absolute top-1.5 bottom-1.5 rounded-lg bg-gradient-to-r from-[#4D4DA4] to-[#6B6BC4] shadow-md transition-all duration-300 ease-in-out z-0"
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
        }}
      />
      
      <nav className="flex gap-2 relative z-10">
        {tabs.map(({ key, label, icon: Icon, href }) => {
          const isActive = activeTab === key;
          
          if (isActive) {
            return (
              <button
                key={key}
                ref={(el) => { tabRefs.current[key] = el; }}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-colors duration-200 relative z-10 text-white cursor-default border-0 bg-transparent"
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          }
          
          return (
            <Link
              key={key}
              ref={(el) => { tabRefs.current[key] = el; }}
              href={href}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-colors duration-200 relative z-10 text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-0 bg-transparent"
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
