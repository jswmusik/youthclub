'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MemberEventCalendar from '@/app/components/events/youth/MemberEventCalendar';
import NavBar from '@/app/components/NavBar';
import { Search, Calendar, MapPin, Building2, X, UserCheck, Heart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function YouthCalendarPage() {
    const router = useRouter();
    const { user } = useAuth();
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
        <div className="min-h-screen bg-gray-100">
            <NavBar />
            <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left Sidebar - Filters & Navigation */}
                    <aside className="w-full md:w-64 flex-shrink-0 space-y-8 md:sticky md:top-[72px] md:self-start md:max-h-[calc(100vh-88px)] md:overflow-y-auto">
                        {/* Header */}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                            <p className="text-sm text-gray-500 mt-1">Your Activity & Navigation</p>
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

                                {/* Interests Filter */}
                                {interestsList.length > 0 && (
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-2">My Interests</label>
                                        <div className="space-y-1 max-h-48 overflow-y-auto">
                                            {interestsList
                                                .filter(interest => userInterests.includes(interest.id))
                                                .map(interest => (
                                                    <button
                                                        key={interest.id}
                                                        onClick={() => toggleInterest(interest.id)}
                                                        className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center gap-2 ${
                                                            selectedInterests.includes(interest.id)
                                                                ? 'bg-green-50 text-green-700 font-medium border border-green-200'
                                                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                                        }`}
                                                    >
                                                        <Heart className={`w-3 h-3 ${selectedInterests.includes(interest.id) ? 'fill-current' : ''}`} />
                                                        {interest.name}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}

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
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Navigation</label>
                            <div className="space-y-1">
                                {/* Your Feed */}
                                <button
                                    onClick={() => router.push('/dashboard/youth')}
                                    className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50"
                                >
                                    Your Feed
                                </button>
                                
                                {/* Scan to Check In */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/scan')}
                                    className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h-4v-4H8m13-9v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2M5 3v2m0 12v2m0-6v2m14-8v2m0 6v2m-4-6h2m-6 0h2" />
                                    </svg>
                                    Scan to Check In
                                </button>

                                {/* Visit History */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/visits')}
                                    className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50"
                                >
                                    Visit History
                                </button>
                                
                                {/* Borrow Items */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/inventory')}
                                    className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                    Borrow Items
                                </button>
                                
                                {/* Bookings */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/bookings')}
                                    className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <Calendar className="w-4 h-4" />
                                    Bookings
                                </button>
                                
                                {/* Questionnaires */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/questionnaires')}
                                    className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50 flex items-center justify-between group"
                                >
                                    <span className="group-hover:text-blue-600">Questionnaires</span>
                                </button>
                                
                                {/* Groups */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/groups')}
                                    className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50 flex items-center justify-between group"
                                >
                                    <span className="group-hover:text-blue-600">Groups</span>
                                    {(() => {
                                        const memberships = (user as any)?.my_memberships || [];
                                        const approvedCount = memberships.filter((m: any) => m.status === 'APPROVED').length;
                                        return approvedCount > 0 ? (
                                            <span className="bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                                {approvedCount}
                                            </span>
                                        ) : null;
                                    })()}
                                </button>
                                
                                {/* My Groups */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/profile?tab=clubs')}
                                    className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50"
                                >
                                    My Groups
                                </button>
                                
                                {/* My Guardians */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/profile?tab=guardians')}
                                    className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50"
                                >
                                    My Guardians
                                </button>
                                
                                {/* My Club */}
                                {user?.preferred_club?.id ? (
                                    <button
                                        onClick={() => router.push(`/dashboard/youth/club/${user.preferred_club.id}`)}
                                        className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50"
                                    >
                                        My Club
                                    </button>
                                ) : (
                                    <button
                                        disabled
                                        className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-400 cursor-not-allowed"
                                    >
                                        My Club
                                    </button>
                                )}
                                
                                {/* News */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/news')}
                                    className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50"
                                >
                                    News
                                </button>
                                
                                {/* Events */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/events')}
                                    className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50 flex items-center justify-between"
                                >
                                    <span>Events</span>
                                </button>
                                
                                {/* Event Calendar - Active */}
                                <button
                                    onClick={() => router.push('/dashboard/youth/events/calendar')}
                                    className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors bg-green-50 text-green-700 font-medium flex items-center gap-2"
                                >
                                    <Calendar className="w-4 h-4" />
                                    Event Calendar
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Event Calendar</h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    {hasActiveFilters 
                                        ? `Showing ${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''}`
                                        : 'Find events by date'}
                                </p>
                            </div>
                            <Link 
                                href="/dashboard/youth/events" 
                                className="text-sm text-blue-600 font-bold hover:underline"
                            >
                                View List
                            </Link>
                        </div>
                        
                        <MemberEventCalendar 
                            events={filteredEvents} 
                            loading={loading} 
                            onEventUpdate={fetchData}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                        />
                    </main>
                </div>
            </div>
        </div>
    );
}

