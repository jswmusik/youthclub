'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Event } from '@/types/event';
import { format } from 'date-fns';
import { Calendar, MapPin, Users, ArrowLeft, Clock, CheckCircle } from 'lucide-react';
import { getMediaUrl } from '@/app/utils';

interface EventRegistration {
    id: number;
    event: number;
    event_detail?: Event;
    status: string;
    created_at: string;
    updated_at: string;
}

type ViewMode = 'all' | 'history' | 'upcoming';

export default function AttendedEventsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const userId = params.id as string;
    
    const [attendedRegistrations, setAttendedRegistrations] = useState<EventRegistration[]>([]);
    const [upcomingRegistrations, setUpcomingRegistrations] = useState<EventRegistration[]>([]);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get('view') as ViewMode) || 'all');

    useEffect(() => {
        fetchData();
    }, [userId]);

    useEffect(() => {
        // Sync viewMode with URL params
        const viewParam = searchParams.get('view') as ViewMode;
        if (viewParam && ['all', 'history', 'upcoming'].includes(viewParam)) {
            setViewMode(viewParam);
        } else {
            setViewMode('all');
        }
    }, [searchParams]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch user details
            const userRes = await api.get(`/users/${userId}/`);
            setUser(userRes.data);

            // Fetch attended event registrations for this user
            const attendedParams = new URLSearchParams();
            attendedParams.set('user', userId);
            attendedParams.set('status', 'ATTENDED');
            attendedParams.set('ordering', '-event__start_date'); // Most recent first
            
            const attendedRes = await api.get(`/registrations/?${attendedParams.toString()}`);
            const attendedData = Array.isArray(attendedRes.data) ? attendedRes.data : (attendedRes.data.results || []);
            
            // Fetch upcoming event registrations (APPROVED status for future events)
            const upcomingParams = new URLSearchParams();
            upcomingParams.set('user', userId);
            upcomingParams.set('status', 'APPROVED');
            upcomingParams.set('ordering', 'event__start_date'); // Soonest first
            
            const upcomingRes = await api.get(`/registrations/?${upcomingParams.toString()}`);
            const upcomingData = Array.isArray(upcomingRes.data) ? upcomingRes.data : (upcomingRes.data.results || []);
            
            // Fetch full event details for attended registrations
            const attendedWithEvents = await Promise.all(
                attendedData.map(async (reg: EventRegistration) => {
                    try {
                        const eventRes = await api.get(`/events/${reg.event}/`);
                        const event = eventRes.data;
                        // Only include if event has ended
                        const eventEndDate = new Date(event.end_date);
                        if (eventEndDate < new Date()) {
                            return {
                                ...reg,
                                event_detail: event
                            };
                        }
                        return null;
                    } catch (err) {
                        console.error(`Error fetching event ${reg.event}:`, err);
                        return null;
                    }
                })
            );
            
            // Fetch full event details for upcoming registrations
            const upcomingWithEvents = await Promise.all(
                upcomingData.map(async (reg: EventRegistration) => {
                    try {
                        const eventRes = await api.get(`/events/${reg.event}/`);
                        const event = eventRes.data;
                        // Only include if event hasn't started yet
                        const eventStartDate = new Date(event.start_date);
                        if (eventStartDate > new Date()) {
                            return {
                                ...reg,
                                event_detail: event
                            };
                        }
                        return null;
                    } catch (err) {
                        console.error(`Error fetching event ${reg.event}:`, err);
                        return null;
                    }
                })
            );
            
            setAttendedRegistrations(attendedWithEvents.filter(Boolean) as EventRegistration[]);
            setUpcomingRegistrations(upcomingWithEvents.filter(Boolean) as EventRegistration[]);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode);
        // Update URL without page reload
        const params = new URLSearchParams(searchParams.toString());
        if (mode === 'all') {
            params.delete('view');
        } else {
            params.set('view', mode);
        }
        router.replace(`/admin/club/youth/${userId}/attended-events?${params.toString()}`);
    };

    // Filter registrations based on view mode
    const getDisplayedRegistrations = () => {
        switch (viewMode) {
            case 'history':
                return attendedRegistrations;
            case 'upcoming':
                return upcomingRegistrations;
            case 'all':
            default:
                return [...upcomingRegistrations, ...attendedRegistrations].sort((a, b) => {
                    if (!a.event_detail || !b.event_detail) return 0;
                    const aDate = new Date(a.event_detail.start_date);
                    const bDate = new Date(b.event_detail.start_date);
                    // Upcoming events first, then attended events
                    const aIsUpcoming = aDate > new Date();
                    const bIsUpcoming = bDate > new Date();
                    if (aIsUpcoming && !bIsUpcoming) return -1;
                    if (!aIsUpcoming && bIsUpcoming) return 1;
                    // Within same category, sort by date
                    return aIsUpcoming 
                        ? aDate.getTime() - bDate.getTime() 
                        : bDate.getTime() - aDate.getTime();
                });
        }
    };

    const displayedRegistrations = getDisplayedRegistrations();

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center py-12">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href={`/admin/club/youth/${userId}`}
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Profile
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Events
                    </h1>
                    {user && (
                        <p className="text-gray-600 mb-4">
                            Events for <span className="font-semibold">{user.first_name} {user.last_name}</span>
                        </p>
                    )}

                    {/* View Mode Tabs */}
                    <div className="flex gap-2 border-b border-gray-200">
                        <button
                            onClick={() => handleViewModeChange('all')}
                            className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
                                viewMode === 'all'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            All Events ({upcomingRegistrations.length + attendedRegistrations.length})
                        </button>
                        <button
                            onClick={() => handleViewModeChange('upcoming')}
                            className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
                                viewMode === 'upcoming'
                                    ? 'border-green-600 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Upcoming ({upcomingRegistrations.length})
                        </button>
                        <button
                            onClick={() => handleViewModeChange('history')}
                            className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
                                viewMode === 'history'
                                    ? 'border-purple-600 text-purple-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            History ({attendedRegistrations.length})
                        </button>
                    </div>
                </div>

                {/* Events List */}
                {displayedRegistrations.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            {viewMode === 'history' 
                                ? 'No Attended Events'
                                : viewMode === 'upcoming'
                                ? 'No Upcoming Events'
                                : 'No Events'}
                        </h2>
                        <p className="text-gray-500">
                            {viewMode === 'history'
                                ? "This member hasn't attended any events yet."
                                : viewMode === 'upcoming'
                                ? "This member doesn't have any upcoming events."
                                : "This member doesn't have any events."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displayedRegistrations.map((registration) => {
                            const event = registration.event_detail;
                            if (!event) return null;

                            const eventDate = event.start_date ? new Date(event.start_date) : null;
                            const eventEndDate = event.end_date ? new Date(event.end_date) : null;
                            const isValidEventDate = eventDate && !isNaN(eventDate.getTime());
                            const isValidEventEndDate = eventEndDate && !isNaN(eventEndDate.getTime());
                            const isPast = isValidEventEndDate && eventEndDate < new Date();
                            const isUpcoming = isValidEventDate && eventDate > new Date();
                            const isAttended = registration.status === 'ATTENDED';

                            return (
                                <div
                                    key={registration.id}
                                    className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
                                >
                                    <div className="p-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-start gap-4 mb-4">
                                                    {/* Event Image */}
                                                    {event.cover_image && (
                                                        <img
                                                            src={getMediaUrl(event.cover_image) || ''}
                                                            alt={event.title}
                                                            className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                                                        />
                                                    )}
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                                                            {event.title}
                                                        </h3>
                                                        
                                                        <div className="space-y-2 text-sm text-gray-600">
                                                            {/* Date & Time */}
                                                            {isValidEventDate && (
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                                    <span>
                                                                        {format(eventDate, 'EEEE, MMMM d, yyyy')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            
                                                            {isValidEventDate && isValidEventEndDate && (
                                                                <div className="flex items-center gap-2">
                                                                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                                    <span>
                                                                        {format(eventDate, 'h:mm a')} - {format(eventEndDate, 'h:mm a')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Location */}
                                                            {event.location_name && (
                                                                <div className="flex items-center gap-2">
                                                                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                                    <span>{event.location_name}</span>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Status Badge */}
                                                            {isAttended ? (
                                                                <div className="flex items-center gap-2 text-green-600 font-medium">
                                                                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                                                    <span>
                                                                        Attended on {registration.updated_at && !isNaN(new Date(registration.updated_at).getTime()) 
                                                                            ? format(new Date(registration.updated_at), 'MMM d, yyyy')
                                                                            : 'N/A'}
                                                                    </span>
                                                                </div>
                                                            ) : isUpcoming && isValidEventDate ? (
                                                                <div className="flex items-center gap-2 text-blue-600 font-medium">
                                                                    <Calendar className="w-4 h-4 flex-shrink-0" />
                                                                    <span>
                                                                        Confirmed - Event starts {format(eventDate, 'MMM d, yyyy')}
                                                                    </span>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Description */}
                                                {event.description && (
                                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                                        <p className="text-sm text-gray-600 line-clamp-3">
                                                            {event.description.replace(/<[^>]*>/g, '').substring(0, 200)}
                                                            {event.description.length > 200 ? '...' : ''}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-2 flex-shrink-0">
                                                <Link
                                                    href={`/admin/club/events/${event.id}`}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm text-center"
                                                >
                                                    View Event
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

