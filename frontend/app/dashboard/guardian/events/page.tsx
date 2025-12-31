'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
    const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
    const [showApprovals, setShowApprovals] = useState(true);
    const [loading, setLoading] = useState(true);
    const [minLoadingComplete, setMinLoadingComplete] = useState(false);
    
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
        <div className="min-h-screen flex flex-col bg-[var(--dark-900)]">
            <div className="flex-1">
                <GuardianNavBar 
                    onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                    darkMode={true}
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
                    className={`fixed top-0 left-0 h-screen w-64 z-50 bg-[var(--dark-800)] transform transition-transform duration-300 md:hidden ${
                        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
                    <div className="flex items-center justify-between p-4 border-b border-[var(--dark-600)]">
                        <h1 className="text-xl font-bold text-[var(--brand-light)]">{tSidebar('menu')}</h1>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)]"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 overflow-y-auto h-[calc(100vh-64px)]">
                        <GuardianSidebar darkMode={true} pendingApprovalsCount={pendingApprovals.length} />
                    </div>
                </aside>
            
                {/* Main Layout */}
                <div className="pt-14 sm:pt-16">
                    <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 relative">
                        {/* Desktop Sidebar - Fixed position aligned with container */}
                        <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
                            <GuardianSidebar darkMode={true} pendingApprovalsCount={pendingApprovals.length} />
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
                                                    className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--brand-coral)]/30 overflow-hidden"
                                                >
                                                    {/* Header - Clickable to toggle */}
                                                    <button
                                                        onClick={() => setShowApprovals(!showApprovals)}
                                                        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-[var(--dark-700)]/50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-[var(--brand-coral)]/20 flex items-center justify-center">
                                                                <AlertCircle className="w-5 h-5 text-[var(--brand-coral)]" />
                                                            </div>
                                                            <div className="text-left">
                                                                <h2 className="text-lg font-bold text-[var(--brand-light)]">
                                                                    {t('pendingApprovals') || 'Pending Approvals'}
                                                                </h2>
                                                                <p className="text-sm text-[var(--brand-light)]/60">
                                                                    {pendingApprovals.length} {pendingApprovals.length === 1 
                                                                        ? (t('childWantsToAttend') || 'child wants to attend an event')
                                                                        : (t('childrenWantToAttend') || 'children want to attend events')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-[var(--brand-coral)] text-[var(--dark-900)] text-sm font-bold px-3 py-1 rounded-full">
                                                                {pendingApprovals.length}
                                                            </span>
                                                            {showApprovals ? (
                                                                <ChevronUp className="w-5 h-5 text-[var(--brand-light)]/60" />
                                                            ) : (
                                                                <ChevronDown className="w-5 h-5 text-[var(--brand-light)]/60" />
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
                                                                darkMode={true}
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
                                                        <CalendarDays className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--brand-primary)]" />
                                                        <h1 className={`text-2xl sm:text-3xl md:text-4xl text-[var(--brand-light)] font-heading font-bold`}>
                                                            {t('upcomingEvents') || 'Upcoming Events'}
                                                        </h1>
                                                    </div>
                                                    <p className="text-[var(--brand-light)]/60 text-sm pl-9">
                                                        {hasActiveFilters 
                                                            ? `${filteredAndSortedEvents.length} ${filteredAndSortedEvents.length !== 1 ? t('eventsFoundPlural') : t('eventsFound')} ${t('found')}`
                                                            : `${upcomingEvents.length} ${t('eventsForChildren') || 'events for your children'}`}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-3">
                                                    <Link 
                                                        href="/dashboard/guardian/events/calendar"
                                                        className="inline-flex items-center gap-2 bg-[var(--brand-green)] text-[var(--dark-900)] px-4 py-2.5 rounded-xl font-semibold hover:bg-[var(--brand-green)]/90 transition-all text-sm"
                                                    >
                                                        <Calendar className="w-4 h-4" />
                                                        {t('eventCalendar')}
                                                    </Link>
                                                </div>
                                            </div>

                                            {/* Search & Filters */}
                                            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] px-4 py-3 sm:p-4 -mx-4 sm:mx-0">
                                                {/* Search Bar */}
                                                <div className="relative mb-3">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 w-5 h-5" />
                                                    <input 
                                                        type="text" 
                                                        placeholder={t('searchEventsPlaceholder')}
                                                        className="w-full bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl py-3 pl-12 pr-4 text-sm text-[var(--brand-light)] placeholder:text-[var(--brand-light)]/40 outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 transition-all"
                                                        value={search}
                                                        onChange={e => setSearch(e.target.value)}
                                                    />
                                                    {search && (
                                                        <button 
                                                            onClick={() => setSearch('')}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]/60"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Filter Chips */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {/* Sort Options */}
                                                    <div className="flex items-center gap-1 mr-2 pr-2 border-r border-[var(--dark-500)]">
                                                        <ArrowUpDown className="w-3.5 h-3.5 text-[var(--brand-light)]/50" />
                                                        <button
                                                            onClick={() => setSortBy('closest')}
                                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                                                                sortBy === 'closest'
                                                                    ? 'bg-[var(--brand-sky)] text-[var(--dark-900)]'
                                                                    : 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]'
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
                                                                    : 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]'
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
                                                                    : 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)]'
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
                                                                : 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 hover:bg-[var(--dark-500)]'
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
                                                    <div className="mt-3 pt-3 border-t border-[var(--dark-600)] flex flex-col sm:flex-row gap-3 sm:gap-3">
                                                        <div className="flex-1 min-w-0 sm:min-w-[140px]">
                                                            <label className="block text-xs text-[var(--brand-light)]/60 mb-1">{t('from')}</label>
                                                            <input
                                                                type="date"
                                                                className="w-full bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-lg py-2 px-3 text-sm text-[var(--brand-light)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
                                                                value={fromDate}
                                                                onChange={e => setFromDate(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0 sm:min-w-[140px]">
                                                            <label className="block text-xs text-[var(--brand-light)]/60 mb-1">{t('to')}</label>
                                                            <input
                                                                type="date"
                                                                className="w-full bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-lg py-2 px-3 text-sm text-[var(--brand-light)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
                                                                value={toDate}
                                                                onChange={e => setToDate(e.target.value)}
                                                                min={fromDate || undefined}
                                                            />
                                                        </div>
                                                        {(fromDate || toDate) && (
                                                            <button
                                                                onClick={() => { setFromDate(''); setToDate(''); }}
                                                                className="self-start sm:self-end px-3 py-2 text-xs text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] whitespace-nowrap"
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
                                            <div className="text-center py-16 bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)]">
                                                <div className="max-w-sm mx-auto">
                                                    <div className="w-16 h-16 bg-[var(--dark-700)] rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <Calendar className="w-8 h-8 text-[var(--brand-light)]/40" />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('noEventsFound')}</h3>
                                                    <p className="text-sm text-[var(--brand-light)]/60 mb-4">
                                                        {hasActiveFilters 
                                                            ? t('tryAdjustingFilters')
                                                            : t('noUpcomingEventsForChildren') || 'No upcoming events for your children at the moment.'}
                                                    </p>
                                                    {hasActiveFilters && (
                                                        <button
                                                            onClick={clearFilters}
                                                            className="inline-flex items-center gap-2 text-[var(--brand-primary)] font-semibold hover:underline"
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
                                                    <GuardianEventCard key={event.id} event={event} darkMode={true} />
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

