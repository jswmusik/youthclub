'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import MemberEventCalendar from '@/app/components/events/youth/MemberEventCalendar';
import NavBar from '@/app/components/NavBar';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import { Search, Calendar, MapPin, Building2, X, UserCheck, Heart, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';


export default function YouthCalendarPage() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const t = useTranslations('events');
    const tSidebar = useTranslations('sidebar');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [filterMyClub, setFilterMyClub] = useState(false);
    const [filterMyMunicipality, setFilterMyMunicipality] = useState(false);
    const [filterMyEvents, setFilterMyEvents] = useState(false);
    const [selectedInterests, setSelectedInterests] = useState<number[]>([]);
    const [interestsList, setInterestsList] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('weekly');
    const [showFilters, setShowFilters] = useState(false);

    // Get user's municipality and club IDs
    const userMunicipalityId = user?.assigned_municipality 
        ? (typeof user.assigned_municipality === 'object' 
            ? user.assigned_municipality.id 
            : user.assigned_municipality)
        : null;
    
    const userClubId = user?.preferred_club?.id || null;
    const userInterests = user?.interests || [];

    const fetchData = async () => {
        setLoading(true);
        try {
            const [eventsRes, interestsRes] = await Promise.all([
                api.get('/events/'),
                api.get('/interests/')
            ]);
            const allEvents = eventsRes.data.results || eventsRes.data;
            setEvents(allEvents);
            const interests = Array.isArray(interestsRes.data) ? interestsRes.data : (interestsRes.data.results || []);
            setInterestsList(interests);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    // Apply all filters
    const filteredEvents = useMemo(() => {
        let filtered = [...events];

        // Search filter
        if (search) {
            filtered = filtered.filter(e => 
                e.title.toLowerCase().includes(search.toLowerCase()) || 
                e.location_name.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Date range filter
        if (fromDate) {
            const from = new Date(fromDate);
            filtered = filtered.filter(e => new Date(e.start_date) >= from);
        }
        if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            filtered = filtered.filter(e => new Date(e.start_date) <= to);
        }

        // My Club filter
        if (filterMyClub && userClubId) {
            filtered = filtered.filter((event: any) => {
                const eventClubId = typeof event.club === 'object' 
                    ? event.club?.id 
                    : event.club;
                return eventClubId === userClubId;
            });
        }

        // My Municipality filter
        if (filterMyMunicipality && userMunicipalityId) {
            filtered = filtered.filter((event: any) => {
                const eventMunicipalityId = typeof event.municipality === 'object' 
                    ? event.municipality.id 
                    : event.municipality;
                return eventMunicipalityId === userMunicipalityId;
            });
        }

        // Events I'm Attending filter
        if (filterMyEvents) {
            filtered = filtered.filter((event: any) => {
                const userStatus = event.user_registration_status;
                return userStatus && userStatus !== 'CANCELLED';
            });
        }

        // Interest filter
        if (selectedInterests.length > 0) {
            filtered = filtered.filter((event: any) => {
                const eventInterests = event.target_interests || [];
                return selectedInterests.some(interestId => eventInterests.includes(interestId));
            });
        }

        return filtered;
    }, [events, search, fromDate, toDate, filterMyClub, filterMyMunicipality, filterMyEvents, selectedInterests, userClubId, userMunicipalityId]);

    const clearFilters = () => {
        setSearch('');
        setFromDate('');
        setToDate('');
        setFilterMyClub(false);
        setFilterMyMunicipality(false);
        setFilterMyEvents(false);
        setSelectedInterests([]);
    };

    const hasActiveFilters = search || fromDate || toDate || filterMyClub || filterMyMunicipality || filterMyEvents || selectedInterests.length > 0;

    const toggleInterest = (interestId: number) => {
        setSelectedInterests(prev => 
            prev.includes(interestId) 
                ? prev.filter(id => id !== interestId)
                : [...prev, interestId]
        );
    };

    return (
        <div className="min-h-screen bg-[var(--dark-900)]">
            <NavBar 
                onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                showBackButton={true}
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
                    <YouthSidebar activePath={pathname} darkMode={true} />
                </div>
            </aside>
            
            {/* Main Layout */}
            <div className="pt-14 sm:pt-16">
                <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 relative">
                    {/* Desktop Sidebar - Fixed position aligned with container */}
                    <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
                        <YouthSidebar activePath={pathname} darkMode={true} />
                    </aside>
                    
                    {/* Content wrapper with left margin for sidebar */}
                    <div className="md:ml-60">
                        {/* Main Content */}
                        <main className="flex-1 min-w-0 p-0 sm:p-4 md:p-6 pb-24 md:pb-6">
                            {/* Header Section */}
                            <div className="px-4 sm:px-0 mb-4 sm:mb-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <CalendarDays className="w-7 h-7 text-[var(--brand-primary)]" />
                                            <h1 className="text-3xl md:text-4xl text-[var(--brand-light)] font-heading font-bold">
                                                {t('eventCalendar')}
                                            </h1>
                                        </div>
                                        <p className="text-[var(--brand-light)]/60 text-sm pl-10">
                                            {hasActiveFilters 
                                                ? `${filteredEvents.length} ${filteredEvents.length !== 1 ? t('eventsFoundPlural') : t('eventsFound')} ${t('found')}`
                                                : t('findEventsByDate')}
                                        </p>
                                    </div>
                                    <Link 
                                        href="/dashboard/youth/events" 
                                        className="inline-flex items-center gap-2 bg-[var(--brand-primary)] text-[var(--dark-900)] px-4 py-2.5 rounded-xl font-semibold hover:bg-[var(--brand-primary)]/90 transition-all text-sm"
                                    >
                                        {t('viewList')}
                                    </Link>
                                </div>

                                {/* Filters Section */}
                                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-3 sm:p-4">
                                    {/* Search Bar */}
                                    <div className="relative mb-3">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/40 w-5 h-5" />
                                        <input 
                                            type="text" 
                                            placeholder={t('searchEventsPlaceholder')}
                                            className="w-full bg-[var(--dark-700)] border border-[var(--dark-600)] rounded-xl py-3 pl-12 pr-4 text-sm text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] transition-all"
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
                                        {/* Date Filter Toggle */}
                                        <button
                                            onClick={() => setShowFilters(!showFilters)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                (fromDate || toDate) 
                                                    ? 'bg-[var(--brand-purple)] text-[var(--brand-light)]' 
                                                    : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)]'
                                            }`}
                                        >
                                            <Calendar className="w-3.5 h-3.5" />
                                            {t('date')}
                                            {(fromDate || toDate) && <span className="ml-0.5">•</span>}
                                        </button>

                                        {userClubId && (
                                            <button
                                                onClick={() => setFilterMyClub(!filterMyClub)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                    filterMyClub
                                                        ? 'bg-[var(--brand-purple)] text-[var(--brand-light)]'
                                                        : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)]'
                                                }`}
                                            >
                                                <Building2 className="w-3.5 h-3.5" />
                                                {t('myClub')}
                                            </button>
                                        )}

                                        {userMunicipalityId && (
                                            <button
                                                onClick={() => setFilterMyMunicipality(!filterMyMunicipality)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                    filterMyMunicipality
                                                        ? 'bg-[var(--brand-purple)] text-[var(--brand-light)]'
                                                        : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)]'
                                                }`}
                                            >
                                                <MapPin className="w-3.5 h-3.5" />
                                                {t('myArea')}
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setFilterMyEvents(!filterMyEvents)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                filterMyEvents
                                                    ? 'bg-[var(--brand-third)] text-[var(--dark-900)]'
                                                    : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)]'
                                            }`}
                                        >
                                            <UserCheck className="w-3.5 h-3.5" />
                                            {t('attending')}
                                        </button>

                                        {/* Interests Filter Chips */}
                                        {interestsList
                                            .filter(interest => userInterests.includes(interest.id))
                                            .map(interest => (
                                                <button
                                                    key={interest.id}
                                                    onClick={() => toggleInterest(interest.id)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                        selectedInterests.includes(interest.id)
                                                            ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                                                            : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 hover:bg-[var(--dark-600)]'
                                                    }`}
                                                >
                                                    <Heart className={`w-3.5 h-3.5 ${selectedInterests.includes(interest.id) ? 'fill-current' : ''}`} />
                                                    {interest.name}
                                                </button>
                                            ))}

                                        {hasActiveFilters && (
                                            <button
                                                onClick={clearFilters}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all ml-auto"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                {t('clear')} ({[search, fromDate, toDate, filterMyClub, filterMyMunicipality, filterMyEvents, ...selectedInterests].filter(Boolean).length})
                                            </button>
                                        )}
                                    </div>

                                    {/* Date Range Picker (Expandable) */}
                                    {showFilters && (
                                        <div className="mt-3 pt-3 border-t border-[var(--dark-600)] flex flex-col sm:flex-row gap-3 sm:gap-3">
                                            <div className="flex-1 min-w-0 sm:min-w-[140px]">
                                                <label className="block text-xs text-[var(--brand-light)]/50 mb-1">{t('from')}</label>
                                                <input
                                                    type="date"
                                                    className="w-full bg-[var(--dark-700)] border border-[var(--dark-600)] rounded-lg py-2 px-3 text-sm text-[var(--brand-light)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
                                                    value={fromDate}
                                                    onChange={e => setFromDate(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0 sm:min-w-[140px]">
                                                <label className="block text-xs text-[var(--brand-light)]/50 mb-1">{t('to')}</label>
                                                <input
                                                    type="date"
                                                    className="w-full bg-[var(--dark-700)] border border-[var(--dark-600)] rounded-lg py-2 px-3 text-sm text-[var(--brand-light)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
                                                    value={toDate}
                                                    onChange={e => setToDate(e.target.value)}
                                                    min={fromDate || undefined}
                                                />
                                            </div>
                                            {(fromDate || toDate) && (
                                                <button
                                                    onClick={() => { setFromDate(''); setToDate(''); }}
                                                    className="self-start sm:self-end px-3 py-2 text-xs text-[var(--brand-light)]/50 hover:text-[var(--brand-red)] whitespace-nowrap"
                                                >
                                                    {t('clearDates')}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            
                            {/* Calendar Component */}
                            <MemberEventCalendar 
                                events={filteredEvents} 
                                loading={loading} 
                                onEventUpdate={fetchData}
                                viewMode={viewMode}
                                onViewModeChange={setViewMode}
                                darkMode={true}
                            />
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
}
