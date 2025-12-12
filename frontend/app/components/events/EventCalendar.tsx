'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, 
  isToday 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import api from '@/lib/api';
import { Event } from '@/types/event';
import EventActionModal from './EventActionModal';

// Shadcn
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
            case 'PUBLISHED': return 'bg-green-50 text-green-700 border-green-200';
            case 'DRAFT': return 'bg-gray-50 text-gray-700 border-gray-200';
            case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-200 line-through opacity-75';
            case 'SCHEDULED': return 'bg-blue-50 text-blue-700 border-blue-200';
            default: return 'bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/20';
        }
    };

    return (
        <Card className="border-none shadow-sm h-full flex flex-col overflow-hidden">
            {/* Header */}
            <CardHeader className="border-b border-gray-200 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-[#4D4DA4]" />
                            <CardTitle className="text-xl font-bold text-[#121213] capitalize">
                                {format(currentDate, 'MMMM yyyy')}
                            </CardTitle>
                        </div>
                        <div className="flex items-center rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <Button 
                                variant="ghost"
                                size="icon"
                                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                                className="h-9 w-9 rounded-none hover:bg-muted"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant="ghost"
                                size="sm"
                                onClick={() => setCurrentDate(new Date())}
                                className="h-9 px-3 text-sm font-medium rounded-none hover:bg-muted border-x border-gray-200"
                            >
                                Today
                            </Button>
                            <Button 
                                variant="ghost"
                                size="icon"
                                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                                className="h-9 w-9 rounded-none hover:bg-muted"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-muted/30">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="py-2 sm:py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{day.slice(0, 1)}</span>
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center p-8 min-h-[400px]">
                        <div className="text-muted-foreground">Loading events...</div>
                    </div>
                ) : (
                    <>
                        {/* Desktop Calendar Grid */}
                        <div className="hidden md:grid grid-cols-7 auto-rows-fr bg-gray-100 gap-px min-h-[600px]">
                            {calendarDays.map((day) => {
                                const dayEvents = getEventsForDay(day);
                                const isCurrentMonth = isSameMonth(day, monthStart);
                                const isTodayDate = isToday(day);
                                
                                return (
                                    <div 
                                        key={day.toString()} 
                                        className={cn(
                                            "min-h-[120px] bg-white p-2 flex flex-col gap-1.5 transition-colors",
                                            !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                                            isTodayDate && "bg-[#EBEBFE]/30"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={cn(
                                                "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                                                isTodayDate 
                                                    ? "bg-[#4D4DA4] text-white" 
                                                    : "text-[#121213]"
                                            )}>
                                                {format(day, 'd')}
                                            </span>
                                            {dayEvents.length > 0 && (
                                                <Badge variant="outline" className="text-xs h-5 px-1.5 bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/20">
                                                    {dayEvents.length}
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[100px]">
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
                                                        className={cn(
                                                            "w-full text-left px-2 py-1.5 rounded border text-xs transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer",
                                                            getStatusColor(event.status, past)
                                                        )}
                                                        title={event.title}
                                                    >
                                                        <div className="font-semibold truncate">{event.title}</div>
                                                        <div className="flex items-center gap-1 opacity-75 text-[10px] mt-0.5">
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

                        {/* Mobile Calendar Grid */}
                        <div className="md:hidden space-y-3 p-4">
                            {calendarDays.filter(day => isSameMonth(day, monthStart)).map((day) => {
                                const dayEvents = getEventsForDay(day);
                                const isTodayDate = isToday(day);
                                
                                // Show all days, but only highlight days with events or today
                                if (dayEvents.length === 0 && !isTodayDate) {
                                    return (
                                        <div 
                                            key={day.toString()} 
                                            className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-muted/20"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={cn(
                                                    "text-base font-semibold w-8 h-8 flex items-center justify-center rounded-full",
                                                    isTodayDate 
                                                        ? "bg-[#4D4DA4] text-white" 
                                                        : "text-muted-foreground"
                                                )}>
                                                    {format(day, 'd')}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    {format(day, 'EEEE, MMMM d')}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }
                                
                                return (
                                    <Card 
                                        key={day.toString()} 
                                        className={cn(
                                            "border shadow-sm",
                                            isTodayDate && "border-[#4D4DA4] border-2"
                                        )}
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full",
                                                        isTodayDate 
                                                            ? "bg-[#4D4DA4] text-white" 
                                                            : "text-[#121213]"
                                                    )}>
                                                        {format(day, 'd')}
                                                    </span>
                                                    <span className="text-sm font-medium text-muted-foreground">
                                                        {format(day, 'EEEE, MMMM d')}
                                                    </span>
                                                </div>
                                                {dayEvents.length > 0 && (
                                                    <Badge variant="outline" className="bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/20">
                                                        {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardHeader>
                                        {dayEvents.length > 0 && (
                                            <CardContent className="pt-0 space-y-2">
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
                                                            className={cn(
                                                                "w-full text-left p-3 rounded-lg border transition-all hover:shadow-md",
                                                                getStatusColor(event.status, past)
                                                            )}
                                                        >
                                                            <div className="font-semibold text-sm mb-1">{event.title}</div>
                                                            <div className="flex flex-wrap items-center gap-2 text-xs opacity-75">
                                                                <span>{format(new Date(event.start_date), 'HH:mm')}</span>
                                                                {event.location_name && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>{event.location_name}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </CardContent>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
            
            <div className="p-3 border-t border-gray-200 bg-muted/30">
                <p className="text-xs text-muted-foreground text-center">Click an event to view options.</p>
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
        </Card>
    );
}

