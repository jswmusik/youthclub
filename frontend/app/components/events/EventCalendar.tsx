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

interface EventCalendarProps {
    scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function EventCalendar({ scope }: EventCalendarProps) {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

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
            // Ideally backend supports ?start_date__gte=X&end_date__lte=Y
            // For MVP, we fetch all (paginated) and filter client side, or assume backend filters by month if param provided
            // Let's assume we fetch generic list and filter client-side for this visual
            const res = await api.get('/events/');
            const allEvents = Array.isArray(res.data) ? res.data : res.data.results || [];
            setEvents(allEvents);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Helper: Get events for a specific day
    const getEventsForDay = (day: Date) => {
        return events.filter(event => {
            const eventDate = new Date(event.start_date);
            return isSameDay(eventDate, day);
        });
    };

    const getStatusColor = (status: string) => {
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
                                    {dayEvents.map(event => (
                                        <Link 
                                            key={event.id}
                                            href={`/admin/${scope.toLowerCase()}/events/${event.id}`}
                                            className={`block px-2 py-1 rounded border text-xs truncate transition hover:opacity-80 hover:shadow-sm ${getStatusColor(event.status)}`}
                                            title={event.title}
                                        >
                                            <div className="font-bold truncate">{event.title}</div>
                                            <div className="flex items-center gap-1 opacity-75 text-[10px]">
                                                <span>{format(new Date(event.start_date), 'HH:mm')}</span>
                                                {event.location_name && <span>• {event.location_name}</span>}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            <div className="p-2 text-xs text-gray-400 text-center">
                Click an event to view details, participants, and manage approvals.
            </div>
        </div>
    );
}

