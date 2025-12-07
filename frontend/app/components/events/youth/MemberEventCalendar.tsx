'use client';

import { useState, useEffect } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, 
  addWeeks, subWeeks, isToday 
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Event } from '@/types/event';
import EventRegistrationModal from './EventRegistrationModal';

interface MemberEventCalendarProps {
    events: Event[];
    loading?: boolean;
    onEventUpdate?: () => void;
    viewMode?: 'monthly' | 'weekly';
    onViewModeChange?: (mode: 'monthly' | 'weekly') => void;
}

export default function MemberEventCalendar({ 
    events, 
    loading = false, 
    onEventUpdate,
    viewMode = 'weekly',
    onViewModeChange 
}: MemberEventCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    // Grid Calculation
    let calendarDays: Date[];
    let displayTitle: string;
    const monthStart = startOfMonth(currentDate);
    
    if (viewMode === 'weekly') {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        calendarDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
        displayTitle = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
        displayTitle = format(currentDate, 'MMMM yyyy');
    }

    const getEventsForDay = (day: Date) => {
        return events.filter(e => isSameDay(new Date(e.start_date), day));
    };

    const isEventPast = (event: Event) => {
        const eventStartDate = new Date(event.start_date);
        const now = new Date();
        return eventStartDate < now;
    };

    const getEventStatusColor = (event: Event) => {
        // Past events are always grey
        if (isEventPast(event)) {
            return {
                bg: 'bg-gray-100',
                text: 'text-gray-400',
                border: 'border-gray-200',
                hover: '',
                cursor: 'cursor-not-allowed'
            };
        }

        // Check user registration status
        const userStatus = (event as any).user_registration_status;

        // Confirmed/Approved - Green
        if (userStatus === 'APPROVED' || userStatus === 'ATTENDED') {
            return {
                bg: 'bg-green-50',
                text: 'text-green-700',
                border: 'border-green-200',
                hover: 'hover:bg-green-100',
                cursor: 'cursor-pointer'
            };
        }

        // Pending - Orange
        if (userStatus === 'PENDING_ADMIN' || userStatus === 'PENDING_GUARDIAN' || userStatus === 'WAITLIST') {
            return {
                bg: 'bg-orange-50',
                text: 'text-orange-700',
                border: 'border-orange-200',
                hover: 'hover:bg-orange-100',
                cursor: 'cursor-pointer'
            };
        }

        // Not applied yet or other status - Blue
        return {
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-100',
            hover: 'hover:bg-blue-100',
            cursor: 'cursor-pointer'
        };
    };

    const getEventStatusTooltip = (event: Event) => {
        if (isEventPast(event)) {
            return 'This event has passed';
        }

        const userStatus = (event as any).user_registration_status;
        
        if (userStatus === 'APPROVED' || userStatus === 'ATTENDED') {
            return 'You are confirmed for this event';
        }
        
        if (userStatus === 'PENDING_ADMIN') {
            return 'Waiting for admin approval';
        }
        
        if (userStatus === 'PENDING_GUARDIAN') {
            return 'Waiting for guardian approval';
        }
        
        if (userStatus === 'WAITLIST') {
            return 'You are on the waitlist';
        }
        
        return event.title;
    };

    // Safety check: clear selectedEvent if it becomes past
    useEffect(() => {
        if (selectedEvent && isEventPast(selectedEvent)) {
            setSelectedEvent(null);
        }
    }, [selectedEvent]);

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="text-center text-gray-500">Loading calendar...</div>
            </div>
        );
    }

    const handlePrevious = () => {
        if (viewMode === 'weekly') {
            setCurrentDate(subWeeks(currentDate, 1));
        } else {
            setCurrentDate(subMonths(currentDate, 1));
        }
    };

    const handleNext = () => {
        if (viewMode === 'weekly') {
            setCurrentDate(addWeeks(currentDate, 1));
        } else {
            setCurrentDate(addMonths(currentDate, 1));
        }
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Calendar Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-bold text-gray-800 text-lg">
                    {displayTitle}
                </h2>
                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    {onViewModeChange && (
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => onViewModeChange('weekly')}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                    viewMode === 'weekly'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Week
                            </button>
                            <button
                                onClick={() => onViewModeChange('monthly')}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                    viewMode === 'monthly'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Month
                            </button>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleToday}
                            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        >
                            Today
                        </button>
                        <div className="flex gap-1">
                            <button onClick={handlePrevious} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={handleNext} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 border-b">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, index) => (
                    <div key={`day-header-${index}`} className="py-2 text-center text-xs font-bold text-gray-400">{d}</div>
                ))}
            </div>
            
            <div className={`grid grid-cols-7 auto-rows-fr bg-gray-100 gap-px border-b ${viewMode === 'weekly' ? 'min-h-[500px]' : ''}`}>
                {calendarDays.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    // In weekly view, all days are current. In monthly view, check if day is in current month
                    const isCurrent = viewMode === 'weekly' ? true : isSameMonth(day, monthStart);
                    
                    return (
                        <div key={day.toString()} className={`${viewMode === 'weekly' ? 'min-h-[400px]' : 'min-h-[80px]'} bg-white p-2 flex flex-col ${!isCurrent ? 'bg-gray-50' : ''}`}>
                            <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday(day) ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>
                                {format(day, 'd')}
                            </div>
                            
                            <div className="flex-1 space-y-1 overflow-y-auto">
                                {dayEvents.length === 0 ? (
                                    <div className="text-xs text-gray-400 text-center py-2">No events</div>
                                ) : (
                                    dayEvents.map(event => {
                                        const isPast = isEventPast(event);
                                        const colors = getEventStatusColor(event);
                                        return (
                                            <button
                                                key={event.id}
                                                onClick={() => !isPast && setSelectedEvent(event)}
                                                disabled={isPast}
                                                className={`w-full text-left px-2 py-1 ${viewMode === 'weekly' ? 'text-xs' : 'text-[10px]'} rounded border truncate font-medium block transition-colors ${colors.bg} ${colors.text} ${colors.border} ${colors.hover} ${colors.cursor} ${isPast ? 'opacity-60' : ''}`}
                                                title={getEventStatusTooltip(event)}
                                            >
                                                {format(new Date(event.start_date), 'HH:mm')} {event.title}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {selectedEvent && !isEventPast(selectedEvent) && (
                <EventRegistrationModal
                    event={selectedEvent}
                    isOpen={!!selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    onSuccess={() => {
                        setSelectedEvent(null);
                        // Refresh events to update registration status colors
                        if (onEventUpdate) {
                            onEventUpdate();
                        }
                    }}
                />
            )}
        </div>
    );
}

