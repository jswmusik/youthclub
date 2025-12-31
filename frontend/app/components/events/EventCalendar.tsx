'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, 
  isToday 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock, Repeat } from 'lucide-react';
import api from '@/lib/api';
import { Event } from '@/types/event';
import EventActionModal from './EventActionModal';

interface EventCalendarProps {
    scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function EventCalendar({ scope }: EventCalendarProps) {
    const router = useRouter();
    const t = useTranslations('eventsAdmin.calendar');
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
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            
            const monthEndWithTime = new Date(monthEnd);
            monthEndWithTime.setHours(23, 59, 59, 999);
            
            const monthStartWithTime = new Date(monthStart);
            monthStartWithTime.setHours(0, 0, 0, 0);
            
            const params = new URLSearchParams();
            params.set('start_date__lte', monthEndWithTime.toISOString());
            params.set('end_date__gte', monthStartWithTime.toISOString());
            params.set('page_size', '1000');
            
            const res = await api.get(`/events/?${params.toString()}`);
            let allEvents = Array.isArray(res.data) ? res.data : res.data.results || [];
            
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
        
        return dayEvents;
    };

    const isEventPast = (event: Event) => {
        const eventEndDate = new Date(event.end_date);
        const now = new Date();
        return eventEndDate < now;
    };

    const getStatusColor = (status: string, isPast: boolean) => {
        if (isPast) {
            return {
                bg: 'bg-[var(--dark-600)]',
                text: 'text-[var(--brand-light)]/40',
                border: 'border-[var(--dark-500)]'
            };
        }
        switch (status) {
            case 'PUBLISHED': 
                return {
                    bg: 'bg-[var(--brand-green)]/20',
                    text: 'text-[var(--brand-green)]',
                    border: 'border-[var(--brand-green)]/30'
                };
            case 'DRAFT': 
                return {
                    bg: 'bg-[var(--dark-600)]',
                    text: 'text-[var(--brand-light)]/70',
                    border: 'border-[var(--dark-500)]'
                };
            case 'CANCELLED': 
                return {
                    bg: 'bg-[var(--brand-red)]/20',
                    text: 'text-[var(--brand-red)] line-through',
                    border: 'border-[var(--brand-red)]/30'
                };
            case 'SCHEDULED': 
                return {
                    bg: 'bg-[var(--brand-blue)]/20',
                    text: 'text-[var(--brand-blue)]',
                    border: 'border-[var(--brand-blue)]/30'
                };
            default: 
                return {
                    bg: 'bg-[var(--brand-purple)]/20',
                    text: 'text-[var(--brand-purple)]',
                    border: 'border-[var(--brand-purple)]/30'
                };
        }
    };

    return (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="border-b border-[var(--dark-600)] px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-[var(--brand-primary)]" />
                            <h2 className="text-xl font-bold text-[var(--brand-light)] capitalize">
                                {format(currentDate, 'MMMM yyyy')}
                            </h2>
                        </div>
                        <div className="flex items-center rounded-xl border border-[var(--dark-500)] overflow-hidden bg-[var(--dark-700)]">
                            <button 
                                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                                className="h-10 w-10 flex items-center justify-center text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button 
                                onClick={() => setCurrentDate(new Date())}
                                className="h-10 px-4 text-sm font-medium text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-colors border-x border-[var(--dark-500)]"
                            >
                                {t('today')}
                            </button>
                            <button 
                                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                                className="h-10 w-10 flex items-center justify-center text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                    <div key={day} className="py-2 sm:py-3 text-center text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wide">
                        <span className="hidden sm:inline">{t(`weekDays.${day}`)}</span>
                        <span className="sm:hidden">{t(`weekDays.${day}`).slice(0, 1)}</span>
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center p-8 min-h-[400px]">
                        <div className="text-center">
                            <div className="w-10 h-10 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-[var(--brand-light)]/50">{t('loadingEvents')}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Desktop Calendar Grid */}
                        <div className="hidden md:grid grid-cols-7 auto-rows-fr bg-[var(--dark-600)]/50 gap-px min-h-[600px]">
                            {calendarDays.map((day) => {
                                const dayEvents = getEventsForDay(day);
                                const isCurrentMonth = isSameMonth(day, monthStart);
                                const isTodayDate = isToday(day);
                                
                                return (
                                    <div 
                                        key={day.toString()} 
                                        className={`min-h-[120px] bg-[var(--dark-800)] p-2 flex flex-col gap-1.5 transition-colors ${
                                            !isCurrentMonth ? 'bg-[var(--dark-900)]/50' : ''
                                        } ${
                                            isTodayDate ? 'bg-[var(--brand-primary)]/5 ring-1 ring-inset ring-[var(--brand-primary)]/30' : ''
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                                                isTodayDate 
                                                    ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                                    : isCurrentMonth
                                                    ? 'text-[var(--brand-light)]'
                                                    : 'text-[var(--brand-light)]/30'
                                            }`}>
                                                {format(day, 'd')}
                                            </span>
                                            {dayEvents.length > 0 && (
                                                <span className="text-xs h-5 px-1.5 rounded-full bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30 font-semibold flex items-center justify-center">
                                                    {dayEvents.length}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[100px] scrollbar-thin">
                                            {dayEvents.map(event => {
                                                const past = isEventPast(event);
                                                const colors = getStatusColor(event.status, past);
                                                return (
                                                    <button
                                                        key={event.id}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setSelectedEvent(event);
                                                            setShowActionModal(true);
                                                        }}
                                                        className={`w-full text-left px-2 py-1.5 rounded-lg border text-xs transition-all hover:scale-[1.02] cursor-pointer ${colors.bg} ${colors.border}`}
                                                        title={event.title}
                                                    >
                                                        <div className={`font-semibold truncate ${colors.text}`}>{event.title}</div>
                                                        <div className={`flex items-center gap-1 text-[10px] mt-0.5 ${colors.text} opacity-70`}>
                                                            <Clock className="w-2.5 h-2.5" />
                                                            <span>{format(new Date(event.start_date), 'HH:mm')}</span>
                                                            {event.is_recurring && <Repeat className="w-2.5 h-2.5 ml-1" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Mobile Calendar - List View */}
                        <div className="md:hidden">
                            {/* Mini Calendar Grid for Mobile */}
                            <div className="grid grid-cols-7 gap-px bg-[var(--dark-600)]/50 p-2">
                                {calendarDays.map((day) => {
                                    const dayEvents = getEventsForDay(day);
                                    const isCurrentMonth = isSameMonth(day, monthStart);
                                    const isTodayDate = isToday(day);
                                    const hasEvents = dayEvents.length > 0;
                                    
                                    return (
                                        <button
                                            key={day.toString()}
                                            onClick={() => {
                                                // Scroll to day in list
                                                const element = document.getElementById(`day-${format(day, 'yyyy-MM-dd')}`);
                                                if (element) {
                                                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                }
                                            }}
                                            className={`aspect-square flex flex-col items-center justify-center rounded-lg transition-all ${
                                                !isCurrentMonth ? 'opacity-30' : ''
                                            } ${
                                                isTodayDate 
                                                    ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                                    : hasEvents
                                                    ? 'bg-[var(--dark-700)] text-[var(--brand-light)]'
                                                    : 'text-[var(--brand-light)]/60'
                                            }`}
                                        >
                                            <span className="text-xs font-semibold">{format(day, 'd')}</span>
                                            {hasEvents && !isTodayDate && (
                                                <span className="w-1 h-1 rounded-full bg-[var(--brand-purple)] mt-0.5" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Day List for Mobile */}
                            <div className="space-y-0 mt-2">
                                {calendarDays.filter(day => isSameMonth(day, monthStart)).map((day) => {
                                    const dayEvents = getEventsForDay(day);
                                    const isTodayDate = isToday(day);
                                    
                                    // Only show days with events or today
                                    if (dayEvents.length === 0 && !isTodayDate) {
                                        return null;
                                    }
                                    
                                    return (
                                        <div 
                                            key={day.toString()} 
                                            id={`day-${format(day, 'yyyy-MM-dd')}`}
                                            className={`border-y border-[var(--dark-600)] ${
                                                isTodayDate ? 'bg-[var(--brand-primary)]/5' : 'bg-[var(--dark-700)]'
                                            }`}
                                        >
                                            {/* Day Header */}
                                            <div className="px-4 py-3 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-lg font-bold w-10 h-10 flex items-center justify-center rounded-xl ${
                                                        isTodayDate 
                                                            ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                                            : 'bg-[var(--dark-600)] text-[var(--brand-light)]'
                                                    }`}>
                                                        {format(day, 'd')}
                                                    </span>
                                                    <div>
                                                        <span className="text-sm font-medium text-[var(--brand-light)]">
                                                            {format(day, 'EEEE')}
                                                        </span>
                                                        <span className="text-xs text-[var(--brand-light)]/50 block">
                                                            {format(day, 'MMMM d, yyyy')}
                                                        </span>
                                                    </div>
                                                </div>
                                                {dayEvents.length > 0 && (
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30">
                                                        {dayEvents.length} {dayEvents.length === 1 ? t('event') : t('events')}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Events List */}
                                            {dayEvents.length > 0 && (
                                                <div className="px-4 pb-4 space-y-2">
                                                    {dayEvents.map(event => {
                                                        const past = isEventPast(event);
                                                        const colors = getStatusColor(event.status, past);
                                                        return (
                                                            <button
                                                                key={event.id}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setSelectedEvent(event);
                                                                    setShowActionModal(true);
                                                                }}
                                                                className={`w-full text-left p-3 rounded-xl border transition-all active:scale-[0.98] ${colors.bg} ${colors.border}`}
                                                            >
                                                                <div className={`font-semibold text-sm mb-1 ${colors.text}`}>
                                                                    {event.title}
                                                                    {event.is_recurring && (
                                                                        <Repeat className="w-3.5 h-3.5 inline-block ml-2 opacity-70" />
                                                                    )}
                                                                </div>
                                                                <div className={`flex flex-wrap items-center gap-3 text-xs ${colors.text} opacity-70`}>
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        {format(new Date(event.start_date), 'HH:mm')}
                                                                    </span>
                                                                    {event.location_name && (
                                                                        <span className="flex items-center gap-1">
                                                                            <MapPin className="w-3 h-3" />
                                                                            {event.location_name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Empty state for today */}
                                            {dayEvents.length === 0 && isTodayDate && (
                                                <div className="px-4 pb-4">
                                                    <p className="text-sm text-[var(--brand-light)]/40 text-center py-2">{t('noEventsToday')}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Empty state if no events in month */}
                                {calendarDays.filter(day => isSameMonth(day, monthStart) && (getEventsForDay(day).length > 0 || isToday(day))).length === 0 && (
                                    <div className="py-12 text-center">
                                        <CalendarIcon className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-4" />
                                        <p className="text-[var(--brand-light)]/50">{t('noEventsThisMonth')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
            
            <div className="p-3 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/30">
                <p className="text-xs text-[var(--brand-light)]/40 text-center">{t('tapEventToView')}</p>
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
                darkMode={true}
            />
        </div>
    );
}
