'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import ProfileTabs from './ProfileTabs';
import { getMediaUrl } from '@/app/utils';
import ActivityFeed from './tabs/ActivityFeed';
import ClubsAndGroups from './tabs/ClubsAndGroups';
import WalletGrid from './tabs/WalletGrid';
import YouthGuardianManager from '../youth/guardians/YouthGuardianManager';
import YouthEventList from '../youth/events/YouthEventList';
import { inventoryApi } from '@/lib/inventory-api';
import { Package, Clock, CheckCircle, AlertCircle, Building2, GraduationCap, Calendar, CalendarDays, Activity } from 'lucide-react';
import { differenceInMinutes, parseISO, format, type Locale } from 'date-fns';
import { enUS, sv, da, nb, fi } from 'date-fns/locale';

const VALID_TABS = ['overview', 'clubs', 'events', 'guardians', 'wallet', 'timeline', 'inventory'];

export default function ProfileContent({ user, darkMode = false, isCheckedIn = false }: { user: any; darkMode?: boolean; isCheckedIn?: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Get initial tab from URL, default to 'overview'
  const tabFromUrl = searchParams.get('tab');
  const initialTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'overview';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isTabsSticky, setIsTabsSticky] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabsInitialTopRef = useRef<number | null>(null);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Update URL without page refresh
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Sync with URL on mount/change (e.g., browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    } else if (!tabFromUrl && activeTab !== 'overview') {
      // If no tab in URL and we're not on overview, reset to overview
      setActiveTab('overview');
    }
  }, [searchParams]);

  // Handle tabs sticky behavior - stick when navbar reaches tabs, unstick when scrolling back up
  useEffect(() => {
    // Store initial tabs position on mount
    if (tabsRef.current && tabsInitialTopRef.current === null) {
      const rect = tabsRef.current.getBoundingClientRect();
      tabsInitialTopRef.current = rect.top + window.scrollY;
    }
    
    const handleScroll = () => {
      if (!tabsRef.current || tabsInitialTopRef.current === null) return;
      
      const scrollY = window.scrollY;
      const initialTop = tabsInitialTopRef.current;
      // Navbar height: h-12 (48px) on mobile, h-14 (56px) on desktop (sm and up)
      const navbarHeight = window.innerWidth >= 640 ? 56 : 48;
      
      // Should stick when: scrolled past the point where tabs top would be at navbar height
      // Should unstick when: scrolled back up before that point
      const threshold = initialTop - navbarHeight;
      const shouldStick = scrollY >= threshold;
      
      setIsTabsSticky(shouldStick);
    };
    
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  // Helper to calculate age from DOB
  const getAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab user={user} getAge={getAge} onSwitchTab={handleTabChange} darkMode={darkMode} />;
      case 'clubs':
        return <ClubsAndGroups user={user} darkMode={darkMode} />;
      case 'events':
        return <YouthEventList user={user} darkMode={darkMode} />;
      case 'inventory':
        return <InventoryTab darkMode={darkMode} />;
      case 'guardians':
        return <YouthGuardianManager darkMode={darkMode} />;
      case 'wallet':
        return <WalletGrid user={user} darkMode={darkMode} />;
      case 'timeline':
        // Reuse the same feed component for the dedicated tab
        return <ActivityFeed darkMode={darkMode} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* 1. The Navigation Bar */}
      <div ref={tabsRef}>
        <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} isSticky={isTabsSticky} darkMode={darkMode} isCheckedIn={isCheckedIn} />
      </div>
      
      {/* Spacer to maintain layout when tabs are sticky */}
      {isTabsSticky && <div className="h-[49px] sm:h-[57px]"></div>}

      {/* 2. The Content Area */}
      <div className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 py-6">
        {renderTabContent()}
      </div>
    </>
  );
}

// --- SUB-COMPONENTS (We can move these to separate files later) ---

function OverviewTab({ user, getAge, onSwitchTab, darkMode = false }: { user: any, getAge: (d: string) => number | null, onSwitchTab: (t: string) => void, darkMode?: boolean }) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Left Column: Intro & Stats */}
      <div className="md:col-span-1 space-y-6 md:sticky md:top-[120px] md:self-start md:max-h-[calc(100vh-120px)] md:overflow-y-auto">
        
        {/* About Card */}
        <div className={`rounded-none sm:rounded-2xl p-6 border-y sm:border ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' 
            : 'bg-white shadow-sm border border-[#4D4DA4]/15'
        }`}>
          <h3 className={`text-xl font-bold mb-5 flex items-center gap-3 font-heading font-bold ${
            darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
          }`}>
            <span className={`w-1 h-6 rounded-full ${darkMode ? 'bg-[var(--brand-primary)]' : 'bg-[#4D4DA4]'}`}></span>
            {t('about')}
          </h3>
          
          <div className="space-y-4 text-sm">
            <div className={`flex items-center p-3 rounded-xl border ${
              darkMode 
                ? 'text-[var(--brand-light)]/80 bg-[var(--dark-700)] border-[var(--dark-500)]' 
                : 'text-gray-700 bg-white border-[#4D4DA4]/15 shadow-sm'
            }`}>
              <Building2 className={`w-5 h-5 mr-3 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#4D4DA4]'}`} />
              <span>{t('memberOf')} <strong className={darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}>{user.preferred_club?.name || t('noClub')}</strong></span>
            </div>
            
            {user.grade && (
              <div className={`flex items-center p-3 rounded-xl border ${
                darkMode 
                  ? 'text-[var(--brand-light)]/80 bg-[var(--dark-700)] border-[var(--dark-500)]' 
                  : 'text-gray-700 bg-white border-[#4D4DA4]/15 shadow-sm'
              }`}>
                <GraduationCap className={`w-5 h-5 mr-3 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'}`} />
                <span>{t('grade')} <strong className={darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}>{user.grade}</strong></span>
              </div>
            )}

            {user.date_of_birth && (
              <div className={`flex items-center p-3 rounded-xl border ${
                darkMode 
                  ? 'text-[var(--brand-light)]/80 bg-[var(--dark-700)] border-[var(--dark-500)]' 
                  : 'text-gray-700 bg-white border-[#4D4DA4]/15 shadow-sm'
              }`}>
                <Calendar className={`w-5 h-5 mr-3 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#4D4DA4]'}`} />
                <span><strong className={darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}>{getAge(user.date_of_birth)}</strong> {t('yearsOld')}</span>
              </div>
            )}
            
            <div className={`flex items-center p-3 rounded-xl border ${
              darkMode 
                ? 'text-[var(--brand-light)]/80 bg-[var(--dark-700)] border-[var(--dark-500)]' 
                : 'text-gray-700 bg-white border-[#4D4DA4]/15 shadow-sm'
            }`}>
              <CalendarDays className={`w-5 h-5 mr-3 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'}`} />
              <span>{t('joined')} <strong className={darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}>{new Date(user.date_joined).toLocaleDateString()}</strong></span>
            </div>
          </div>
        </div>

        {/* Interests Card */}
        <div className={`rounded-none sm:rounded-2xl p-6 border-y sm:border ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' 
            : 'bg-white shadow-sm border border-[#4D4DA4]/15'
        }`}>
           <div className="flex justify-between items-center mb-5">
              <h3 className={`text-xl font-bold flex items-center gap-3 font-heading font-bold ${
                darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
              }`}>
                <span className={`w-1 h-6 rounded-full ${darkMode ? 'bg-[var(--brand-primary)]' : 'bg-[#FF5485]'}`}></span>
                {t('interests')}
              </h3>
              <span className={`text-xs font-bold cursor-pointer transition-colors ${
                darkMode ? 'text-[var(--brand-primary)] hover:text-[var(--brand-purple)]' : 'text-[#FF5485] hover:text-[#4D4DA4]'
              }`}>{tCommon('edit')}</span>
           </div>
           <div className="flex flex-wrap gap-2">
              {(!user.interests || user.interests.length === 0) && (
                <p className={`text-sm italic p-3 rounded-xl w-full border ${
                  darkMode 
                    ? 'text-[var(--brand-light)]/50 bg-[var(--dark-700)] border-[var(--dark-500)]' 
                    : 'text-gray-600 bg-white border-[#4D4DA4]/15'
                }`}>{t('noInterestsAdded')}</p>
              )}
              {/* Render interest chips - interests should now come as objects with name property */}
              {user.interests && user.interests.map((interest: any) => {
                // Handle both object format {id, name, icon, avatar} and legacy ID format
                const interestId = typeof interest === 'object' ? interest.id : interest;
                const interestName = typeof interest === 'object' ? interest.name : null;
                
                return (
                  <span key={interestId} className={`px-4 py-2 border-2 rounded-xl text-xs font-bold transition-colors ${
                    darkMode 
                      ? 'bg-[var(--dark-700)] text-[var(--brand-purple)] border-[var(--dark-500)] hover:bg-[var(--dark-600)]' 
                      : 'bg-white text-[#4D4DA4] border-[#4D4DA4]/20 shadow-sm hover:bg-[#EBEBFE]'
                  }`}>
                    {interestName || `Interest ${interestId}`}
                  </span>
                );
              })}
           </div>
        </div>

        {/* Guardians Card */}
        <div className={`rounded-none sm:rounded-2xl p-6 border-y sm:border ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' 
            : 'bg-white shadow-sm border border-[#4D4DA4]/15'
        }`}>
          <div className="flex justify-between items-center mb-5">
            <h3 className={`text-xl font-bold flex items-center gap-3 font-heading font-bold ${
              darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
            }`}>
              <span className={`w-1 h-6 rounded-full ${darkMode ? 'bg-[var(--brand-third)]' : 'bg-[#10B981]'}`}></span>
              {t('myGuardians')}
            </h3>
            {/* Manage Button */}
            <button 
                onClick={() => onSwitchTab('guardians')}
                className={`text-xs font-bold transition-colors ${
                  darkMode ? 'text-[var(--brand-primary)] hover:text-[var(--brand-purple)]' : 'text-[#FF5485] hover:text-[#4D4DA4]'
                }`}
            >
                {t('manage')}
            </button>
          </div>
          
          <div className="space-y-3">
            {/* We map guardians here. If none, show placeholder */}
            {(!user.guardians || user.guardians.length === 0) ? (
               <div className={`text-center py-6 rounded-xl border-2 border-dashed ${
                 darkMode 
                   ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
                   : 'bg-white border-[#4D4DA4]/30'
               }`}>
                  <p className={`text-sm mb-3 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{t('noGuardiansLinked')}</p>
                  <button 
                    onClick={() => onSwitchTab('guardians')}
                    className={`text-xs px-4 py-2 rounded-xl font-bold transition-all ${
                      darkMode 
                        ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/80' 
                        : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white shadow-md hover:shadow-lg'
                    }`}
                  >
                    {t('addGuardian')}
                  </button>
               </div>
            ) : (
               user.guardians.map((guardian: any) => {
                 // Handle both object format and legacy ID format
                 const guardianId = typeof guardian === 'object' ? guardian.id : guardian;
                 const firstName = typeof guardian === 'object' ? guardian.first_name : '';
                 const lastName = typeof guardian === 'object' ? guardian.last_name : '';
                 const avatar = typeof guardian === 'object' ? guardian.avatar : null;
                 
                 // Get initials from first and last name
                 const getInitials = (first: string, last: string) => {
                   const firstInitial = first ? first.charAt(0).toUpperCase() : '';
                   const lastInitial = last ? last.charAt(0).toUpperCase() : '';
                   return firstInitial + lastInitial || 'G';
                 };
                 
                 const initials = getInitials(firstName, lastName);
                 const fullName = firstName && lastName ? `${firstName} ${lastName}` : `Guardian #${guardianId}`;
                 
                 return (
                   <div key={guardianId} className={`flex items-center space-x-3 p-4 border-2 rounded-xl transition-all ${
                     darkMode 
                       ? 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/40' 
                       : 'bg-white border-[#4D4DA4]/20 hover:border-[#4D4DA4]/40 hover:shadow-md'
                   }`}>
                     {avatar ? (
                       <img src={getMediaUrl(avatar) || ''} alt={fullName} className={`w-12 h-12 rounded-xl object-cover border-2 ${
                         darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/20'
                       }`} />
                     ) : (
                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                         darkMode 
                           ? 'bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)]' 
                           : 'bg-gradient-to-br from-[#4D4DA4] to-[#6D6DD4] shadow-md'
                       }`}>
                         {initials}
                       </div>
                     )}
                     <div>
                       <p className={`text-sm font-bold ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`}>{fullName}</p>
                       <p className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{t('parentGuardian')}</p>
                     </div>
                   </div>
                 );
               })
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Activity Feed */}
      <div className="md:col-span-2">
        {/* Added the dynamic Feed */}
        <ActivityFeed showTimeFilter={false} darkMode={darkMode} />
      </div>
    </div>
  );
}

type TimeFilter = 'day' | 'week' | 'month' | 'forever';

function InventoryTab({ darkMode = false }: { darkMode?: boolean }) {
  const t = useTranslations('inventory');
  const locale = useLocale();
  const localeMap: Record<string, Locale> = {
    en: enUS,
    sv: sv,
    da: da,
    nb: nb,
    fi: fi,
  };
  const dateLocale = localeMap[locale] || enUS;
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]); // Store all sessions for filtering
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [timeLeftMap, setTimeLeftMap] = useState<Record<number, number>>({});
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('forever');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const observerTarget = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // Fetch with pagination
      const response = await inventoryApi.getMySessions(pageNum);
      const data = response.results || response;
      const sessionsData = Array.isArray(data) ? data : [];
      
      if (append) {
        setAllSessions(prev => [...prev, ...sessionsData]);
      } else {
        setAllSessions(sessionsData);
      }
      
      // Check if there are more pages
      setHasMore(!!response.next);
      
      // Initialize time left for active sessions
      const initialTimeMap: Record<number, number> = {};
      sessionsData.forEach((session: any) => {
        if (session.status === 'ACTIVE' && session.due_at) {
          try {
            const now = new Date();
            const due = parseISO(session.due_at);
            initialTimeMap[session.id] = differenceInMinutes(due, now);
          } catch (error) {
            console.error('Error calculating time left:', error);
          }
        }
      });
      
      if (append) {
        setTimeLeftMap(prev => ({ ...prev, ...initialTimeMap }));
      } else {
        setTimeLeftMap(initialTimeMap);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadSessions(1, false);
  }, [loadSessions]);

  // Filter sessions based on time filter and selected date
  useEffect(() => {
    let filtered = [...allSessions];

    // If a specific date is selected, filter by that date
    if (selectedDate) {
      const selected = new Date(selectedDate);
      const startOfDay = new Date(selected);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selected);
      endOfDay.setHours(23, 59, 59, 999);

      filtered = filtered.filter((session: any) => {
        const borrowedDate = new Date(session.borrowed_at);
        return borrowedDate >= startOfDay && borrowedDate <= endOfDay;
      });
    } else if (timeFilter !== 'forever') {
      // Apply time period filter only if no specific date is selected
      const thresholdDate = new Date();
      if (timeFilter === 'day') {
        thresholdDate.setDate(thresholdDate.getDate() - 1);
      } else if (timeFilter === 'week') {
        thresholdDate.setDate(thresholdDate.getDate() - 7);
      } else if (timeFilter === 'month') {
        thresholdDate.setDate(thresholdDate.getDate() - 30);
      }

      filtered = filtered.filter((session: any) => {
        const borrowedDate = new Date(session.borrowed_at);
        return borrowedDate >= thresholdDate;
      });
    }

    setSessions(filtered);
  }, [timeFilter, selectedDate, allSessions]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    // Only enable infinite scroll if no filters are applied (showing all sessions)
    if (selectedDate || timeFilter !== 'forever') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadSessions(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, page, selectedDate, timeFilter, loadSessions]);

  // Reset time filter when date is selected and vice versa
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (date) {
      setTimeFilter('forever'); // Reset time filter when date is selected
    }
    // Reset pagination when filter changes
    setPage(1);
    setHasMore(true);
  };

  const handleTimeFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter);
    if (filter !== 'forever') {
      setSelectedDate(''); // Reset date when time filter is selected
    }
    // Reset pagination when filter changes
    setPage(1);
    setHasMore(true);
  };

  // Timer effect for active sessions (use allSessions to keep timers running even when filtered out)
  useEffect(() => {
    const activeSessions = allSessions.filter(s => s.status === 'ACTIVE' && s.due_at);
    if (activeSessions.length === 0) return;

    const calculateTime = (session: any) => {
      try {
        const now = new Date();
        const due = parseISO(session.due_at);
        return differenceInMinutes(due, now);
      } catch (error) {
        return null;
      }
    };

    // Update timer every second
    const interval = setInterval(() => {
      const newTimeMap: Record<number, number> = {};
      activeSessions.forEach((session) => {
        const time = calculateTime(session);
        if (time !== null) {
          newTimeMap[session.id] = time;
        }
      });
      setTimeLeftMap(newTimeMap);
    }, 1000);

    return () => clearInterval(interval);
  }, [allSessions]);

  const formatTimeLeft = (minutes: number | null | undefined, dueAt?: string): string => {
    if (minutes === null || minutes === undefined) return '';
    if (minutes < 0) return t('overdue');
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      return `${hours}h ${mins}m`;
    }
    // Show seconds when less than 2 minutes remaining
    if (minutes < 2 && dueAt) {
      try {
        const now = new Date();
        const due = parseISO(dueAt);
        const secondsLeft = Math.floor((due.getTime() - now.getTime()) / 1000);
        if (secondsLeft < 0) return t('overdue');
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        return `${mins}m ${secs}s`;
      } catch (error) {
        return `${Math.ceil(minutes)}m`;
      }
    }
    return `${Math.ceil(minutes)}m`;
  };

  const timeFilterOptions: { value: TimeFilter; label: string }[] = [
    { value: 'day', label: t('lastDay') },
    { value: 'week', label: t('lastWeek') },
    { value: 'month', label: t('lastMonth') },
    { value: 'forever', label: t('forever') },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar skeleton */}
        <div className="lg:col-span-1">
          <div className={`rounded-none sm:rounded-xl p-5 border-y sm:border animate-pulse ${
            darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' : 'bg-white shadow-sm border-[#4D4DA4]/15'
          }`}>
            <div className={`h-6 w-32 rounded mb-4 ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#EBEBFE]'}`}></div>
            <div className={`h-10 rounded mb-6 ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#EBEBFE]'}`}></div>
            <div className={`h-6 w-32 rounded mb-4 ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#EBEBFE]'}`}></div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-10 rounded ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#EBEBFE]'}`}></div>
              ))}
            </div>
          </div>
        </div>
        {/* Content skeleton */}
        <div className="lg:col-span-3 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`rounded-none sm:rounded-xl border-y sm:border p-5 animate-pulse ${
              darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' : 'bg-white shadow-sm border-[#4D4DA4]/15'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-lg ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#EBEBFE]'}`}></div>
                <div className="flex-1 space-y-2">
                  <div className={`h-5 w-48 rounded ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#EBEBFE]'}`}></div>
                  <div className={`h-4 w-32 rounded ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#EBEBFE]'}`}></div>
                  <div className={`h-4 w-24 rounded ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#EBEBFE]'}`}></div>
                </div>
                <div className={`h-6 w-16 rounded-full ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#EBEBFE]'}`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (allSessions.length === 0) {
    return (
      <div className={`text-center py-12 rounded-none sm:rounded-xl border-y sm:border border-dashed ${
        darkMode 
          ? 'bg-[var(--dark-800)] border-[var(--dark-500)] text-[var(--brand-light)]/60' 
          : 'bg-white border-gray-300 text-gray-600'
      }`}>
        <p className="mb-2">{t('noItemsBorrowed')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left Sidebar - Time Filter */}
      <div className="lg:col-span-1">
        <div className={`rounded-none sm:rounded-2xl p-6 border-y sm:border sticky top-[120px] z-30 space-y-6 ${
          darkMode 
            ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' 
            : 'bg-white shadow-sm border border-[#4D4DA4]/15'
        }`}>
          {/* Date Search */}
          <div>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 font-heading font-bold ${
              darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
            }`}>
              <Calendar className="w-5 h-5" />
              {t('searchByDate')}
            </h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                darkMode 
                  ? 'border-[var(--dark-500)] bg-[var(--dark-700)] text-[var(--brand-light)] focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)]' 
                  : 'border-[#4D4DA4]/20 bg-white text-gray-800 focus:ring-[#4D4DA4] focus:border-[#4D4DA4] shadow-sm'
              }`}
              max={new Date().toISOString().split('T')[0]} // Don't allow future dates
            />
            {selectedDate && (
              <button
                onClick={() => handleDateChange('')}
                className={`mt-3 w-full px-3 py-2 text-xs font-medium border rounded-lg transition-all ${
                  darkMode 
                    ? 'text-[var(--brand-primary)] hover:text-[var(--brand-light)] bg-[var(--dark-700)] hover:bg-[var(--dark-600)] border-[var(--dark-500)]' 
                    : 'text-[#4D4DA4] hover:text-[#FF5485] bg-white hover:bg-[#EBEBFE] border-[#4D4DA4]/20'
                }`}
              >
                {t('clearDateFilter')}
              </button>
            )}
          </div>

          {/* Time Period Filter */}
          <div>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 font-heading font-bold ${
              darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'
            }`}>
              <Clock className="w-5 h-5" />
              {t('timePeriod')}
            </h3>
            <div className="space-y-2">
              {timeFilterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTimeFilterChange(option.value)}
                  disabled={!!selectedDate}
                  className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                    selectedDate
                      ? darkMode 
                        ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/30 cursor-not-allowed'
                        : 'bg-[#EBEBFE] text-gray-400 cursor-not-allowed'
                      : timeFilter === option.value
                      ? darkMode
                        ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                        : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white shadow-md shadow-[#4D4DA4]/30'
                      : darkMode
                        ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/80 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)] border border-[var(--dark-500)]'
                        : 'bg-white text-gray-700 hover:bg-[#EBEBFE] hover:text-[#4D4DA4] border border-[#4D4DA4]/15 shadow-sm'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {selectedDate && (
              <p className={`mt-3 text-xs italic p-2 rounded-lg ${
                darkMode ? 'text-[var(--brand-light)]/40 bg-[var(--dark-700)]' : 'text-gray-500 bg-white/60'
              }`}>
                {t('clearDateFilterToUseTimePeriod')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right Column - Inventory History */}
      <div className="lg:col-span-3">
        {sessions.length === 0 && !loading ? (
          <div className={`rounded-none sm:rounded-2xl border-y sm:border p-6 sm:p-8 text-center ${
            darkMode 
              ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' 
              : 'bg-white shadow-sm border border-[#4D4DA4]/15'
          }`}>
            <Package className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 ${
              darkMode ? 'text-[var(--brand-light)]/30' : 'text-[#4D4DA4]/40'
            }`} />
            <p className={`text-sm sm:text-base ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{t('noItemsFound')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const isActive = session.status === 'ACTIVE';
              const timeLeft = timeLeftMap[session.id];
              const isOverdue = timeLeft !== undefined && timeLeft <= 0;
              const borrowedDate = new Date(session.borrowed_at);
              const returnedDate = session.returned_at ? new Date(session.returned_at) : null;
              
              return (
                <div 
                  key={session.id} 
                  className={`rounded-none sm:rounded-2xl border-y sm:border overflow-hidden transition-all ${
                    darkMode 
                      ? 'bg-[var(--dark-800)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/40' 
                      : 'bg-white shadow-md border-2 border-[#4D4DA4]/10 hover:shadow-lg hover:border-[#4D4DA4]/30'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1">
                        {/* Item Image */}
                        {session.item_image ? (
                          <img 
                            src={getMediaUrl(session.item_image)} 
                            alt={session.item_title}
                            className={`h-14 w-14 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl object-cover border-2 flex-shrink-0 ${
                              darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/20 shadow-sm'
                            }`}
                            onError={(e) => {
                              // Fallback to icon if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`h-14 w-14 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 ${
                            isActive 
                              ? isOverdue 
                                ? 'bg-gradient-to-br from-[var(--brand-red)] to-red-600 text-white' 
                                : darkMode 
                                  ? 'bg-gradient-to-br from-[var(--brand-third)] to-emerald-500 text-[var(--dark-900)]'
                                  : 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white'
                              : darkMode
                                ? 'bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)] text-[var(--dark-900)]'
                                : 'bg-gradient-to-br from-[#4D4DA4] to-[#6D6DD4] text-white shadow-sm'
                          }`}
                          style={{ display: session.item_image ? 'none' : 'flex' }}
                        >
                          <Package className="w-7 h-7 sm:w-8 sm:h-8" />
                        </div>
                        
                        {/* Item Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold text-lg sm:text-xl mb-1 sm:mb-2 font-heading font-bold ${
                            darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
                          }`}>{session.item_title}</h3>
                          <div className={`flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-xs mb-2 ${
                            darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                          }`}>
                            <span>{format(borrowedDate, 'EEE, MMM d, yyyy', { locale: dateLocale })}</span>
                            <span>•</span>
                            <span>{format(borrowedDate, 'HH:mm', { locale: dateLocale })}</span>
                            {session.is_guest && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span className={`font-medium w-full sm:w-auto ${
                                  darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'
                                }`}>{t('guestVisit')}</span>
                              </>
                            )}
                          </div>
                          
                          {/* Timer for active sessions */}
                          {isActive && timeLeft !== undefined && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className={`flex items-center gap-1.5 text-sm font-semibold ${
                                isOverdue 
                                  ? 'text-[var(--brand-red)]' 
                                  : timeLeft < 15 
                                  ? 'text-[var(--brand-peach)]' 
                                  : darkMode ? 'text-[var(--brand-third)]' : 'text-emerald-400'
                              }`}>
                                <Clock size={14} /> 
                                {isOverdue ? (
                                  <span className="flex items-center gap-1">
                                    <AlertCircle size={14} /> {t('overdue')}
                                  </span>
                                ) : (
                                  `${formatTimeLeft(timeLeft, session.due_at)} ${t('left')}`
                                )}
                              </span>
                            </div>
                          )}
                          
                                          {/* Return Now Label */}
                          {isActive && isOverdue && (
                            <div className="mt-2 sm:mt-3 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-[var(--brand-red)] to-red-600 rounded-lg sm:rounded-xl w-fit">
                              <AlertCircle size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
                              <span className="text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
                                {t('returnNow')}
                              </span>
                            </div>
                          )}
                          
                          {/* Returned info */}
                          {returnedDate && (
                            <div className={`mt-2 text-xs px-2 py-1 rounded-lg inline-block ${
                              darkMode 
                                ? 'text-[var(--brand-light)]/60 bg-[var(--dark-700)]' 
                                : 'text-gray-600 bg-white/60'
                            }`}>
                              <span className="font-semibold">{t('returned')}</span> {format(returnedDate, 'MMM d, yyyy', { locale: dateLocale })} {t('at')} {format(returnedDate, 'HH:mm', { locale: dateLocale })}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="flex-shrink-0 sm:ml-4 self-start sm:self-auto">
                        {isActive ? (
                          <span className={`inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold ${
                            isOverdue 
                              ? 'bg-gradient-to-r from-[var(--brand-red)] to-red-600 text-white' 
                              : darkMode
                                ? 'bg-[var(--brand-third)] text-[var(--dark-900)]'
                                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                          }`}>
                            {isOverdue ? t('overdue') : t('active')}
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold ${
                            darkMode 
                              ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/70' 
                              : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 shadow-sm'
                          }`}>
                            {t('returnedStatus')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Infinite Scroll Trigger */}
            {!selectedDate && timeFilter === 'forever' && (
              <div ref={observerTarget} className="h-10 flex items-center justify-center py-4">
                {loadingMore && (
                  <div className={`flex items-center gap-2 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                    <div className={`animate-spin rounded-full h-5 w-5 border-b-2 ${
                      darkMode ? 'border-[var(--brand-primary)]' : 'border-[#4D4DA4]'
                    }`}></div>
                    <span className="text-sm">{t('loadingMoreItems')}</span>
                  </div>
                )}
                {!hasMore && sessions.length > 0 && (
                  <p className={`text-sm text-center ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-500'}`}>
                    {t('noMoreItemsToLoad')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

