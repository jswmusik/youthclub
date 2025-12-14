'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import EventCard from '@/app/components/events/youth/EventCard';
import NavBar from '@/app/components/NavBar';
import { Search, Calendar, MapPin, Building2, X, UserCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Event } from '@/types/event';

export default function YouthEventsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [filterMyClub, setFilterMyClub] = useState(false);
    const [filterMyMunicipality, setFilterMyMunicipality] = useState(false);
    const [filterMyEvents, setFilterMyEvents] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            // Fetch published events (backend filters by published status for youth users)
            // Deleted events are automatically excluded since they're removed from the database
            const res = await api.get('/events/');
            const all = res.data.results || res.data;
            setUpcomingEvents(all);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, fetchData]);

    // Refresh data when page becomes visible or window regains focus
    // This handles cases where events are deleted in another tab or window
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

    // Get user's municipality and club IDs
    const userMunicipalityId = user?.assigned_municipality 
        ? (typeof user.assigned_municipality === 'object' 
            ? user.assigned_municipality.id 
            : user.assigned_municipality)
        : null;
    
    const userClubId = user?.preferred_club?.id || null;

    // Apply all filters
    const filteredEvents = useMemo(() => {
        let filtered = [...upcomingEvents];

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
            to.setHours(23, 59, 59, 999); // Include the entire end date
            filtered = filtered.filter(e => new Date(e.start_date) <= to);
        }

        // My Club filter
        if (filterMyClub && userClubId) {
            filtered = filtered.filter((event: Event) => {
                const eventClubId = typeof event.club === 'object' 
                    ? event.club?.id 
                    : event.club;
                return eventClubId === userClubId;
            });
        }

        // My Municipality filter
        if (filterMyMunicipality && userMunicipalityId) {
            filtered = filtered.filter((event: Event) => {
                const eventMunicipalityId = typeof event.municipality === 'object' 
                    ? event.municipality.id 
                    : event.municipality;
                return eventMunicipalityId === userMunicipalityId;
            });
        }

        // Events I'm Attending filter
        if (filterMyEvents) {
            filtered = filtered.filter((event: any) => {
                // Check if user has a registration status (not null/undefined)
                const userStatus = event.user_registration_status;
                return userStatus && userStatus !== 'CANCELLED';
            });
        }

        return filtered;
    }, [upcomingEvents, search, fromDate, toDate, filterMyClub, filterMyMunicipality, filterMyEvents, userClubId, userMunicipalityId]);

    const clearFilters = () => {
        setSearch('');
        setFromDate('');
        setToDate('');
        setFilterMyClub(false);
        setFilterMyMunicipality(false);
        setFilterMyEvents(false);
    };

    const hasActiveFilters = search || fromDate || toDate || filterMyClub || filterMyMunicipality || filterMyEvents;

    return (
        <div className="min-h-screen bg-gray-100">
            <NavBar />
            <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left Sidebar - Filters & Navigation */}
                    <aside className="w-full md:w-64 flex-shrink-0 space-y-6 md:sticky md:top-[72px] md:self-start md:max-h-[calc(100vh-88px)] md:overflow-y-auto">
                        {/* Header */}
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-[#4D4DA4] mb-1">Dashboard</h1>
                            <p className="text-sm text-gray-600">Your space to explore</p>
                        </div>

                        {/* Filter Block */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Filter Events</label>
                            <div className="space-y-2">
                                {/* Search Filter */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input 
                                        type="text" 
                                        placeholder="Search events..." 
                                        className="w-full bg-white border border-gray-200 rounded-md py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>

                                {/* Date Range Filters */}
                                {fromDate || toDate ? (
                                    <div className="space-y-2">
                                        {fromDate && (
                                            <button
                                                onClick={() => setFromDate('')}
                                                className="w-full text-left px-3 py-2 rounded-md text-sm bg-green-50 text-green-700 font-medium border border-green-200 flex items-center justify-between"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                    From: {new Date(fromDate).toLocaleDateString()}
                                                </span>
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                        {toDate && (
                                            <button
                                                onClick={() => setToDate('')}
                                                className="w-full text-left px-3 py-2 rounded-md text-sm bg-green-50 text-green-700 font-medium border border-green-200 flex items-center justify-between"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                    To: {new Date(toDate).toLocaleDateString()}
                                                </span>
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">From Date</label>
                                            <input
                                                type="date"
                                                className="w-full bg-white border border-gray-200 rounded-md py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                value={fromDate}
                                                onChange={e => setFromDate(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">To Date</label>
                                            <input
                                                type="date"
                                                className="w-full bg-white border border-gray-200 rounded-md py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                value={toDate}
                                                onChange={e => setToDate(e.target.value)}
                                                min={fromDate || undefined}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Location Filters */}
                                {userClubId && (
                                    <button
                                        onClick={() => setFilterMyClub(!filterMyClub)}
                                        className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                                            filterMyClub
                                                ? 'bg-green-50 text-green-700 font-medium border border-green-200'
                                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                        }`}
                                    >
                                        <Building2 className="w-4 h-4" />
                                        My Club
                                    </button>
                                )}
                                {userMunicipalityId && (
                                    <button
                                        onClick={() => setFilterMyMunicipality(!filterMyMunicipality)}
                                        className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                                            filterMyMunicipality
                                                ? 'bg-green-50 text-green-700 font-medium border border-green-200'
                                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                        }`}
                                    >
                                        <MapPin className="w-4 h-4" />
                                        My Municipality
                                    </button>
                                )}

                                {/* Events I'm Attending Filter */}
                                <button
                                    onClick={() => setFilterMyEvents(!filterMyEvents)}
                                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                                        filterMyEvents
                                            ? 'bg-green-50 text-green-700 font-medium border border-green-200'
                                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                    }`}
                                >
                                    <UserCheck className="w-4 h-4" />
                                    Events I'm Attending
                                </button>

                                {/* Clear Filters */}
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearFilters}
                                        className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200"
                                    >
                                        Clear All Filters
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Navigation Menu */}
                        <div className="space-y-2">
                                {/* Your Feed */}
                                <button
                                    onClick={() => router.push('/dashboard/youth')}
                                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center gap-3 group"
                                >
                                    <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                                    </svg>
                                    <span>Your Feed</span>
                                </button>
                                
                                {/* Scan to Check In */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/scan')}
                                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center gap-3 group"
                                >
                                    <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 13h6v-6h-6v6zm1.5-1.5h3v3h-3v-3z"/>
                                    </svg>
                                    <span>Scan to Check In</span>
                                </button>
                                
                                {/* Borrow Items */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/inventory')}
                                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center gap-3 group"
                                >
                                    <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
                                    </svg>
                                    <span>Borrow Items</span>
                                </button>
                                
                                {/* Bookings */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/bookings')}
                                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center gap-3 group"
                                >
                                    <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
                                    </svg>
                                    <span>Bookings</span>
                                </button>
                                
                                {/* Questionnaires */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/questionnaires')}
                                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center gap-3 group"
                                >
                                    <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                                    </svg>
                                    <span>Questionnaires</span>
                                </button>
                                
                                {/* My Groups */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/profile?tab=clubs')}
                                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center gap-3 group"
                                >
                                    <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                                    </svg>
                                    <span>My Groups</span>
                                </button>
                                
                                {/* My Club */}
                                {user?.preferred_club?.id ? (
                                    <button
                                        onClick={() => router.push(`/dashboard/youth/club/${user.preferred_club.id}`)}
                                        className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center gap-3 group"
                                    >
                                        <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                        </svg>
                                        <span>My Club</span>
                                    </button>
                                ) : (
                                    <button
                                        disabled
                                        className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed flex items-center gap-3"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                        </svg>
                                        <span>My Club</span>
                                    </button>
                                )}
                                
                                {/* News */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/news')}
                                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center gap-3 group"
                                >
                                    <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                                    </svg>
                                    <span>News</span>
                                </button>
                                
                                {/* Events - Active */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/events')}
                                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 bg-[#4D4DA4] text-white shadow-sm hover:shadow-md hover:bg-[#5D5DB4] flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17 10H7v2h10v-2zm2-7h-3V1h-2v2H8V1H6v2H3c-1.11 0-1.99.9-1.99 2L1 19c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V8h16v11zm-5-9H7v2h7v-2z"/>
                                        </svg>
                                        <span>Events</span>
                                    </div>
                                    <span className="bg-[#FF5485] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                        6
                                    </span>
                                </button>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Discover Events</h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    {hasActiveFilters 
                                        ? `Found ${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''}`
                                        : 'Find exciting activities happening near you'}
                                </p>
                            </div>
                            <Link 
                                href="/dashboard/youth/events/my-tickets"
                                className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 shadow-sm transition-colors flex items-center gap-2"
                            >
                                <Calendar className="w-4 h-4" />
                                My Tickets
                            </Link>
                        </div>

                        {loading ? (
                            <div className="text-center py-10 text-gray-500">Loading events...</div>
                        ) : filteredEvents.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                                <div className="max-w-md mx-auto">
                                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500 mb-2 font-medium">No events found</p>
                                    <p className="text-sm text-gray-400 mb-4">
                                        {hasActiveFilters 
                                            ? 'Try adjusting your filters to see more events.' 
                                            : 'Check back later for new events!'}
                                    </p>
                                    {hasActiveFilters && (
                                        <button
                                            onClick={clearFilters}
                                            className="text-green-600 font-semibold hover:underline"
                                        >
                                            Clear all filters →
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredEvents.map(event => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

