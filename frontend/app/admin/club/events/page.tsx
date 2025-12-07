'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Event } from '@/types/event';
import ConfirmationModal from '@/app/components/ConfirmationModal';

export default function ClubEventsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [events, setEvents] = useState<Event[]>([]);
    const [allEventsForAnalytics, setAllEventsForAnalytics] = useState<Event[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const [attendedCount, setAttendedCount] = useState(0);
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
    const [deleteMode, setDeleteMode] = useState<'single' | 'future' | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchAllEventsForAnalytics();
        fetchAttendedCount();
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [searchParams]);

    const fetchAllEventsForAnalytics = async () => {
        try {
            // Fetch all events for analytics calculation
            let allEvents: Event[] = [];
            let page = 1;
            let totalCount = 0;
            const pageSize = 100;
            const maxPages = 100;
            
            while (page <= maxPages) {
                const params = new URLSearchParams();
                params.set('page', page.toString());
                params.set('page_size', pageSize.toString());
                
                const res: any = await api.get(`/events/?${params.toString()}`);
                const responseData: any = res?.data;
                
                if (!responseData) {
                    break;
                }
                
                let pageEvents: Event[] = [];
                
                if (Array.isArray(responseData)) {
                    pageEvents = responseData;
                    allEvents = [...allEvents, ...pageEvents];
                    break;
                } else if (responseData.results && Array.isArray(responseData.results)) {
                    pageEvents = responseData.results;
                    allEvents = [...allEvents, ...pageEvents];
                    
                    if (page === 1) {
                        totalCount = responseData.count || 0;
                    }
                    
                    const hasNext = responseData.next !== null && responseData.next !== undefined;
                    const hasAllResults = totalCount > 0 && allEvents.length >= totalCount;
                    const gotEmptyPage = pageEvents.length === 0;
                    
                    if (!hasNext || hasAllResults || gotEmptyPage) {
                        break;
                    }
                    
                    page++;
                } else {
                    break;
                }
            }
            
            setAllEventsForAnalytics(allEvents);
        } catch (err) {
            console.error('Error fetching events for analytics:', err);
            setAllEventsForAnalytics([]);
        }
    };

    const fetchAttendedCount = async () => {
        try {
            // Fetch all registrations with ATTENDED status
            let allRegistrations: any[] = [];
            let page = 1;
            const pageSize = 100;
            const maxPages = 100;
            
            while (page <= maxPages) {
                const params = new URLSearchParams();
                params.set('status', 'ATTENDED');
                params.set('page', page.toString());
                params.set('page_size', pageSize.toString());
                
                const res: any = await api.get(`/registrations/?${params.toString()}`);
                const responseData: any = res?.data;
                
                if (!responseData) {
                    break;
                }
                
                let pageRegistrations: any[] = [];
                
                if (Array.isArray(responseData)) {
                    pageRegistrations = responseData;
                    allRegistrations = [...allRegistrations, ...pageRegistrations];
                    break;
                } else if (responseData.results && Array.isArray(responseData.results)) {
                    pageRegistrations = responseData.results;
                    allRegistrations = [...allRegistrations, ...pageRegistrations];
                    
                    const hasNext = responseData.next !== null && responseData.next !== undefined;
                    const gotEmptyPage = pageRegistrations.length === 0;
                    
                    if (!hasNext || gotEmptyPage) {
                        break;
                    }
                    
                    page++;
                } else {
                    break;
                }
            }
            
            // Count unique users who attended
            const uniqueUsers = new Set(allRegistrations.map((r: any) => r.user));
            setAttendedCount(uniqueUsers.size);
        } catch (err) {
            console.error('Error fetching attended count:', err);
            setAttendedCount(0);
        }
    };

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            
            // Get filters from URL
            const search = searchParams.get('search') || '';
            const status = searchParams.get('status') || '';
            const recurringFilter = searchParams.get('recurring') || '';
            const page = searchParams.get('page') || '1';
            
            if (search) params.set('search', search);
            if (status) params.set('status', status);
            
            // When recurring filter is active, we need to fetch all events for client-side filtering
            // Otherwise, use proper server-side pagination
            if (recurringFilter) {
                // Fetch all events for client-side filtering and pagination
                params.set('page', '1');
                params.set('page_size', '1000'); // Fetch a large number to get all events
            } else {
                // Use server-side pagination
                params.set('page', page);
                params.set('page_size', '10');
            }

            const res = await api.get(`/events/?${params.toString()}`);
            let allEventsData = Array.isArray(res.data) ? res.data : res.data.results || [];
            
            // Get total count from API response (before client-side filtering)
            const apiCount = Array.isArray(res.data) ? allEventsData.length : (res.data.count || allEventsData.length);
            
            // Apply client-side filtering for recurring events
            if (recurringFilter === 'only') {
                // Show only recurring events with their instances
                // Group events by parent_event or is_recurring
                const parentEventIds = new Set<number>();
                allEventsData.forEach((e: Event) => {
                    if (e.is_recurring && !e.parent_event) {
                        parentEventIds.add(e.id);
                    }
                });
                
                // Filter to show only parent events and their instances
                allEventsData = allEventsData.filter((e: Event) => {
                    if (e.is_recurring && !e.parent_event) {
                        return true; // Include parent events
                    }
                    if (e.parent_event && parentEventIds.has(e.parent_event)) {
                        return true; // Include instances of parent events we're showing
                    }
                    return false;
                });
            } else if (recurringFilter === 'exclude') {
                // Exclude recurring events and their instances
                const parentEventIds = new Set<number>();
                allEventsData.forEach((e: Event) => {
                    if (e.is_recurring && !e.parent_event) {
                        parentEventIds.add(e.id);
                    }
                });
                
                // Filter out parent events and their instances
                allEventsData = allEventsData.filter((e: Event) => {
                    if (e.is_recurring && !e.parent_event) {
                        return false; // Exclude parent events
                    }
                    if (e.parent_event && parentEventIds.has(e.parent_event)) {
                        return false; // Exclude instances of recurring events
                    }
                    return true; // Include everything else
                });
            }
            
            // Apply client-side pagination when recurring filter is active
            if (recurringFilter) {
                const pageSize = 10;
                const startIndex = (Number(page) - 1) * pageSize;
                const endIndex = startIndex + pageSize;
                const paginatedEvents = allEventsData.slice(startIndex, endIndex);
                setEvents(paginatedEvents);
                // Use filtered count for total (all filtered events, not just current page)
                setTotalCount(allEventsData.length);
            } else {
                // Use API count for server-side pagination
                setEvents(allEventsData);
                setTotalCount(apiCount);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const updateUrl = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        // Reset to page 1 when filters change (but not when changing page itself)
        if (key !== 'page') {
            params.set('page', '1');
        }
        // Use push to allow browser back button to work properly
        router.push(`${pathname}?${params.toString()}`);
    };

    const buildUrlWithParams = (path: string) => {
        const params = new URLSearchParams();
        // Always preserve all current URL params including page
        const page = searchParams.get('page') || '1';
        const search = searchParams.get('search');
        const status = searchParams.get('status');
        const recurring = searchParams.get('recurring');
        
        // Always include page to preserve pagination state
        params.set('page', page);
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        if (recurring) params.set('recurring', recurring);
        
        const queryString = params.toString();
        return `${path}?${queryString}`;
    };

    const handleDeleteClick = (event: Event) => {
        setEventToDelete(event);
        setDeleteMode(null);
    };

    const handleDeleteConfirm = async () => {
        if (!eventToDelete) return;
        
        // For recurring instances, deleteMode must be set
        if (eventToDelete.parent_event && !deleteMode) return;

        setDeleting(true);
        try {
            if (deleteMode === 'future' && eventToDelete.parent_event) {
                // Delete this instance and all future instances
                await api.delete(`/events/${eventToDelete.id}/?delete_future=true`);
            } else {
                // Delete only this instance (or parent event which deletes all instances)
                await api.delete(`/events/${eventToDelete.id}/`);
            }
            
            // Refresh the events list
            await fetchEvents();
            await fetchAllEventsForAnalytics();
            
            setEventToDelete(null);
            setDeleteMode(null);
        } catch (error: any) {
            console.error('Error deleting event:', error);
            alert(error.response?.data?.error || 'Failed to delete event');
        } finally {
            setDeleting(false);
        }
    };

    // Calculate analytics from allEventsForAnalytics
    const now = new Date();
    const analytics = {
        total_events: allEventsForAnalytics.length,
        upcoming_events: allEventsForAnalytics.filter((e: Event) => {
            const startDate = new Date(e.start_date);
            return startDate > now;
        }).length,
        total_attended: attendedCount,
    };

    // Pagination logic
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    const totalPages = Math.ceil(totalCount / pageSize);
    const paginatedEvents = events;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Manage Events</h1>
                <Link href="/admin/club/events/create" className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 shadow">
                    + Create Event
                </Link>
            </div>

            {/* Analytics Dashboard */}
            {!loading && (
                <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {/* Toggle Button */}
                    <button
                        onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
                        className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-700">Analytics Dashboard</span>
                        </div>
                        <svg 
                            className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${analyticsExpanded ? 'rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Analytics Cards - Collapsible */}
                    <div 
                        className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${
                            analyticsExpanded 
                                ? 'max-h-[500px] opacity-100' 
                                : 'max-h-0 opacity-0'
                        } overflow-hidden`}
                    >
                        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Card 1: Total Events */}
                            <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Events</h3>
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{analytics.total_events}</p>
                            </div>

                            {/* Card 2: Upcoming Events */}
                            <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Upcoming Events</h3>
                                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{analytics.upcoming_events}</p>
                            </div>

                            {/* Card 3: Total Members Who Attended */}
                            <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-purple-300 hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Members Attended</h3>
                                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{analytics.total_attended}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FILTERS */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Toggle Button */}
                <button
                    onClick={() => setFiltersExpanded(!filtersExpanded)}
                    className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-700">Filters</span>
                    </div>
                    <svg 
                        className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {/* Filter Fields - Collapsible */}
                <div 
                    className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${
                        filtersExpanded 
                            ? 'max-h-[1000px] opacity-100' 
                            : 'max-h-0 opacity-0'
                    } overflow-hidden`}
                >
                    <div className="p-4">
                        <div className="flex flex-wrap gap-4 items-end">
                            {/* Search */}
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
                                <input 
                                    type="text" 
                                    placeholder="Search by title or location..." 
                                    className="w-full border rounded p-2 text-sm bg-gray-50"
                                    value={searchParams.get('search') || ''} 
                                    onChange={e => updateUrl('search', e.target.value)}
                                />
                            </div>

                            {/* Status */}
                            <div className="w-40">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                                <select 
                                    className="w-full border rounded p-2 text-sm bg-gray-50" 
                                    value={searchParams.get('status') || ''} 
                                    onChange={e => updateUrl('status', e.target.value)}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="DRAFT">Draft</option>
                                    <option value="SCHEDULED">Scheduled</option>
                                    <option value="PUBLISHED">Published</option>
                                    <option value="CANCELLED">Cancelled</option>
                                    <option value="ARCHIVED">Archived</option>
                                </select>
                            </div>

                            {/* Recurring Events Filter */}
                            <div className="w-48">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Recurring Events</label>
                                <select 
                                    className="w-full border rounded p-2 text-sm bg-gray-50" 
                                    value={searchParams.get('recurring') || ''} 
                                    onChange={e => updateUrl('recurring', e.target.value)}
                                >
                                    <option value="">All Events</option>
                                    <option value="only">Only Recurring (with instances)</option>
                                    <option value="exclude">Exclude Recurring</option>
                                </select>
                            </div>

                            {/* Clear Filters */}
                            <button
                                onClick={() => {
                                    // Clear all filters but preserve page number if user wants to stay on current page
                                    // Or reset to page 1 - let's reset to page 1 for consistency
                                    router.replace(`${pathname}?page=1`);
                                }}
                                className="px-4 py-2 text-sm text-gray-500 hover:text-red-500 font-medium"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* LIST */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? <div className="p-8 text-center">Loading...</div> : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Event</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Recurring</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Registrations</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {paginatedEvents.map(event => (
                                <tr key={event.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{event.title}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-xs">{event.location_name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            {new Date(event.start_date).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(event.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {event.is_recurring || event.parent_event ? (
                                            <div className="flex flex-col gap-1">
                                                {event.is_recurring && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        {event.recurrence_pattern || 'Recurring'}
                                                    </span>
                                                )}
                                                {event.parent_event && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                        </svg>
                                                        Instance
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            event.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 
                                            event.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : 
                                            event.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                                            event.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {event.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {event.allow_registration ? (
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium">{event.confirmed_participants_count}</span>
                                                <span className="text-gray-400">/</span>
                                                <span className="text-gray-500">{event.max_seats === 0 ? '∞' : event.max_seats}</span>
                                                {event.waitlist_count > 0 && (
                                                    <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1 rounded">
                                                        +{event.waitlist_count} WL
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link 
                                                href={buildUrlWithParams(`/admin/club/events/edit/${event.id}`)} 
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-900 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Edit
                                            </Link>
                                            <Link 
                                                href={buildUrlWithParams(`/admin/club/events/${event.id}`)} 
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-900 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Manage
                                            </Link>
                                            <button
                                                onClick={() => handleDeleteClick(event)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-md hover:bg-red-100 hover:text-red-900 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {paginatedEvents.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No events found. Click "Create Event" to get started.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => updateUrl('page', (currentPage - 1).toString())}
                            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button 
                            disabled={currentPage >= totalPages}
                            onClick={() => updateUrl('page', (currentPage + 1).toString())}
                            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                                {' '}(Total: {totalCount})
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => updateUrl('page', (currentPage - 1).toString())}
                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <span className="sr-only">Previous</span>
                                    ← Prev
                                </button>
                                
                                {/* Simple Pagination Numbers */}
                                {[...Array(totalPages)].map((_, i) => {
                                    const p = i + 1;
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => updateUrl('page', p.toString())}
                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold 
                                                ${p === currentPage 
                                                    ? 'bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' 
                                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}

                                <button
                                    disabled={currentPage >= totalPages}
                                    onClick={() => updateUrl('page', (currentPage + 1).toString())}
                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <span className="sr-only">Next</span>
                                    Next →
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {eventToDelete && (
                <>
                    {eventToDelete.parent_event || eventToDelete.is_recurring ? (
                        // Recurring event modal - show options
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                                <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full bg-red-100">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 text-center mb-3">
                                    Delete Recurring Event
                                </h2>
                                <p className="text-gray-600 text-center mb-6">
                                    {eventToDelete.parent_event 
                                        ? `"${eventToDelete.title}" is part of a recurring series. How would you like to proceed?`
                                        : `"${eventToDelete.title}" is a recurring event. How would you like to proceed?`
                                    }
                                </p>
                                
                                {eventToDelete.parent_event && (
                                    <div className="space-y-3 mb-6">
                                        <button
                                            onClick={() => setDeleteMode('single')}
                                            className={`w-full px-4 py-3 text-left rounded-lg border-2 transition-colors ${
                                                deleteMode === 'single'
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="font-semibold text-gray-900">Delete only this instance</div>
                                            <div className="text-sm text-gray-600 mt-1">Only this event will be deleted. Past and future instances will remain.</div>
                                        </button>
                                        <button
                                            onClick={() => setDeleteMode('future')}
                                            className={`w-full px-4 py-3 text-left rounded-lg border-2 transition-colors ${
                                                deleteMode === 'future'
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="font-semibold text-gray-900">Delete this and all future instances</div>
                                            <div className="text-sm text-gray-600 mt-1">This event and all future events in the series will be deleted. Past instances will remain.</div>
                                        </button>
                                    </div>
                                )}

                                {!eventToDelete.parent_event && eventToDelete.is_recurring && (
                                    <p className="text-sm text-gray-600 text-center mb-6">
                                        Deleting the parent event will delete all instances in the series.
                                    </p>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setEventToDelete(null);
                                            setDeleteMode(null);
                                        }}
                                        disabled={deleting}
                                        className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteConfirm}
                                        disabled={deleting || (eventToDelete.parent_event && !deleteMode)}
                                        className="flex-1 px-4 py-2.5 text-white bg-red-600 rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {deleting ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Deleting...
                                            </>
                                        ) : (
                                            'Delete'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Regular event modal
                        <ConfirmationModal
                            isVisible={!!eventToDelete}
                            onClose={() => {
                                if (!deleting) {
                                    setEventToDelete(null);
                                    setDeleteMode(null);
                                }
                            }}
                            onConfirm={() => {
                                setDeleteMode('single');
                                handleDeleteConfirm();
                            }}
                            title="Confirm Deletion"
                            message={eventToDelete ? `Are you sure you want to delete "${eventToDelete.title}"? This action cannot be undone.` : ''}
                            confirmButtonText="Delete"
                            cancelButtonText="Cancel"
                            isLoading={deleting}
                            variant="danger"
                        />
                    )}
                </>
            )}
        </div>
    );
}

