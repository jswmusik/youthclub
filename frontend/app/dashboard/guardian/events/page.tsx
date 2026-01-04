'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import Link from 'next/link';

import api from '@/lib/api';
import GuardianNavBar from '@/app/components/guardian/GuardianNavBar';
import GuardianSidebar from '@/app/components/guardian/GuardianSidebar';
import { EventsPageSkeleton } from '@/app/components/ui/Skeleton';
import Footer from '@/app/components/Footer';
import GuardianEventApprovalList from '@/app/components/events/guardian/GuardianEventApprovalList';
import { Search, Calendar, MapPin, X, CalendarDays, ArrowUpDown, Clock, Repeat, Sparkles, Users, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Event } from '@/types/event';
import GuardianEventCard from './GuardianEventCard';
import { useToast } from '../../../../hooks/useToast';

// Minimum skeleton display time (in ms) for better UX
const MIN_LOADING_TIME = 400;

type SortOption = 'closest' | 'newest' | 'recurring';

export default function GuardianEventsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const t = useTranslations('events');
    const tSidebar = useTranslations('sidebar');
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
    const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
    const [showApprovals, setShowApprovals] = useState(true);
    const [loading, setLoading] = useState(true);
    const [minLoadingComplete, setMinLoadingComplete] = useState(false);
    
    // Theme detection
    useEffect(() => {
        setMounted(true);
    }, []);
    const darkMode = !mounted || theme === 'dark';
    
    // Track if initial load from URL is done to prevent infinite loops
    const isInitializedRef = useRef(false);
    
    // Toast
    const { success, error, info, warning } = useToast();

    // Minimum loading time for skeleton display
    useEffect(() => {
        const timer = setTimeout(() => {
            setMinLoadingComplete(true);
        }, MIN_LOADING_TIME);
        return () => clearTimeout(timer);
    }, []);
    
    // Initialize state from URL params (only once on mount)
    const [search, setSearch] = useState(() => searchParams.get('q') || '');
    const [fromDate, setFromDate] = useState(() => searchParams.get('from') || '');
    const [toDate, setToDate] = useState(() => searchParams.get('to') || '');
    const [sortBy, setSortBy] = useState<SortOption>(() => (searchParams.get('sort') as SortOption) || 'closest');
    const [showDateFilters, setShowDateFilters] = useState(() => !!(searchParams.get('from') || searchParams.get('to')));
    
    // Update URL when filters change
    const updateURL = useCallback((params: Record<string, string | boolean | null>) => {
        const newParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== '' && value !== false) {
                newParams.set(key, String(value));
            }
        });
        
        const newUrl = newParams.toString() ? `${pathname}?${newParams.toString()}` : pathname;
        router.replace(newUrl, { scroll: false });
    }, [pathname, router]);

    const fetchPendingApprovals = useCallback(async () => {
        try {
            const res = await api.get('/registrations/?page_size=1000');
            const allRegs = res.data.results || res.data;
            const pending = allRegs.filter((r: any) => r.status === 'PENDING_GUARDIAN');
            setPendingApprovals(pending);
        } catch (err) {
            console.error('Failed to fetch pending approvals:', err);
        }
    }, []);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            // The backend already filters events for guardians:
            // - Shows events that any of their children are eligible for
            // - Excludes group-targeted events (events with target_groups)
            const [eventsRes] = await Promise.all([
                api.get('/events/'),
                fetchPendingApprovals()
            ]);
            const all = eventsRes.data.results || eventsRes.data;
            
            // Filter out events that are targeted to specific groups
            // Guardians should not see group-specific events
            const nonGroupEvents = all.filter((event: Event) => {
                // If the event has target_groups, it's a group event - exclude it
                const targetGroups = (event as any).target_groups;
                if (targetGroups && Array.isArray(targetGroups) && targetGroups.length > 0) {
                    return false;
                }
                return true;
            });
            
            setUpcomingEvents(nonGroupEvents);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [fetchPendingApprovals]);

    const handleApprovalAction = useCallback((action: 'approve' | 'reject', eventTitle: string, childName: string) => {
        const isApproved = action === 'approve';
        showToast(
            setToast,
            `${childName} - ${eventTitle}`,
            'success',
            isApproved 
                ? (t('approvalSuccess') || 'Registration approved!')
                : (t('rejectionSuccess') || 'Registration rejected')
        );

        // Refresh the events list as well
        fetchData();
    }, [t, fetchData]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, fetchData]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && user) {
                fetchData();
            }
        };

        const handleFocus = () => {
            if (user) {
                fetchData();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [user, fetchData]);

    // Update URL when filters change (skip on initial render)
    useEffect(() => {
        // Skip URL update on initial render to prevent infinite loop
        if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            return;
        }
        
        const timeoutId = setTimeout(() => {
            updateURL({
                q: search || null,
                from: fromDate || null,
                to: toDate || null,
                sort: sortBy !== 'closest' ? sortBy : null,
            });
        }, 300); // Debounce URL updates
        
        return () => clearTimeout(timeoutId);
    }, [search, fromDate, toDate, sortBy, updateURL]);

    const filteredAndSortedEvents = useMemo(() => {
        let filtered = [...upcomingEvents];

        if (search) {
            filtered = filtered.filter(e => 
                e.title.toLowerCase().includes(search.toLowerCase()) || 
                e.location_name.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (fromDate) {
            const from = new Date(fromDate);
            filtered = filtered.filter(e => new Date(e.start_date) >= from);
        }
        if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            filtered = filtered.filter(e => new Date(e.start_date) <= to);
        }

        // Apply sorting
        switch (sortBy) {
            case 'closest':
                // Sort by start date (closest first)
                filtered.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
                break;
            case 'newest':
                // Sort by created date (newest first)
                filtered.sort((a, b) => new Date(b.created_at || b.start_date).getTime() - new Date(a.created_at || a.start_date).getTime());
                break;
            case 'recurring':
                // Show recurring events first, then sort by start date
                filtered.sort((a, b) => {
                    const aRecurring = a.is_recurring ? 1 : 0;
                    const bRecurring = b.is_recurring ? 1 : 0;
                    if (bRecurring !== aRecurring) return bRecurring - aRecurring;
                    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
                });
                break;
        }

        return filtered;
    }, [upcomingEvents, search, fromDate, toDate, sortBy]);

    const clearFilters = () => {
        setSearch('');
        setFromDate('');
        setToDate('');
        setSortBy('closest');
    };

    const hasActiveFilters = search || fromDate || toDate || sortBy !== 'closest';
    const activeFilterCount = [search, fromDate, toDate, sortBy !== 'closest'].filter(Boolean).length;
    
    // Show skeleton while loading (with minimum display time)
    const showSkeleton = loading || !minLoadingComplete;

    return (
        <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
            <div className="flex-1">
                <GuardianNavBar 
                    onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                />
            
                {/* Mobile Sidebar Overlay */}
                <div 
                    className={`fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300 ${
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
                    <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/10'}`}>
                        <h1 className={`text-xl font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{tSidebar('menu')}</h1>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg ${darkMode ? 'text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)]' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 overflow-y-auto h-[calc(100vh-64px)]">
                        <GuardianSidebar pendingApprovalsCount={pendingApprovals.length} />
                    </div>
                </aside>
            
                {/* Main Layout */}
                <div className="pt-14 sm:pt-16">
                    <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 relative">
                        {/* Desktop Sidebar - Fixed position aligned with container */}
                        <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
                            <GuardianSidebar pendingApprovalsCount={pendingApprovals.length} />
                        </aside>
                        
                        {/* Content wrapper with left margin for sidebar */}
                        <div className="md:ml-60">

                            {/* Main Content */}
                            <main className="flex-1 min-w-0 p-0 sm:p-4 md:p-6 pb-24 md:pb-6">
                                {showSkeleton ? (
                                    <EventsPageSkeleton />
                                ) : (
                                    <>
                                        {/* Pending Approvals Section */}
                                        {pendingApprovals.length > 0 && (
                                            <div className="px-4 sm:px-0 mb-6">
                                                <div 
                                                    className={`rounded-none sm:rounded-2xl border-y sm:border overflow-hidden ${
                                                        darkMode 
                                                            ? 'bg-[var(--dark-800)] border-[var(--brand-coral)]/30' 
                                                            : 'bg-white border-orange-200 shadow-sm'
                                                    }`}
                                                >
                                                    {/* Header - Clickable to toggle */}
                                                    <button
                                                        onClick={() => setShowApprovals(!showApprovals)}
                                                        className={`w-full px-4 sm:px-6 py-4 flex items-center justify-between transition-colors ${
                                                            darkMode ? 'hover:bg-[var(--dark-700)]/50' : 'hover:bg-orange-50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                                darkMode ? 'bg-[var(--brand-coral)]/20' : 'bg-orange-100'
                                                            }`}>
                                                                <AlertCircle className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-coral)]' : 'text-orange-600'}`} />
                                                            </div>
                                                            <div className="text-left">
                                                                <h2 className={`text-lg font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                                                                    {t('pendingApprovals') || 'Pending Approvals'}
                                                                </h2>
                                                                <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                                                                    {pendingApprovals.length} {pendingApprovals.length === 1 
                                                                        ? (t('childWantsToAttend') || 'child wants to attend an event')
                                                                        : (t('childrenWantToAttend') || 'children want to attend events')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                                                                darkMode 
                                                                    ? 'bg-[var(--brand-coral)] text-[var(--dark-900)]' 
                                                                    : 'bg-orange-500 text-white'
                                                            }`}>
                                                                {pendingApprovals.length}
                                                            </span>
                                                            {showApprovals ? (
                                                                <ChevronUp className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-400'}`} />
                                                            ) : (
                                                                <ChevronDown className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-400'}`} />
                                                            )}
                                                        </div>
                                                    </button>
                                                    
                                                    {/* Collapsible Content */}
                                                    {showApprovals && (
                                                        <div className="px-4 sm:px-6 pb-6">
                                                            <GuardianEventApprovalList 
                                                                registrations={pendingApprovals}
                                                                onRefresh={fetchPendingApprovals}
                                                                onActionComplete={handleApprovalAction}
                                                                darkMode={darkMode}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Header Section */}
                                        <div className="px-4 sm:px-0 mb-4 sm:mb-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 sm:gap-3 mb-1">
                                                        <CalendarDays className={`w-6 h-6 sm:w-7 sm:h-7 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`} />
                                                        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-heading font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                                                            {t('upcomingEvents') || 'Upcoming Events'}
                                                        </h1>
                                                    </div>
                                                    <p className={`text-sm pl-9 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                                                        {hasActiveFilters 
                                                            ? `${filteredAndSortedEvents.length} ${filteredAndSortedEvents.length !== 1 ? t('eventsFoundPlural') : t('eventsFound')} ${t('found')}`
                                                            : `${upcomingEvents.length} ${t('eventsForChildren') || 'events for your children'}`}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-3">
                                                    <Link 
                                                        href="/dashboard/guardian/events/calendar"
                                                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all text-sm ${
                                                            darkMode 
                                                                ? 'bg-[var(--brand-green)] text-[var(--dark-900)] hover:bg-[var(--brand-green)]/90' 
                                                                : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                                        }`}
                                                    >
                                                        <Calendar className="w-4 h-4" />
                                                        {t('eventCalendar')}
                                                    </Link>
                                                </div>
                                            </div>

                                            {/* Search & Filters */}
                                            <div className={`rounded-none sm:rounded-2xl border-y sm:border px-4 py-3 sm:p-4 -mx-4 sm:mx-0 ${
                                                darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/15 shadow-sm'
                                            }`}>
                                                {/* Search Bar */}
                                                <div className="relative mb-3">
                                                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`} />
                                                    <input 
                                                        type="text" 
                                                        placeholder={t('searchEventsPlaceholder')}
                                                        className={`w-full rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 transition-all ${
                                                            darkMode 
                                                                ? 'bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40 focus:ring-[var(--brand-primary)]/30'
                                                                : 'bg-white border border-[#4D4DA4]/15 text-gray-800 placeholder:text-gray-400 focus:ring-[#4D4DA4]/30'
                                                        }`}
                                                        value={search}
                                                        onChange={e => setSearch(e.target.value)}
                                                    />
                                                    {search && (
                                                        <button 
                                                            onClick={() => setSearch('')}
                                                            className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]/60' : 'text-gray-400 hover:text-gray-600'}`}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Filter Chips */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {/* Sort Options */}
                                                    <div className={`flex items-center gap-1 mr-2 pr-2 border-r ${darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/15'}`}>
                                                        <ArrowUpDown className={`w-3.5 h-3.5 ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-400'}`} />
                                                        <button
                                                            onClick={() => setSortBy('closest')}
                                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                                                                sortBy === 'closest'
                                                                    ? 'bg-[var(--brand-sky)] text-[var(--dark-900)]'
                                                                    : darkMode ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]' : 'text-gray-500 hover:text-gray-700'
                                                            }`}
                                                        >
                                                            <Clock className="w-3 h-3" />
                                                            {t('soonest')}
                                                        </button>
                                                        <button
                                                            onClick={() => setSortBy('newest')}
                                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                                                                sortBy === 'newest'
                                                                    ? 'bg-[var(--brand-sky)] text-[var(--dark-900)]'
                                                                    : darkMode ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]' : 'text-gray-500 hover:text-gray-700'
                                                            }`}
                                                        >
                                                            <Sparkles className="w-3 h-3" />
                                                            {t('newest')}
                                                        </button>
                                                        <button
                                                            onClick={() => setSortBy('recurring')}
                                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                                                                sortBy === 'recurring'
                                                                    ? 'bg-[var(--brand-sky)] text-[var(--dark-900)]'
                                                                    : darkMode ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]' : 'text-gray-500 hover:text-gray-700'
                                                            }`}
                                                        >
                                                            <Repeat className="w-3 h-3" />
                                                            {t('recurring')}
                                                        </button>
                                                    </div>

                                                    {/* Date Filter Toggle */}
                                                    <button
                                                        onClick={() => setShowDateFilters(!showDateFilters)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                            (fromDate || toDate) 
                                                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                                                : darkMode ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 hover:bg-[var(--dark-500)]' : 'bg-[#EBEBFE] text-gray-600 hover:bg-[#4D4DA4]/20'
                                                        }`}
                                                    >
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {t('date')}
                                                        {(fromDate || toDate) && <span className="ml-0.5">•</span>}
                                                    </button>

                                                    {hasActiveFilters && (
                                                        <button
                                                            onClick={clearFilters}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all ml-auto"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                            {t('clear')} ({activeFilterCount})
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Date Range Picker (Expandable) */}
                                                {showDateFilters && (
                                                    <div className={`mt-3 pt-3 border-t flex flex-col sm:flex-row gap-3 sm:gap-3 ${darkMode ? 'border-[var(--dark-600)]' : 'border-[#4D4DA4]/10'}`}>
                                                        <div className="flex-1 min-w-0 sm:min-w-[140px]">
                                                            <label className={`block text-xs mb-1 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{t('from')}</label>
                                                            <input
                                                                type="date"
                                                                className={`w-full rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 ${
                                                                    darkMode 
                                                                        ? 'bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] focus:ring-[var(--brand-primary)]/30'
                                                                        : 'bg-white border border-[#4D4DA4]/15 text-gray-800 focus:ring-[#4D4DA4]/30'
                                                                }`}
                                                                value={fromDate}
                                                                onChange={e => setFromDate(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0 sm:min-w-[140px]">
                                                            <label className={`block text-xs mb-1 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{t('to')}</label>
                                                            <input
                                                                type="date"
                                                                className={`w-full rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 ${
                                                                    darkMode 
                                                                        ? 'bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] focus:ring-[var(--brand-primary)]/30'
                                                                        : 'bg-white border border-[#4D4DA4]/15 text-gray-800 focus:ring-[#4D4DA4]/30'
                                                                }`}
                                                                value={toDate}
                                                                onChange={e => setToDate(e.target.value)}
                                                                min={fromDate || undefined}
                                                            />
                                                        </div>
                                                        {(fromDate || toDate) && (
                                                            <button
                                                                onClick={() => { setFromDate(''); setToDate(''); }}
                                                                className={`self-start sm:self-end px-3 py-2 text-xs hover:text-[var(--brand-red)] whitespace-nowrap ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}
                                                            >
                                                                {t('clearDates')}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Events List */}
                                        {filteredAndSortedEvents.length === 0 ? (
                                            <div className={`text-center py-16 rounded-none sm:rounded-2xl border-y sm:border ${
                                                darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/15 shadow-sm'
                                            }`}>
                                                <div className="max-w-sm mx-auto">
                                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#EBEBFE]'}`}>
                                                        <Calendar className={`w-8 h-8 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-[#4D4DA4]/40'}`} />
                                                    </div>
                                                    <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{t('noEventsFound')}</h3>
                                                    <p className={`text-sm mb-4 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                                                        {hasActiveFilters 
                                                            ? t('tryAdjustingFilters')
                                                            : t('noUpcomingEventsForChildren') || 'No upcoming events for your children at the moment.'}
                                                    </p>
                                                    {hasActiveFilters && (
                                                        <button
                                                            onClick={clearFilters}
                                                            className={`inline-flex items-center gap-2 font-semibold hover:underline ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`}
                                                        >
                                                            {t('clearAllFilters')}
                                                            <span>→</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 sm:space-y-3">
                                                {filteredAndSortedEvents.map(event => (
                                                    <GuardianEventCard key={event.id} event={event} darkMode={darkMode} />
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </main>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <Footer homeLink="/dashboard/guardian" />
        </div>
    );
}

