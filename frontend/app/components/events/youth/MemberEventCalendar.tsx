'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, 
  addWeeks, subWeeks, isToday 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Event } from '@/types/event';
import EventRegistrationModal from './EventRegistrationModal';


interface MemberEventCalendarProps {
    events: Event[];
    loading?: boolean;
    onEventUpdate?: () => void;
    viewMode?: 'monthly' | 'weekly';
    onViewModeChange?: (mode: 'monthly' | 'weekly') => void;
    darkMode?: boolean;
}

export default function MemberEventCalendar({ 
    events, 
    loading = false, 
    onEventUpdate,
    viewMode = 'weekly',
    onViewModeChange,
    darkMode = false
}: MemberEventCalendarProps) {
    const t = useTranslations('events');
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
            return darkMode ? {
                bg: 'bg-[var(--dark-600)]',
                text: 'text-[var(--brand-light)]/40',
                border: 'border-[var(--dark-500)]',
                hover: '',
                cursor: 'cursor-not-allowed'
            } : {
                bg: 'bg-[#EBEBFE]',
                text: 'text-gray-400',
                border: 'border-[#4D4DA4]/15',
                hover: '',
                cursor: 'cursor-not-allowed'
            };
        }

        // Check user registration status
        const userStatus = (event as any).user_registration_status;

        // Confirmed/Approved - Green/Lime
        if (userStatus === 'APPROVED' || userStatus === 'ATTENDED') {
            return darkMode ? {
                bg: 'bg-[var(--brand-third)]/20',
                text: 'text-[var(--brand-third)]',
                border: 'border-[var(--brand-third)]/50',
                hover: 'hover:bg-[var(--brand-third)]/30',
                cursor: 'cursor-pointer'
            } : {
                bg: 'bg-green-50',
                text: 'text-green-700',
                border: 'border-green-200',
                hover: 'hover:bg-green-100',
                cursor: 'cursor-pointer'
            };
        }

        // Pending - Orange/Third
        if (userStatus === 'PENDING_ADMIN' || userStatus === 'PENDING_GUARDIAN' || userStatus === 'WAITLIST') {
            return darkMode ? {
                bg: 'bg-[var(--brand-peach)]/20',
                text: 'text-[var(--brand-peach)]',
                border: 'border-[var(--brand-peach)]/50',
                hover: 'hover:bg-[var(--brand-peach)]/30',
                cursor: 'cursor-pointer'
            } : {
                bg: 'bg-orange-50',
                text: 'text-orange-700',
                border: 'border-orange-200',
                hover: 'hover:bg-orange-100',
                cursor: 'cursor-pointer'
            };
        }

        // Not applied yet or other status - Blue/Primary
        return darkMode ? {
            bg: 'bg-[var(--brand-sky)]/20',
            text: 'text-[var(--brand-sky)]',
            border: 'border-[var(--brand-sky)]/50',
            hover: 'hover:bg-[var(--brand-sky)]/30',
            cursor: 'cursor-pointer'
        } : {
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-100',
            hover: 'hover:bg-blue-100',
            cursor: 'cursor-pointer'
        };
    };

    const getEventStatusTooltip = (event: Event) => {
        if (isEventPast(event)) {
            return t('eventPassed');
        }

        const userStatus = (event as any).user_registration_status;
        
        if (userStatus === 'APPROVED' || userStatus === 'ATTENDED') {
            return t('confirmedForEvent');
        }
        
        if (userStatus === 'PENDING_ADMIN') {
            return t('waitingAdminApproval');
        }
        
        if (userStatus === 'PENDING_GUARDIAN') {
            return t('waitingGuardianApproval');
        }
        
        if (userStatus === 'WAITLIST') {
            return t('onWaitlistTooltip');
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
            <div className={`${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/10'} rounded-none sm:rounded-2xl border-y sm:border p-8`}>
                <div className="flex flex-col items-center gap-3">
                    <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${darkMode ? 'border-[var(--brand-primary)]' : 'border-[#4D4DA4]'}`}></div>
                    <div className={`text-center ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>{t('loadingCalendar')}</div>
                </div>
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
        <div className={`${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' : 'bg-white border-[#4D4DA4]/10'} rounded-none sm:rounded-2xl border-y sm:border overflow-hidden`}>
            {/* Calendar Header */}
            <div className={`p-3 sm:p-4 md:p-6 ${darkMode ? 'bg-[var(--brand-purple)]' : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4]'} text-white`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        <h2 className="font-bold text-lg sm:text-xl md:text-2xl font-heading">
                            {displayTitle}
                        </h2>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                        {/* View Mode Toggle */}
                        {onViewModeChange && (
                            <div className={`flex items-center gap-2 ${darkMode ? 'bg-[var(--dark-800)]' : 'bg-white/20'} backdrop-blur-sm rounded-xl p-1`}>
                                <button
                                    onClick={() => onViewModeChange('weekly')}
                                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                                        viewMode === 'weekly'
                                            ? darkMode 
                                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                                                : 'bg-white text-[#4D4DA4] shadow-md'
                                            : darkMode
                                                ? 'text-[var(--brand-light)]/70 hover:bg-[var(--dark-700)]'
                                                : 'text-white hover:bg-white/10'
                                    }`}
                                >
                                    {t('week')}
                                </button>
                                <button
                                    onClick={() => onViewModeChange('monthly')}
                                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                                        viewMode === 'monthly'
                                            ? darkMode 
                                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                                                : 'bg-white text-[#4D4DA4] shadow-md'
                                            : darkMode
                                                ? 'text-[var(--brand-light)]/70 hover:bg-[var(--dark-700)]'
                                                : 'text-white hover:bg-white/10'
                                    }`}
                                >
                                    {t('month')}
                                </button>
                            </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleToday}
                                className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold ${darkMode ? 'bg-[var(--dark-800)] hover:bg-[var(--dark-700)] text-[var(--brand-light)]' : 'bg-white/20 hover:bg-white/30'} backdrop-blur-sm rounded-xl transition-all`}
                            >
                                {t('today')}
                            </button>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handlePrevious} 
                                    className={`p-2 ${darkMode ? 'bg-[var(--dark-800)] hover:bg-[var(--dark-700)]' : 'bg-white/20 hover:bg-white/30'} backdrop-blur-sm rounded-xl transition-all`}
                                    aria-label={t('previous')}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={handleNext} 
                                    className={`p-2 ${darkMode ? 'bg-[var(--dark-800)] hover:bg-[var(--dark-700)]' : 'bg-white/20 hover:bg-white/30'} backdrop-blur-sm rounded-xl transition-all`}
                                    aria-label={t('next')}
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Day Headers */}
            <div className={`hidden sm:grid grid-cols-7 ${darkMode ? 'bg-[var(--dark-700)] border-b border-[var(--dark-600)]' : 'bg-[#EBEBFE] border-b-2 border-[#4D4DA4]/10'}`}>
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((dayKey, index) => (
                    <div key={`day-header-${index}`} className={`py-3 text-center text-xs font-bold ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-[#4D4DA4]'} uppercase tracking-wider`}>
                        <span className="hidden lg:inline">{t(`daysOfWeek.${dayKey}`)}</span>
                        <span className="lg:hidden">{t(`daysOfWeek.${dayKey}`).substring(0, 3)}</span>
                    </div>
                ))}
            </div>
            
            {/* Mobile Day Headers */}
            <div className={`grid sm:hidden grid-cols-7 ${darkMode ? 'bg-[var(--dark-700)] border-b border-[var(--dark-600)]' : 'bg-[#EBEBFE] border-b-2 border-[#4D4DA4]/10'}`}>
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((dayKey, index) => (
                    <div key={`day-header-mobile-${index}`} className={`py-2 text-center text-xs font-bold ${darkMode ? 'text-[var(--brand-light)]/70' : 'text-[#4D4DA4]'}`}>{t(`daysOfWeekShort.${dayKey}`)}</div>
                ))}
            </div>
            
            {/* Calendar Grid */}
            <div className={`grid grid-cols-7 auto-rows-fr ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#F8F7FE]'} gap-px ${viewMode === 'weekly' ? 'min-h-[400px] sm:min-h-[500px]' : 'min-h-[300px]'}`}>
                {calendarDays.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrent = viewMode === 'weekly' ? true : isSameMonth(day, monthStart);
                    const today = isToday(day);
                    
                    return (
                        <div key={day.toString()} className={`${viewMode === 'weekly' ? 'min-h-[300px] sm:min-h-[400px]' : 'min-h-[80px] sm:min-h-[100px]'} ${darkMode ? 'bg-[var(--dark-800)]' : 'bg-white'} p-1.5 sm:p-2 flex flex-col ${!isCurrent ? (darkMode ? 'bg-[var(--dark-900)]/50' : 'bg-[#F8F7FE]/50') : ''} ${today ? (darkMode ? 'ring-2 ring-[var(--brand-third)] ring-inset' : 'ring-2 ring-[#10B981] ring-inset') : ''}`}>
                            <div className={`text-xs sm:text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full mb-1 ${
                                today 
                                    ? darkMode 
                                        ? 'bg-[var(--brand-third)] text-[var(--dark-900)]' 
                                        : 'bg-gradient-to-br from-[#10B981] to-emerald-600 text-white shadow-md'
                                    : darkMode 
                                        ? 'text-[var(--brand-light)]/70' 
                                        : 'text-gray-600'
                            }`}>
                                {format(day, 'd')}
                            </div>
                            
                            <div className="flex-1 space-y-1 overflow-y-auto">
                                {dayEvents.length === 0 ? (
                                    <div className={`text-[10px] sm:text-xs ${darkMode ? 'text-[var(--brand-light)]/30' : 'text-gray-400'} text-center py-1 sm:py-2 italic`}>{t('noEvents')}</div>
                                ) : (
                                    dayEvents.map(event => {
                                        const isPast = isEventPast(event);
                                        const colors = getEventStatusColor(event);
                                        return (
                                            <button
                                                key={event.id}
                                                onClick={() => !isPast && setSelectedEvent(event)}
                                                disabled={isPast}
                                                className={`w-full text-left px-1.5 sm:px-2 py-1 sm:py-1.5 ${viewMode === 'weekly' ? 'text-[10px] sm:text-xs' : 'text-[9px] sm:text-[10px]'} rounded-lg border truncate font-bold transition-all ${colors.bg} ${colors.text} ${colors.border} ${colors.hover} ${colors.cursor} ${isPast ? 'opacity-50' : ''}`}
                                                title={getEventStatusTooltip(event)}
                                            >
                                                <div className="truncate">
                                                    <span className="font-black">{format(new Date(event.start_date), 'HH:mm')}</span>
                                                    {' '}
                                                    <span className={viewMode === 'monthly' ? 'hidden sm:inline' : ''}>{event.title}</span>
                                                </div>
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
                    darkMode={darkMode}
                />
            )}
        </div>
    );
}
