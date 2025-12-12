'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X, Calendar, Clock, Users, Repeat } from 'lucide-react';
import api from '@/lib/api';
import { Event } from '@/types/event';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export default function SuperEventsPage() {
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
        // Ensure page parameter is always set in URL
        const currentPage = searchParams.get('page');
        if (!currentPage) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('page', '1');
            router.replace(`${pathname}?${params.toString()}`);
            return;
        }
        fetchEvents();
    }, [searchParams, pathname, router]);

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
            // Get filters from URL - only get valid parameters
            const search = searchParams.get('search') || '';
            const status = searchParams.get('status') || '';
            const recurringFilter = searchParams.get('recurring') || '';
            const page = searchParams.get('page') || '1';
            
            // Validate status parameter - only allow valid event statuses
            const validStatuses = ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'CANCELLED'];
            const validStatus = status && validStatuses.includes(status) ? status : '';
            
            // Fetch ALL events for client-side filtering and pagination
            // We need all events because we're doing client-side filtering for recurring
            let eventsData: Event[] = [];
            let pageNum = 1;
            const fetchPageSize = 100;
            const maxPages = 100;
            
            while (pageNum <= maxPages) {
                const params = new URLSearchParams();
                if (search && search.trim()) params.set('search', search.trim());
                if (validStatus) params.set('status', validStatus);
                params.set('page', pageNum.toString());
                params.set('page_size', fetchPageSize.toString());
                
                try {
                    const res: any = await api.get(`/events/?${params.toString()}`);
                    const responseData: any = res?.data;
                
                    if (!responseData) {
                        break;
                    }
                    
                    let pageEvents: Event[] = [];
                    
                    if (Array.isArray(responseData)) {
                        pageEvents = responseData;
                        eventsData = [...eventsData, ...pageEvents];
                        break;
                    } else if (responseData.results && Array.isArray(responseData.results)) {
                        pageEvents = responseData.results;
                        eventsData = [...eventsData, ...pageEvents];
                        
                        const hasNext = responseData.next !== null && responseData.next !== undefined;
                        const gotEmptyPage = pageEvents.length === 0;
                        
                        if (!hasNext || gotEmptyPage) {
                            break;
                        }
                        
                        pageNum++;
                    } else {
                        break;
                    }
                } catch (error: any) {
                    console.error(`Error fetching events page ${pageNum}:`, error);
                    if (error.response?.status === 400) {
                        console.error('Bad request parameters:', params.toString());
                        console.error('Error details:', error.response?.data);
                    }
                    // Break on error to prevent infinite loop
                    break;
                }
            }
            
            // Apply client-side filtering for recurring events
            if (recurringFilter === 'only') {
                // Show only recurring events with their instances
                // Group events by parent_event or is_recurring
                const parentEventIds = new Set<number>();
                eventsData.forEach((e: Event) => {
                    if (e.is_recurring && !e.parent_event) {
                        parentEventIds.add(e.id);
                    }
                });
                
                // Filter to show only parent events and their instances
                eventsData = eventsData.filter((e: Event) => {
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
                eventsData.forEach((e: Event) => {
                    if (e.is_recurring && !e.parent_event) {
                        parentEventIds.add(e.id);
                    }
                });
                
                // Filter out parent events and their instances
                eventsData = eventsData.filter((e: Event) => {
                    if (e.is_recurring && !e.parent_event) {
                        return false; // Exclude parent events
                    }
                    if (e.parent_event && parentEventIds.has(e.parent_event)) {
                        return false; // Exclude instances of recurring events
                    }
                    return true; // Include everything else
                });
            }
            
            // Apply pagination after filtering
            const pageSize = 10;
            const currentPageNum = Number(page) || 1;
            const startIndex = (currentPageNum - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedEvents = eventsData.slice(startIndex, endIndex);
            
            // If current page is empty and not page 1, redirect to last available page
            if (paginatedEvents.length === 0 && currentPageNum > 1 && eventsData.length > 0) {
                const lastPage = Math.ceil(eventsData.length / pageSize);
                if (lastPage > 0) {
                    // Update URL to last available page, preserving other filters
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('page', lastPage.toString());
                    router.replace(`${pathname}?${params.toString()}`);
                    // Don't set events here, let the useEffect trigger a re-fetch
                    return;
                }
            }
            
            // If no events and we're not on page 1, go to page 1
            if (paginatedEvents.length === 0 && currentPageNum > 1 && eventsData.length === 0) {
                const params = new URLSearchParams(searchParams.toString());
                params.set('page', '1');
                router.replace(`${pathname}?${params.toString()}`);
                return;
            }
            
            setEvents(paginatedEvents);
            // Set total count based on filtered results
            setTotalCount(eventsData.length);
        } catch (error: any) {
            console.error('Error fetching events:', error);
            if (error.response?.status === 400) {
                console.error('Bad request - check URL parameters:', searchParams.toString());
                console.error('Error details:', error.response?.data);
                // Try to fetch without problematic parameters
                try {
                    const params = new URLSearchParams();
                    params.set('page', '1');
                    params.set('page_size', '100');
                    const res: any = await api.get(`/events/?${params.toString()}`);
                    const responseData: any = res?.data;
                    if (responseData) {
                        const events = Array.isArray(responseData) ? responseData : (responseData.results || []);
                        setEvents(events.slice(0, 10));
                        setTotalCount(events.length);
                    }
                } catch (fallbackError) {
                    console.error('Fallback fetch also failed:', fallbackError);
                    setEvents([]);
                    setTotalCount(0);
                }
            } else {
                setEvents([]);
                setTotalCount(0);
            }
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
            
            // Refresh the events list (this will use current URL params including page)
            // fetchEvents() will automatically handle empty pages and redirect if needed
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
        <div className="p-8">
            <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Manage Events</h1>
                    <p className="text-gray-500 mt-1">Manage events and their information.</p>
                </div>
                <Link href="/admin/super/events/create">
                    <Button className="w-full sm:w-auto gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
                        <Plus className="h-4 w-4" /> Create Event
                    </Button>
                </Link>
            </div>

            {/* Analytics */}
            {!loading && (
                <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-gray-500" />
                            <h3 className="text-sm font-semibold text-gray-500">Analytics</h3>
                        </div>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-9 p-0 h-8">
                                <ChevronUp className={cn(
                                    "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                                    analyticsExpanded ? "rotate-0" : "rotate-180"
                                )} />
                                <span className="sr-only">Toggle Analytics</span>
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                            {/* Card 1: Total Events */}
                            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Total Events</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total_events}</div>
                                </CardContent>
                            </Card>

                            {/* Card 2: Upcoming Events */}
                            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Upcoming Events</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.upcoming_events}</div>
                                </CardContent>
                            </Card>

                            {/* Card 3: Total Members Who Attended */}
                            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Members Attended</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total_attended}</div>
                                </CardContent>
                            </Card>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            )}

            {/* Filters */}
            <Card className="border border-gray-100 shadow-sm bg-white">
                <div className="p-4 space-y-4">
                    {/* Main Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        {/* Search - Takes more space on larger screens */}
                        <div className="relative md:col-span-4 lg:col-span-3">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input 
                                placeholder="Search by title or location..." 
                                className="pl-9 bg-gray-50 border-0"
                                value={searchParams.get('search') || ''} 
                                onChange={e => updateUrl('search', e.target.value)}
                            />
                        </div>
                        
                        {/* Status Filter */}
                        <div className="md:col-span-2 lg:col-span-2">
                            <select 
                                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
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
                        <div className="md:col-span-2 lg:col-span-2">
                            <select 
                                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                                value={searchParams.get('recurring') || ''} 
                                onChange={e => updateUrl('recurring', e.target.value)}
                            >
                                <option value="">All Events</option>
                                <option value="only">Only Recurring</option>
                                <option value="exclude">Exclude Recurring</option>
                            </select>
                        </div>
                        
                        {/* Clear Button */}
                        <div className="md:col-span-2 lg:col-span-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.replace(`${pathname}?page=1`)}
                                className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
                            >
                                <X className="h-4 w-4" /> Clear
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Content */}
            {loading ? (
                <div className="py-20 flex justify-center text-gray-400">
                    <div className="animate-pulse">Loading events...</div>
                </div>
            ) : paginatedEvents.length === 0 ? (
                <Card className="border border-gray-100 shadow-sm">
                    <div className="py-20 text-center">
                        <p className="text-gray-500">
                            {searchParams.get('search') || searchParams.get('status') || searchParams.get('recurring')
                                ? 'No events found matching your filters.'
                                : 'No events found. Create your first one!'}
                        </p>
                    </div>
                </Card>
            ) : (
                <>
                    {/* MOBILE: Cards */}
                    <div className="grid grid-cols-1 gap-3 md:hidden">
                        {paginatedEvents.map(event => (
                            <Card key={event.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <Avatar className="h-10 w-10 rounded-lg border border-gray-200 bg-[#EBEBFE] flex-shrink-0">
                                            <AvatarFallback className="rounded-lg font-bold text-sm text-[#4D4DA4] bg-[#EBEBFE]">
                                                <Calendar className="h-5 w-5" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-base font-semibold text-[#121213] truncate">
                                                {event.title}
                                            </CardTitle>
                                            <CardDescription className="text-xs text-gray-500 truncate">
                                                {event.location_name}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-0">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-xs text-gray-500 uppercase font-semibold">Date</span>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-600">{new Date(event.start_date).toLocaleDateString()}</div>
                                                <div className="text-xs text-gray-500">{new Date(event.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-xs text-gray-500 uppercase font-semibold">Recurring</span>
                                            {event.is_recurring || event.parent_event ? (
                                                <div className="flex flex-wrap gap-1 justify-end">
                                                    {event.is_recurring && (
                                                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                                            <Repeat className="h-3 w-3 mr-1" />
                                                            {event.recurrence_pattern || 'Recurring'}
                                                        </Badge>
                                                    )}
                                                    {event.parent_event && (
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                                            Instance
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-xs text-gray-500 uppercase font-semibold">Status</span>
                                            <Badge variant="outline" className={`text-xs ${
                                                event.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 border-green-200' :
                                                event.status === 'DRAFT' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                event.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                event.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-gray-50 text-gray-700 border-gray-200'
                                            }`}>
                                                {event.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-xs text-gray-500 uppercase font-semibold">Registrations</span>
                                            {event.allow_registration ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-sm font-medium text-gray-600">{event.confirmed_participants_count}</span>
                                                    <span className="text-gray-400">/</span>
                                                    <span className="text-sm text-gray-500">{event.max_seats === 0 ? '∞' : event.max_seats}</span>
                                                    {event.waitlist_count > 0 && (
                                                        <Badge variant="outline" className="ml-2 bg-orange-50 text-orange-700 border-orange-200 text-xs">
                                                            +{event.waitlist_count} WL
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                        <Link href={buildUrlWithParams(`/admin/super/events/edit/${event.id}`)} className="flex-1">
                                            <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                                                <Edit className="h-4 w-4" />
                                                Edit
                                            </Button>
                                        </Link>
                                        <Link href={buildUrlWithParams(`/admin/super/events/${event.id}`)} className="flex-1">
                                            <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                                                <Eye className="h-4 w-4" />
                                                View
                                            </Button>
                                        </Link>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="flex-1 justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDeleteClick(event)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* DESKTOP: Table */}
                    <Card className="hidden md:block border border-gray-100 shadow-sm bg-white overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                                    <TableHead className="h-12 text-gray-600 font-semibold">Event</TableHead>
                                    <TableHead className="h-12 text-gray-600 font-semibold">Date</TableHead>
                                    <TableHead className="h-12 text-gray-600 font-semibold">Recurring</TableHead>
                                    <TableHead className="h-12 text-gray-600 font-semibold">Status</TableHead>
                                    <TableHead className="h-12 text-gray-600 font-semibold">Registrations</TableHead>
                                    <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedEvents.map(event => (
                                    <TableRow key={event.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 rounded-lg bg-[#EBEBFE] flex items-center justify-center flex-shrink-0">
                                                    <AvatarFallback className="rounded-lg font-bold text-sm text-[#4D4DA4] bg-[#EBEBFE]">
                                                        <Calendar className="h-5 w-5" />
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-semibold text-[#121213]">{event.title}</div>
                                                    <div className="text-xs text-gray-500 truncate max-w-xs">{event.location_name}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="text-sm text-gray-600">{new Date(event.start_date).toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(event.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            {event.is_recurring || event.parent_event ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {event.is_recurring && (
                                                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                                            <Repeat className="h-3 w-3 mr-1" />
                                                            {event.recurrence_pattern || 'Recurring'}
                                                        </Badge>
                                                    )}
                                                    {event.parent_event && (
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                                            Instance
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Badge variant="outline" className={`text-xs ${
                                                event.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 border-green-200' :
                                                event.status === 'DRAFT' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                event.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                event.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-gray-50 text-gray-700 border-gray-200'
                                            }`}>
                                                {event.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            {event.allow_registration ? (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-sm font-medium text-gray-600">{event.confirmed_participants_count}</span>
                                                    <span className="text-gray-400">/</span>
                                                    <span className="text-sm text-gray-500">{event.max_seats === 0 ? '∞' : event.max_seats}</span>
                                                    {event.waitlist_count > 0 && (
                                                        <Badge variant="outline" className="ml-2 bg-orange-50 text-orange-700 border-orange-200 text-xs">
                                                            +{event.waitlist_count} WL
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href={buildUrlWithParams(`/admin/super/events/edit/${event.id}`)}>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Link href={buildUrlWithParams(`/admin/super/events/${event.id}`)}>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => handleDeleteClick(event)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-4">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={currentPage === 1} 
                        onClick={() => updateUrl('page', (currentPage - 1).toString())}
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    >
                        Prev
                    </Button>
                    <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={currentPage >= totalPages} 
                        onClick={() => updateUrl('page', (currentPage + 1).toString())}
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    >
                        Next
                    </Button>
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
        </div>
    );
}
