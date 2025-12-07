'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, 
  isToday 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import api from '@/lib/api';
import { Event } from '@/types/event';
import EventActionModal from './EventActionModal';

interface EventCalendarProps {
    scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function EventCalendar({ scope }: EventCalendarProps) {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [showActionModal, setShowActionModal] = useState(false);

    // Calculate Grid
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    useEffect(() => {
        fetchEvents();
    }, [currentDate]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            // Calculate date range for the month being viewed
            // We need to fetch events that overlap with the calendar month
            // Events can start before the month or end after it, so we use a wider range
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            
            // Set end of month to end of day (23:59:59) to include all events on that day
            const monthEndWithTime = new Date(monthEnd);
            monthEndWithTime.setHours(23, 59, 59, 999);
            
            // Set start of month to beginning of day (00:00:00) to include all events on that day
            const monthStartWithTime = new Date(monthStart);
            monthStartWithTime.setHours(0, 0, 0, 0);
            
            // Fetch events that start before the month ends OR end after the month starts
            // This ensures we get all events that appear in the calendar
            const params = new URLSearchParams();
            params.set('start_date__lte', monthEndWithTime.toISOString());
            params.set('end_date__gte', monthStartWithTime.toISOString());
            // Increase page size to get all events in the month
            params.set('page_size', '1000');
            // Ensure we get both parent events and recurring instances
            // (backend should return all by default, but we can be explicit)
            
            console.log(`Calendar: Fetching events for ${format(monthStart, 'MMMM yyyy')}`);
            console.log(`  Date range: ${monthStartWithTime.toISOString()} to ${monthEndWithTime.toISOString()}`);
            
            const res = await api.get(`/events/?${params.toString()}`);
            let allEvents = Array.isArray(res.data) ? res.data : res.data.results || [];
            
            // Handle pagination if needed
            if (res.data.next) {
                // If there are more pages, fetch them (though unlikely with page_size=1000)
                console.warn('Calendar events paginated - consider increasing page_size');
            }
            
            // Debug: Log events to see if recurring instances are included
            console.log(`Calendar: Fetched ${allEvents.length} events for ${format(monthStart, 'MMMM yyyy')}`);
            const recurringInstances = allEvents.filter(e => e.parent_event);
            console.log(`Calendar: Found ${recurringInstances.length} recurring instances`);
            if (recurringInstances.length > 0) {
                console.log('Sample recurring instances:', recurringInstances.slice(0, 5).map(e => ({
                    id: e.id,
                    title: e.title,
                    start_date: e.start_date,
                    start_date_parsed: new Date(e.start_date).toISOString(),
                    parent_event: e.parent_event
                })));
            }
            
            setEvents(allEvents);
        } catch (error) {
            console.error('Error fetching events for calendar:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper: Get events for a specific day
    const getEventsForDay = (day: Date) => {
        const dayEvents = events.filter(event => {
            const eventDate = new Date(event.start_date);
            const isMatch = isSameDay(eventDate, day);
            return isMatch;
        });
        
        // Debug: Log if we're filtering out recurring instances
        if (dayEvents.length > 0) {
            const hasRecurringInstances = dayEvents.some(e => e.parent_event);
            if (hasRecurringInstances) {
                console.log(`Day ${format(day, 'yyyy-MM-dd')}: Found ${dayEvents.length} events, including recurring instances`);
            }
        }
        
        return dayEvents;
    };

    const isEventPast = (event: Event) => {
        const eventEndDate = new Date(event.end_date);
        const now = new Date();
        return eventEndDate < now;
    };

    const getStatusColor = (status: string, isPast: boolean) => {
        if (isPast) {
            return 'bg-gray-100 text-gray-500 border-gray-200 opacity-60';
        }
        switch (status) {
            case 'PUBLISHED': return 'bg-green-100 text-green-800 border-green-200';
            case 'DRAFT': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'CANCELLED': return 'bg-red-50 text-red-800 border-red-100 line-through opacity-75';
            default: return 'bg-blue-50 text-blue-800 border-blue-100';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow border border-gray-200 h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800 capitalize">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex items-center rounded-md border shadow-sm">
                        <button 
                            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                            className="p-1 hover:bg-gray-100 border-r"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button 
                            onClick={() => setCurrentDate(new Date())}
                            className="px-3 py-1 text-sm font-medium hover:bg-gray-100"
                        >
                            Today
                        </button>
                        <button 
                            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                            className="p-1 hover:bg-gray-100 border-l"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
                
                <Link 
                    href={`/admin/${scope.toLowerCase()}/events/create`} 
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700"
                >
                    <Plus size={16} /> New Event
                </Link>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b bg-gray-50">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="py-2 text-center text-xs font-bold text-gray-500 uppercase">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-gray-500">Loading events...</div>
                </div>
            ) : (
                <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-gray-100 gap-px border-b">
                    {calendarDays.map((day, dayIdx) => {
                        const dayEvents = getEventsForDay(day);
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        
                        return (
                            <div 
                                key={day.toString()} 
                                className={`min-h-[120px] bg-white p-2 flex flex-col gap-1 transition
                                    ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'text-gray-900'}
                                    ${isToday(day) ? 'bg-blue-50/30' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                                        ${isToday(day) ? 'bg-blue-600 text-white' : ''}
                                    `}>
                                        {format(day, 'd')}
                                    </span>
                                    {dayEvents.length > 0 && (
                                        <span className="text-xs text-gray-400 font-medium">{dayEvents.length} events</span>
                                    )}
                                </div>

                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[120px]">
                                    {dayEvents.map(event => {
                                        const past = isEventPast(event);
                                        return (
                                            <button
                                                key={event.id}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setSelectedEvent(event);
                                                    setShowActionModal(true);
                                                }}
                                                className={`w-full text-left px-2 py-1 rounded border text-xs truncate transition hover:opacity-80 hover:shadow-sm ${getStatusColor(event.status, past)}`}
                                                title={event.title}
                                            >
                                                <div className="font-bold truncate">{event.title}</div>
                                                <div className="flex items-center gap-1 opacity-75 text-[10px]">
                                                    <span>{format(new Date(event.start_date), 'HH:mm')}</span>
                                                    {event.location_name && <span>• {event.location_name}</span>}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            <div className="p-2 text-xs text-gray-400 text-center">
                Click an event to view options.
            </div>

            {/* Event Action Modal */}
            <EventActionModal
                event={selectedEvent}
                isOpen={showActionModal}
                onClose={() => {
                    setShowActionModal(false);
                    setSelectedEvent(null);
                }}
                onEventUpdated={fetchEvents}
                scope={scope}
            />
        </div>
    );
}

