'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ChevronRight, ArrowLeft, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import NavBar from '@/app/components/NavBar';
import SwipeButton from '@/app/components/ui/SwipeButton';

type TabType = 'active' | 'history';

export default function MyTicketsPage() {
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('active');
    const [checkInState, setCheckInState] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [checkInMessage, setCheckInMessage] = useState('');

    useEffect(() => {
        fetchRegistrations().finally(() => {
            setLoading(false);
        });
    }, []);

    // Helper: Sort by Date
    const sorted = [...registrations].sort((a, b) => {
        const dateA = new Date(a.event_detail?.start_date || 0).getTime();
        const dateB = new Date(b.event_detail?.start_date || 0).getTime();
        return dateA - dateB;
    });

    // Filter active tickets (upcoming events with APPROVED status)
    const activeRegistrations = sorted.filter(reg => {
        if (!reg.event_detail?.start_date) return false;
        const eventDate = new Date(reg.event_detail.start_date);
        const eventEndDate = new Date(reg.event_detail.end_date || reg.event_detail.start_date);
        // Active: event hasn't ended yet AND status is APPROVED (has ticket)
        return eventEndDate >= new Date() && reg.status === 'APPROVED';
    });

    // Filter history tickets (past events or attended events)
    const historyRegistrations = sorted.filter(reg => {
        if (!reg.event_detail?.start_date) return false;
        const eventEndDate = new Date(reg.event_detail.end_date || reg.event_detail.start_date);
        // History: event has ended OR status is ATTENDED
        return eventEndDate < new Date() || reg.status === 'ATTENDED';
    });

    // Get unique events from active registrations
    const activeEvents = useMemo(() => {
        const eventMap = new Map();
        activeRegistrations.forEach(reg => {
            if (reg.event_detail && !eventMap.has(reg.event)) {
                eventMap.set(reg.event, {
                    id: reg.event,
                    title: reg.event_detail.title,
                    start_date: reg.event_detail.start_date,
                    location_name: reg.event_detail.location_name,
                    registration: reg
                });
            }
        });
        return Array.from(eventMap.values()).sort((a, b) => 
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        );
    }, [activeRegistrations]);

    // Get unique events from history registrations
    const historyEvents = useMemo(() => {
        const eventMap = new Map();
        historyRegistrations.forEach(reg => {
            if (reg.event_detail && !eventMap.has(reg.event)) {
                eventMap.set(reg.event, {
                    id: reg.event,
                    title: reg.event_detail.title,
                    start_date: reg.event_detail.start_date,
                    end_date: reg.event_detail.end_date,
                    location_name: reg.event_detail.location_name,
                    registration: reg
                });
            }
        });
        return Array.from(eventMap.values()).sort((a, b) => 
            new Date(b.start_date).getTime() - new Date(a.start_date).getTime() // Most recent first
        );
    }, [historyRegistrations]);

    // Get events based on active tab
    const currentEvents = activeTab === 'active' ? activeEvents : historyEvents;
    const currentRegistrations = activeTab === 'active' ? activeRegistrations : historyRegistrations;

    // Get selected registration
    const selectedRegistration = useMemo(() => {
        if (!selectedEventId) return null;
        return currentRegistrations.find(reg => reg.event === selectedEventId);
    }, [selectedEventId, currentRegistrations]);

    // Auto-select first event if none selected or when switching tabs
    useEffect(() => {
        if (currentEvents.length > 0) {
            // If current selection is not in current events, select first one
            if (!selectedEventId || !currentEvents.find(e => e.id === selectedEventId)) {
                setSelectedEventId(currentEvents[0].id);
            }
        } else {
            setSelectedEventId(null);
        }
    }, [currentEvents, activeTab]);

    // Reset selection when switching tabs
    useEffect(() => {
        if (currentEvents.length > 0 && (!selectedEventId || !currentEvents.find(e => e.id === selectedEventId))) {
            setSelectedEventId(currentEvents[0].id);
        }
        // Reset check-in state when switching tabs
        setCheckInState('IDLE');
        setCheckInMessage('');
    }, [activeTab]);

    // Reset check-in state when selecting a different ticket
    useEffect(() => {
        setCheckInState('IDLE');
        setCheckInMessage('');
    }, [selectedEventId]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'WAITLIST':
                return <Clock className="w-4 h-4 text-orange-600" />;
            case 'PENDING_GUARDIAN':
            case 'PENDING_ADMIN':
                return <AlertCircle className="w-4 h-4 text-yellow-600" />;
            default:
                return <Calendar className="w-4 h-4 text-gray-600" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            APPROVED: 'bg-green-100 text-green-700',
            WAITLIST: 'bg-orange-100 text-orange-700',
            PENDING_GUARDIAN: 'bg-yellow-100 text-yellow-700',
            PENDING_ADMIN: 'bg-blue-100 text-blue-700',
            ATTENDED: 'bg-green-100 text-green-700',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
                {status === 'PENDING_GUARDIAN' ? 'Pending Guardian' :
                 status === 'PENDING_ADMIN' ? 'Pending Admin' :
                 status === 'ATTENDED' ? 'Attended' :
                 status}
            </span>
        );
    };

    const handleCheckIn = async () => {
        if (!selectedRegistration || !selectedRegistration.ticket) return;

        try {
            // Call check-in API endpoint
            await api.post(`/registrations/${selectedRegistration.id}/check_in/`);
            
            setCheckInState('SUCCESS');
            setCheckInMessage(`Checked in at ${new Date().toLocaleTimeString()}`);
            
            // Refresh registrations after short delay
            setTimeout(() => {
                fetchRegistrations();
            }, 2000);
        } catch (error: any) {
            console.error('Check-in failed:', error);
            setCheckInState('ERROR');
            setCheckInMessage(error.response?.data?.error || 'Failed to check in. Please try again.');
        }
    };

    const fetchRegistrations = async () => {
        try {
            const res = await api.get('/registrations/');
            const allRegs = res.data.results || res.data;
            setRegistrations(allRegs);
            
            // Update selected registration if it exists
            if (selectedEventId) {
                const updatedReg = allRegs.find((reg: any) => reg.event === selectedEventId);
                if (updatedReg) {
                    // Registration updated, but we'll let the useMemo handle it
                }
            }
            
            // Auto-select first upcoming event if available
            const upcoming = allRegs.filter((reg: any) => {
                if (!reg.event_detail?.start_date) return false;
                const eventDate = new Date(reg.event_detail.start_date);
                return eventDate >= new Date();
            });
            if (upcoming.length > 0 && !selectedEventId) {
                setSelectedEventId(upcoming[0].event);
            }
        } catch (err) {
            console.error('Failed to load registrations:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <NavBar />
            <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left Sidebar */}
                    <aside className="w-full md:w-64 flex-shrink-0 space-y-6 md:sticky md:top-[72px] md:self-start md:max-h-[calc(100vh-88px)] md:overflow-y-auto">
                        {/* Back Button */}
                        <div>
                            <Link 
                                href="/dashboard/youth/events"
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors mb-4"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Events
                            </Link>
                        </div>

                        {/* Tabs */}
                        <div>
                            <div className="flex gap-2 border-b border-gray-200 mb-4">
                                <button
                                    onClick={() => setActiveTab('active')}
                                    className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
                                        activeTab === 'active'
                                            ? 'border-green-600 text-green-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    Active ({activeEvents.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${
                                        activeTab === 'history'
                                            ? 'border-purple-600 text-purple-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    History ({historyEvents.length})
                                </button>
                            </div>

                            {/* Events List */}
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 mb-3">
                                    {activeTab === 'active' ? 'Active Tickets' : 'Ticket History'}
                                </h2>
                                {loading ? (
                                    <div className="text-sm text-gray-500">Loading...</div>
                                ) : currentEvents.length === 0 ? (
                                    <div className="text-sm text-gray-500">
                                        {activeTab === 'active' 
                                            ? 'No active tickets'
                                            : 'No ticket history'}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {currentEvents.map((event) => {
                                            const reg = event.registration;
                                            const isSelected = selectedEventId === event.id;
                                            const isPast = event.end_date ? new Date(event.end_date) < new Date() : false;
                                            const isAttended = reg.status === 'ATTENDED';
                                            
                                            return (
                                                <button
                                                    key={event.id}
                                                    onClick={() => setSelectedEventId(event.id)}
                                                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                                        isSelected
                                                            ? activeTab === 'active'
                                                                ? 'bg-green-50 border-green-200 shadow-sm'
                                                                : 'bg-purple-50 border-purple-200 shadow-sm'
                                                            : 'bg-white border-gray-200 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2 mb-1">
                                                        {activeTab === 'active' 
                                                            ? getStatusIcon(reg.status)
                                                            : isAttended 
                                                                ? <CheckCircle className="w-4 h-4 text-green-600" />
                                                                : <Calendar className="w-4 h-4 text-gray-400" />
                                                        }
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className={`font-semibold text-sm line-clamp-2 ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                                                                {event.title}
                                                            </h3>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {format(new Date(event.start_date), 'MMM d, HH:mm')}
                                                        {isPast && activeTab === 'history' && (
                                                            <span className="ml-2 text-gray-400">• Past</span>
                                                        )}
                                                    </div>
                                                    <div className="mt-2">
                                                        {activeTab === 'active' ? (
                                                            getStatusBadge(reg.status)
                                                        ) : (
                                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                                isAttended 
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-gray-100 text-gray-700'
                                                            }`}>
                                                                {isAttended ? 'Attended' : 'Past Event'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-gray-900">My Tickets</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                {selectedRegistration 
                                    ? `Ticket for ${selectedRegistration.event_detail?.title || 'Event'}`
                                    : 'Select an event to view your ticket'}
                            </p>
                        </div>

                        {loading ? (
                            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                                Loading tickets...
                            </div>
                        ) : !selectedRegistration ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 mb-2 font-medium">No ticket selected</p>
                                <p className="text-sm text-gray-400 mb-4">
                                    Select an event from the {activeTab === 'active' ? 'active tickets' : 'history'} to view your ticket.
                                </p>
                                {currentEvents.length === 0 && (
                                    <Link 
                                        href="/dashboard/youth/events" 
                                        className="text-green-600 font-semibold hover:underline inline-block"
                                    >
                                        Browse Events →
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                {/* Header Color Strip */}
                                <div className={`h-2 ${selectedRegistration.status === 'APPROVED' ? 'bg-green-500' : selectedRegistration.status === 'WAITLIST' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                                
                                <div className="p-6">
                                    <div className="mb-6">
                                        <h2 className="font-bold text-2xl mb-2">
                                            {selectedRegistration.event_detail?.title || 'Event'}
                                        </h2>
                                        <div className="flex flex-col gap-2 text-sm text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-green-600" />
                                                <span className="font-medium">
                                                    {format(new Date(selectedRegistration.event_detail.start_date), 'EEEE, MMMM d, yyyy • HH:mm')}
                                                </span>
                                            </div>
                                            {selectedRegistration.event_detail?.location_name && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400">📍</span>
                                                    <span>{selectedRegistration.event_detail.location_name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Ticket Area */}
                                    {selectedRegistration.status === 'APPROVED' && selectedRegistration.ticket && activeTab === 'active' ? (
                                        <div className="bg-gradient-to-br from-gray-50 to-green-50/30 rounded-xl p-8 flex flex-col items-center justify-center border-2 border-dashed border-green-200">
                                            <div className="text-center mb-6">
                                                <div className="mb-4 flex items-center justify-center gap-2 text-green-600 font-bold text-lg">
                                                    <CheckCircle className="w-6 h-6" />
                                                    <span>Confirmed Seat</span>
                                                </div>
                                                <div className="bg-white px-6 py-3 rounded-lg border-2 border-green-200 shadow-sm mb-4">
                                                    <span className="text-lg font-mono text-gray-700 tracking-wider">
                                                        {selectedRegistration.ticket.ticket_code}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Check if already checked in */}
                                            {selectedRegistration.ticket.checked_in_at ? (
                                                <div className="w-full max-w-md py-4">
                                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                                        <CheckCircle className="w-8 h-8" />
                                                    </div>
                                                    <h4 className="text-lg font-bold text-green-700 text-center">Already Checked In</h4>
                                                    <p className="text-xs text-gray-500 mt-1 text-center">
                                                        Checked in at {format(new Date(selectedRegistration.ticket.checked_in_at), 'MMM d, yyyy • h:mm a')}
                                                    </p>
                                                </div>
                                            ) : (() => {
                                                // Calculate if check-in is allowed (1 hour before start until event ends)
                                                const eventStartDate = new Date(selectedRegistration.event_detail.start_date);
                                                const eventEndDate = new Date(selectedRegistration.event_detail.end_date || selectedRegistration.event_detail.start_date);
                                                const now = new Date();
                                                const oneHourBeforeStart = new Date(eventStartDate.getTime() - 60 * 60 * 1000); // 1 hour in milliseconds
                                                
                                                const isTooEarly = now < oneHourBeforeStart;
                                                const isTooLate = now > eventEndDate;
                                                const canCheckIn = !isTooEarly && !isTooLate;
                                                
                                                return (
                                                    <>
                                                        {/* Swipe to Check In */}
                                                        {checkInState === 'IDLE' && (
                                                            <div className="w-full max-w-md space-y-3">
                                                                {isTooEarly ? (
                                                                    <div className="p-3 bg-gray-50 text-gray-600 text-xs rounded-lg border border-gray-200 text-center">
                                                                        ⏰ Check-in will be available starting {format(oneHourBeforeStart, 'MMM d, yyyy • h:mm a')}
                                                                    </div>
                                                                ) : isTooLate ? (
                                                                    <div className="p-3 bg-gray-50 text-gray-600 text-xs rounded-lg border border-gray-200 text-center">
                                                                        ⏰ This event has ended. Check-in is no longer available.
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg border border-yellow-100 text-center">
                                                                        ⚠️ Show this screen to staff and swipe to check in when you arrive.
                                                                    </div>
                                                                )}
                                                                <SwipeButton 
                                                                    onSuccess={handleCheckIn} 
                                                                    text="Swipe to Check In"
                                                                    successText="Checked In!"
                                                                    color="green"
                                                                    disabled={!canCheckIn}
                                                                />
                                                            </div>
                                                        )}

                                                    {checkInState === 'SUCCESS' && (
                                                        <div className="w-full max-w-md py-4 animate-in fade-in zoom-in duration-300">
                                                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                                                <CheckCircle className="w-8 h-8" />
                                                            </div>
                                                            <h4 className="text-lg font-bold text-green-700 text-center">Checked In!</h4>
                                                            <p className="text-xs text-gray-500 mt-1 text-center">{checkInMessage}</p>
                                                        </div>
                                                    )}

                                                    {checkInState === 'ERROR' && (
                                                        <div className="w-full max-w-md py-2 text-red-600">
                                                            <p className="text-sm font-bold text-center">Error!</p>
                                                            <p className="text-xs text-center mt-1">{checkInMessage}</p>
                                                            <button 
                                                                onClick={() => {
                                                                    setCheckInState('IDLE');
                                                                    setCheckInMessage('');
                                                                }}
                                                                className="mt-2 text-xs underline w-full text-center block"
                                                            >
                                                                Try Again
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )})()}
                                        </div>
                                    ) : selectedRegistration.status === 'ATTENDED' && activeTab === 'history' ? (
                                        <div className="bg-gradient-to-br from-gray-50 to-green-50/30 rounded-xl p-8 flex flex-col items-center justify-center border-2 border-dashed border-green-200">
                                            <div className="text-center">
                                                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                                                <div className="mt-4 flex items-center justify-center gap-2 text-green-600 font-bold text-lg">
                                                    <span>Event Attended</span>
                                                </div>
                                                {selectedRegistration.ticket && (
                                                    <div className="mt-4">
                                                        <span className="text-sm font-mono text-gray-600 tracking-wider bg-white px-4 py-2 rounded-lg border border-gray-200">
                                                            Ticket: {selectedRegistration.ticket.ticket_code}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : activeTab === 'history' ? (
                                        <div className="bg-gradient-to-br from-gray-50 to-gray-50/30 rounded-xl p-8 flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
                                            <div className="text-center">
                                                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                                <div className="mt-4 flex items-center justify-center gap-2 text-gray-600 font-bold text-lg">
                                                    <span>Past Event</span>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-2">
                                                    This event has ended.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`rounded-xl p-6 text-center border-2 ${
                                            selectedRegistration.status === 'WAITLIST' 
                                                ? 'bg-orange-50 border-orange-200' 
                                                : 'bg-yellow-50 border-yellow-200'
                                        }`}>
                                            <div className="mb-3">
                                                {selectedRegistration.status === 'WAITLIST' ? (
                                                    <Clock className="w-12 h-12 text-orange-600 mx-auto" />
                                                ) : (
                                                    <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto" />
                                                )}
                                            </div>
                                            <p className={`font-bold text-lg mb-2 ${
                                                selectedRegistration.status === 'WAITLIST' ? 'text-orange-800' : 'text-yellow-800'
                                            }`}>
                                                {selectedRegistration.status === 'WAITLIST' ? 'You are on the Waitlist' : 
                                                 selectedRegistration.status === 'PENDING_GUARDIAN' ? 'Waiting for Guardian Approval' :
                                                 selectedRegistration.status === 'PENDING_ADMIN' ? 'Waiting for Admin Approval' :
                                                 'Pending Approval'}
                                            </p>
                                            <p className={`text-sm ${
                                                selectedRegistration.status === 'WAITLIST' ? 'text-orange-600' : 'text-yellow-600'
                                            }`}>
                                                {selectedRegistration.status === 'WAITLIST' 
                                                    ? "You'll be notified if a seat becomes available."
                                                    : "You will receive a notification if your seat is confirmed."}
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* Actions */}
                                    <div className="mt-6 pt-6 border-t flex justify-between items-center">
                                        <Link 
                                            href={`/dashboard/youth/events/${selectedRegistration.event}`} 
                                            className="text-sm text-green-600 font-semibold hover:text-green-700 flex items-center gap-1"
                                        >
                                            View Event Details →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

