'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ChevronRight, ArrowLeft, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import NavBar from '@/app/components/NavBar';

export default function MyTicketsPage() {
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

    useEffect(() => {
        const fetchRegistrations = async () => {
            try {
                const res = await api.get('/registrations/');
                const allRegs = res.data.results || res.data;
                setRegistrations(allRegs);
                
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
            } finally {
                setLoading(false);
            }
        };

        fetchRegistrations();
    }, []);

    // Helper: Sort by Date (Future first)
    const sorted = [...registrations].sort((a, b) => {
        const dateA = new Date(a.event_detail?.start_date || 0).getTime();
        const dateB = new Date(b.event_detail?.start_date || 0).getTime();
        return dateA - dateB;
    });

    // Filter future events only
    const upcomingRegistrations = sorted.filter(reg => {
        if (!reg.event_detail?.start_date) return false;
        const eventDate = new Date(reg.event_detail.start_date);
        return eventDate >= new Date();
    });

    // Get unique events from registrations
    const uniqueEvents = useMemo(() => {
        const eventMap = new Map();
        upcomingRegistrations.forEach(reg => {
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
    }, [upcomingRegistrations]);

    // Get selected registration
    const selectedRegistration = useMemo(() => {
        if (!selectedEventId) return null;
        return upcomingRegistrations.find(reg => reg.event === selectedEventId);
    }, [selectedEventId, upcomingRegistrations]);

    // Auto-select first event if none selected
    useEffect(() => {
        if (!selectedEventId && uniqueEvents.length > 0) {
            setSelectedEventId(uniqueEvents[0].id);
        }
    }, [uniqueEvents, selectedEventId]);

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
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
                {status === 'PENDING_GUARDIAN' ? 'Pending Guardian' :
                 status === 'PENDING_ADMIN' ? 'Pending Admin' :
                 status}
            </span>
        );
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

                        {/* Events List */}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 mb-3">My Events</h2>
                            {loading ? (
                                <div className="text-sm text-gray-500">Loading...</div>
                            ) : uniqueEvents.length === 0 ? (
                                <div className="text-sm text-gray-500">
                                    No upcoming events
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {uniqueEvents.map((event) => {
                                        const reg = event.registration;
                                        const isSelected = selectedEventId === event.id;
                                        return (
                                            <button
                                                key={event.id}
                                                onClick={() => setSelectedEventId(event.id)}
                                                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                                    isSelected
                                                        ? 'bg-green-50 border-green-200 shadow-sm'
                                                        : 'bg-white border-gray-200 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-start gap-2 mb-1">
                                                    {getStatusIcon(reg.status)}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className={`font-semibold text-sm line-clamp-2 ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                                                            {event.title}
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {format(new Date(event.start_date), 'MMM d, HH:mm')}
                                                </div>
                                                <div className="mt-2">
                                                    {getStatusBadge(reg.status)}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
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
                                    Select an event from the sidebar to view your ticket.
                                </p>
                                {uniqueEvents.length === 0 && (
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
                                    {selectedRegistration.status === 'APPROVED' && selectedRegistration.ticket ? (
                                        <div className="bg-gradient-to-br from-gray-50 to-green-50/30 rounded-xl p-8 flex flex-col items-center justify-center border-2 border-dashed border-green-200">
                                            <div className="bg-white p-4 rounded-xl shadow-lg mb-4 border-2 border-green-100">
                                                <QRCode 
                                                    value={JSON.stringify({
                                                        type: 'EVENT_TICKET',
                                                        code: selectedRegistration.ticket.ticket_code,
                                                        regId: selectedRegistration.id
                                                    })}
                                                    size={200}
                                                />
                                            </div>
                                            <div className="text-center">
                                                <span className="text-sm font-mono text-gray-600 tracking-wider bg-white px-4 py-2 rounded-lg border border-gray-200">
                                                    {selectedRegistration.ticket.ticket_code}
                                                </span>
                                                <div className="mt-4 flex items-center justify-center gap-2 text-green-600 font-bold">
                                                    <CheckCircle className="w-5 h-5" />
                                                    <span>Confirmed Seat</span>
                                                </div>
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

