'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('clubVisits.tabs');
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
      label: t('live'),
      fullLabel: t('liveAttendance'),
      icon: Users,
      href: getLiveHref(),
    },
    {
      key: 'history',
      label: t('history'),
      fullLabel: t('historyLog'),
      icon: Clock,
      href: getHistoryHref(),
    },
    {
      key: 'analytics',
      label: t('analytics'),
      fullLabel: t('analytics'),
      icon: BarChart3,
      href: getAnalyticsHref(),
    },
  ];

  return (
    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-1.5 relative overflow-hidden">
      {/* Sliding Background Indicator */}
      <div
        className="absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] shadow-lg shadow-[var(--brand-primary)]/20 transition-all duration-300 ease-in-out z-0"
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
        }}
      />
      
      <nav className="flex gap-1 relative z-10">
        {tabs.map(({ key, label, fullLabel, icon: Icon, href }) => {
          const isActive = activeTab === key;
          
          if (isActive) {
            return (
              <button
                key={key}
                ref={(el) => { tabRefs.current[key] = el; }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-semibold text-sm transition-colors duration-200 relative z-10 text-white cursor-default border-0 bg-transparent"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{fullLabel}</span>
                <span className="sm:hidden">{label}</span>
              </button>
            );
          }
          
          return (
            <Link
              key={key}
              ref={(el) => { tabRefs.current[key] = el; }}
              href={href}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-medium text-sm transition-colors duration-200 relative z-10 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)] border-0 bg-transparent"
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{fullLabel}</span>
              <span className="sm:hidden">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
