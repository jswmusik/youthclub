'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ProfileTabs from './ProfileTabs';
import { getMediaUrl } from '@/app/utils';
import ActivityFeed from './tabs/ActivityFeed';
import ClubsAndGroups from './tabs/ClubsAndGroups';
import WalletGrid from './tabs/WalletGrid';
import YouthGuardianManager from '../youth/guardians/YouthGuardianManager';
import { inventoryApi } from '@/lib/inventory-api';
import { Package, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { differenceInMinutes, parseISO } from 'date-fns';

const VALID_TABS = ['overview', 'clubs', 'guardians', 'wallet', 'timeline', 'inventory'];

export default function ProfileContent({ user }: { user: any }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Get initial tab from URL, default to 'overview'
  const tabFromUrl = searchParams.get('tab');
  const initialTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'overview';
  
  const [activeTab, setActiveTab] = useState(initialTab);

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
        return <OverviewTab user={user} getAge={getAge} onSwitchTab={handleTabChange} />;
      case 'clubs':
        return <ClubsAndGroups user={user} />;
      case 'inventory':
        return <InventoryTab />;
      case 'guardians':
        return <YouthGuardianManager />;
      case 'wallet':
        return <WalletGrid user={user} />;
      case 'timeline':
        // Reuse the same feed component for the dedicated tab
        return <ActivityFeed />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* 1. The Navigation Bar */}
      <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* 2. The Content Area */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {renderTabContent()}
      </div>
    </>
  );
}

// --- SUB-COMPONENTS (We can move these to separate files later) ---

function OverviewTab({ user, getAge, onSwitchTab }: { user: any, getAge: (d: string) => number | null, onSwitchTab: (t: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Left Column: Intro & Stats */}
      <div className="md:col-span-1 space-y-6 md:sticky md:top-[120px] md:self-start md:max-h-[calc(100vh-120px)] md:overflow-y-auto">
        
        {/* About Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">About</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-center text-gray-600">
              <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              <span>Member of <strong>{user.preferred_club?.name || 'No Club'}</strong></span>
            </div>
            
            {user.grade && (
              <div className="flex items-center text-gray-600">
                <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                <span>Grade {user.grade}</span>
              </div>
            )}

            {user.date_of_birth && (
              <div className="flex items-center text-gray-600">
                <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" /></svg>
                <span>{getAge(user.date_of_birth)} years old</span>
              </div>
            )}
            
            <div className="flex items-center text-gray-600">
              <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span>Joined {new Date(user.date_joined).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Interests Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
           <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">Interests</h3>
              <span className="text-xs text-blue-600 cursor-pointer hover:underline">Edit</span>
           </div>
           <div className="flex flex-wrap gap-2">
              {(!user.interests || user.interests.length === 0) && (
                <p className="text-sm text-gray-400 italic">No interests added yet.</p>
              )}
              {/* Render interest chips - interests should now come as objects with name property */}
              {user.interests && user.interests.map((interest: any) => {
                // Handle both object format {id, name, icon, avatar} and legacy ID format
                const interestId = typeof interest === 'object' ? interest.id : interest;
                const interestName = typeof interest === 'object' ? interest.name : null;
                
                return (
                  <span key={interestId} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {interestName || `Interest ${interestId}`}
                  </span>
                );
              })}
           </div>
        </div>

        {/* Guardians Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">My Guardians</h3>
            {/* Manage Button */}
            <button 
                onClick={() => onSwitchTab('guardians')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
            >
                Manage
            </button>
          </div>
          
          <div className="space-y-3">
            {/* We map guardians here. If none, show placeholder */}
            {(!user.guardians || user.guardians.length === 0) ? (
               <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-sm text-gray-500 mb-2">No guardians linked.</p>
                  <button 
                    onClick={() => onSwitchTab('guardians')}
                    className="text-xs bg-white border border-gray-300 px-3 py-1 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Add Guardian
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
                   <div key={guardianId} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition">
                     {avatar ? (
                       <img src={getMediaUrl(avatar) || ''} alt={fullName} className="w-10 h-10 rounded-full object-cover" />
                     ) : (
                       <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                         {initials}
                       </div>
                     )}
                     <div>
                       <p className="text-sm font-medium text-gray-900">{fullName}</p>
                       <p className="text-xs text-gray-500">Parent/Guardian</p>
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
        <ActivityFeed showTimeFilter={false} />
      </div>
    </div>
  );
}

type TimeFilter = 'day' | 'week' | 'month' | 'forever';

function InventoryTab() {
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
    if (minutes < 0) return 'Overdue';
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
        if (secondsLeft < 0) return 'Overdue';
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
    { value: 'day', label: 'Last Day' },
    { value: 'week', label: 'Last Week' },
    { value: 'month', label: 'Last Month' },
    { value: 'forever', label: 'Forever' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar skeleton */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-10 bg-gray-200 rounded mb-6"></div>
            <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
        {/* Content skeleton */}
        <div className="lg:col-span-3 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-48 bg-gray-200 rounded"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (allSessions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
        <p className="text-gray-500 mb-2">You haven't borrowed any items yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left Sidebar - Time Filter */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 sticky top-[120px] z-30 space-y-6">
          {/* Date Search */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Search by Date</h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              max={new Date().toISOString().split('T')[0]} // Don't allow future dates
            />
            {selectedDate && (
              <button
                onClick={() => handleDateChange('')}
                className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear date filter
              </button>
            )}
          </div>

          {/* Time Period Filter */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Time Period</h3>
            <div className="space-y-2">
              {timeFilterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTimeFilterChange(option.value)}
                  disabled={!!selectedDate}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                    selectedDate
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-transparent'
                      : timeFilter === option.value
                      ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                      : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100 hover:border-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {selectedDate && (
              <p className="mt-2 text-xs text-gray-500 italic">
                Select a date or clear date filter to use time period
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right Column - Inventory History */}
      <div className="lg:col-span-3">
        {sessions.length === 0 && !loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500">No items found for the selected time period.</p>
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
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Card Header */}
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Item Image */}
                        {session.item_image ? (
                          <img 
                            src={getMediaUrl(session.item_image)} 
                            alt={session.item_title}
                            className="h-12 w-12 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
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
                          className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isActive 
                              ? isOverdue 
                                ? 'bg-red-50 text-red-600' 
                                : 'bg-green-50 text-green-600'
                              : 'bg-indigo-50 text-indigo-600'
                          }`}
                          style={{ display: session.item_image ? 'none' : 'flex' }}
                        >
                          <Package className="w-6 h-6" />
                        </div>
                        
                        {/* Item Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-lg mb-1">{session.item_title}</h3>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <span>{borrowedDate.toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}</span>
                            <span>•</span>
                            <span>{borrowedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            {session.is_guest && (
                              <>
                                <span>•</span>
                                <span className="text-purple-600 font-medium">Guest Visit</span>
                              </>
                            )}
                          </div>
                          
                          {/* Timer for active sessions */}
                          {isActive && timeLeft !== undefined && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className={`flex items-center gap-1.5 text-sm font-semibold ${
                                isOverdue 
                                  ? 'text-red-600' 
                                  : timeLeft < 15 
                                  ? 'text-orange-600' 
                                  : 'text-green-600'
                              }`}>
                                <Clock size={14} /> 
                                {isOverdue ? (
                                  <span className="flex items-center gap-1">
                                    <AlertCircle size={14} /> Overdue
                                  </span>
                                ) : (
                                  `${formatTimeLeft(timeLeft, session.due_at)} left`
                                )}
                              </span>
                            </div>
                          )}
                          
                          {/* Return Now Label */}
                          {isActive && isOverdue && (
                            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg w-fit">
                              <AlertCircle size={16} className="text-red-600" />
                              <span className="text-red-600 font-bold text-xs uppercase tracking-wide">
                                Return Now!
                              </span>
                            </div>
                          )}
                          
                          {/* Returned info */}
                          {returnedDate && (
                            <div className="mt-2 text-xs text-gray-500">
                              Returned: {returnedDate.toLocaleDateString()} at {returnedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="flex-shrink-0 ml-4">
                        {isActive ? (
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                            isOverdue 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {isOverdue ? 'Overdue' : 'Active'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                            Returned
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
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Loading more items...</span>
                  </div>
                )}
                {!hasMore && sessions.length > 0 && (
                  <p className="text-sm text-gray-400 text-center">
                    No more items to load
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

