'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { format, type Locale } from 'date-fns';
import { enUS, sv, da, nb, fi } from 'date-fns/locale';

import api from '@/lib/api';
import { ChevronRight, ArrowLeft, Calendar, CheckCircle, Clock, AlertCircle, Ticket, X, MapPin } from 'lucide-react';
import NavBar from '@/app/components/NavBar';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import SwipeButton from '@/app/components/ui/SwipeButton';


type TabType = 'active' | 'history';

export default function MyTicketsPage() {
    const pathname = usePathname();
    const t = useTranslations('events');
    const tSidebar = useTranslations('sidebar');
    const locale = useLocale();
    const localeMap: Record<string, Locale> = {
        en: enUS,
        sv: sv,
        da: da,
        nb: nb,
        fi: fi,
    };
    const dateLocale = localeMap[locale] || enUS;
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('active');
    const [checkInState, setCheckInState] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [checkInMessage, setCheckInMessage] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
                return <CheckCircle className="w-4 h-4 text-[var(--brand-third)]" />;
            case 'WAITLIST':
                return <Clock className="w-4 h-4 text-[var(--brand-third)]" />;
            case 'PENDING_GUARDIAN':
            case 'PENDING_ADMIN':
                return <AlertCircle className="w-4 h-4 text-[var(--brand-third)]" />;
            default:
                return <Calendar className="w-4 h-4 text-[var(--brand-light)]/40" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            APPROVED: 'bg-[var(--brand-third)] text-[var(--dark-900)]',
            WAITLIST: 'bg-[var(--brand-third)] text-[var(--dark-900)]',
            PENDING_GUARDIAN: 'bg-[var(--brand-primary)] text-[var(--dark-900)]',
            PENDING_ADMIN: 'bg-[var(--brand-purple)] text-[var(--brand-light)]',
            ATTENDED: 'bg-[var(--brand-third)] text-[var(--dark-900)]',
        };
        return (
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${styles[status] || 'bg-[var(--dark-600)] text-[var(--brand-light)]/70'}`}>
                {status === 'PENDING_GUARDIAN' ? t('pendingGuardian') :
                 status === 'PENDING_ADMIN' ? t('pendingAdmin') :
                 status === 'ATTENDED' ? t('attended') :
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
            setCheckInMessage(`${t('checkedInAt')} ${format(new Date(), 'HH:mm', { locale: dateLocale })}`);
            
            // Refresh registrations after short delay
            setTimeout(() => {
                fetchRegistrations();
            }, 2000);
        } catch (error: any) {
            console.error('Check-in failed:', error);
            setCheckInState('ERROR');
            setCheckInMessage(error.response?.data?.error || t('failedToCheckIn'));
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
        <div className="min-h-screen bg-[var(--dark-900)]">
            <NavBar 
                showBackButton={true} 
                darkMode={true}
                onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            />
            
            {/* Mobile Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300 ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsSidebarOpen(false)}
            />
            
            {/* Mobile Sidebar */}
            <aside 
                className={`fixed top-0 left-0 h-screen w-64 z-50 bg-[var(--dark-800)] transform transition-transform duration-300 md:hidden ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between p-4 border-b border-[var(--dark-600)]">
                    <h1 className="text-xl font-bold text-[var(--brand-light)]">{tSidebar('menu')}</h1>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto h-[calc(100vh-64px)]">
                    <YouthSidebar activePath={pathname} darkMode={true} />
                </div>
            </aside>

            <div className="pt-14 sm:pt-16">
                <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 relative">
                    {/* Desktop Sidebar */}
                    <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 bg-[var(--dark-900)] z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
                        <YouthSidebar activePath={pathname} darkMode={true} />
                    </aside>
                    
                    {/* Content wrapper with left margin for sidebar */}
                    <div className="md:ml-60">
                        <div className="p-0 sm:p-4 md:p-6 pb-24 md:pb-6">
                            {/* Header */}
                            <div className="px-4 sm:px-0 mb-4 sm:mb-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Ticket className="w-7 h-7 text-[var(--brand-primary)]" />
                                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] font-heading">{t('myTickets')}</h1>
                                </div>
                                <p className="text-sm text-[var(--brand-light)]/60 pl-10">
                                    {selectedRegistration 
                                        ? `${t('ticketFor')} ${selectedRegistration.event_detail?.title || t('eventBadge')}`
                                        : t('selectEventToViewTicket')}
                                </p>
                            </div>

                            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                                {/* Ticket List Sidebar */}
                                <aside className="w-full lg:w-72 flex-shrink-0 space-y-4">
                                    {/* Tabs */}
                                    <div className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
                                        <div className="flex">
                                            <button
                                                onClick={() => setActiveTab('active')}
                                                className={`flex-1 px-4 py-3 font-bold text-sm transition-all ${
                                                    activeTab === 'active'
                                                        ? 'bg-[var(--brand-third)] text-[var(--dark-900)]'
                                                        : 'bg-[var(--dark-800)] text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)]'
                                                }`}
                                            >
                                                {t('active')} ({activeEvents.length})
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('history')}
                                                className={`flex-1 px-4 py-3 font-bold text-sm transition-all ${
                                                    activeTab === 'history'
                                                        ? 'bg-[var(--brand-purple)] text-[var(--brand-light)]'
                                                        : 'bg-[var(--dark-800)] text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)]'
                                                }`}
                                            >
                                                {t('history')} ({historyEvents.length})
                                            </button>
                                        </div>
                                    </div>

                                    {/* Events List */}
                                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-3 sm:p-4">
                                        <h2 className="text-lg font-bold text-[var(--brand-light)] mb-3 font-heading">
                                            {activeTab === 'active' ? t('activeTickets') : t('ticketHistory')}
                                        </h2>
                                        {loading ? (
                                            <div className="flex justify-center py-8">
                                                <div className="w-8 h-8 border-4 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
                                            </div>
                                        ) : currentEvents.length === 0 ? (
                                            <div className="text-center py-8 bg-[var(--dark-700)] rounded-xl border border-dashed border-[var(--dark-500)]">
                                                <Ticket className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-3" />
                                                <p className="text-sm text-[var(--brand-light)]/50 font-semibold">
                                                    {activeTab === 'active' 
                                                        ? t('noActiveTickets')
                                                        : t('noTicketHistory')}
                                                </p>
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
                                                            className={`w-full text-left p-3 rounded-xl border transition-all ${
                                                                isSelected
                                                                    ? activeTab === 'active'
                                                                        ? 'bg-[var(--brand-third)]/10 border-[var(--brand-third)]'
                                                                        : 'bg-[var(--brand-purple)]/10 border-[var(--brand-purple)]'
                                                                    : 'bg-[var(--dark-700)] border-[var(--dark-600)] hover:bg-[var(--dark-600)] hover:border-[var(--dark-500)]'
                                                            }`}
                                                        >
                                                            <div className="flex items-start gap-2 mb-1">
                                                                {activeTab === 'active' 
                                                                    ? getStatusIcon(reg.status)
                                                                    : isAttended 
                                                                        ? <CheckCircle className="w-4 h-4 text-[var(--brand-third)]" />
                                                                        : <Calendar className="w-4 h-4 text-[var(--brand-light)]/40" />
                                                                }
                                                                <div className="flex-1 min-w-0">
                                                                    <h3 className={`font-bold text-sm line-clamp-2 ${isSelected ? 'text-[var(--brand-light)]' : 'text-[var(--brand-light)]/80'}`}>
                                                                        {event.title}
                                                                    </h3>
                                                                </div>
                                                            </div>
                                                            <div className="text-xs text-[var(--brand-light)]/50 mt-1 font-medium">
                                                                {format(new Date(event.start_date), 'MMM d, HH:mm', { locale: dateLocale })}
                                                                {isPast && activeTab === 'history' && (
                                                                    <span className="ml-2 text-[var(--brand-light)]/30">• {t('past')}</span>
                                                                )}
                                                            </div>
                                                            <div className="mt-2">
                                                                {activeTab === 'active' ? (
                                                                    getStatusBadge(reg.status)
                                                                ) : (
                                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                                        isAttended 
                                                                            ? 'bg-[var(--brand-third)] text-[var(--dark-900)]'
                                                                            : 'bg-[var(--dark-600)] text-[var(--brand-light)]/70'
                                                                    }`}>
                                                                        {isAttended ? t('attended') : t('pastEvent')}
                                                                    </span>
                                                                )}
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
                                    {loading ? (
                                        <div className="text-center py-12 bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)]">
                                            <div className="w-12 h-12 border-4 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
                                            <p className="text-[var(--brand-light)]/50 font-semibold">{t('loadingTickets')}</p>
                                        </div>
                                    ) : !selectedRegistration ? (
                                        <div className="text-center py-12 bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)]">
                                            <div className="w-20 h-20 bg-[var(--dark-700)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <Ticket className="w-10 h-10 text-[var(--brand-light)]/30" />
                                            </div>
                                            <p className="text-[var(--brand-light)] mb-2 font-bold text-lg font-heading">{t('noTicketSelected')}</p>
                                            <p className="text-sm text-[var(--brand-light)]/60 mb-4">
                                                {t('selectEventFrom')} {activeTab === 'active' ? t('activeTickets').toLowerCase() : t('history').toLowerCase()} {t('toViewYourTicket')}
                                            </p>
                                            {currentEvents.length === 0 && (
                                                <Link 
                                                    href="/dashboard/youth/events" 
                                                    className="inline-flex items-center gap-2 bg-[var(--brand-primary)] text-[var(--dark-900)] px-5 py-2.5 rounded-xl font-bold hover:bg-[var(--brand-primary)]/90 transition-all"
                                                >
                                                    {t('browseEvents')} →
                                                </Link>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                                            {/* Header Color Strip */}
                                            <div className={`h-2 ${
                                                selectedRegistration.status === 'APPROVED' 
                                                    ? 'bg-[var(--brand-third)]' 
                                                    : selectedRegistration.status === 'WAITLIST' 
                                                        ? 'bg-[var(--brand-third)]' 
                                                        : selectedRegistration.status === 'ATTENDED'
                                                            ? 'bg-[var(--brand-third)]'
                                                            : 'bg-[var(--brand-primary)]'
                                            }`} />
                                            
                                            <div className="p-4 sm:p-6">
                                                <div className="mb-6">
                                                    <h2 className="font-bold text-xl sm:text-2xl mb-3 text-[var(--brand-light)] font-heading">
                                                        {selectedRegistration.event_detail?.title || t('eventBadge')}
                                                    </h2>
                                                    <div className="flex flex-col gap-2 text-sm">
                                                        <div className="flex items-center gap-2 bg-[var(--dark-700)] p-3 rounded-xl border border-[var(--dark-600)]">
                                                            <Calendar className="w-4 h-4 text-[var(--brand-third)]" />
                                                            <span className="font-bold text-[var(--brand-light)]">
                                                                {format(new Date(selectedRegistration.event_detail.start_date), 'EEEE, MMMM d, yyyy • HH:mm', { locale: dateLocale })}
                                                            </span>
                                                        </div>
                                                        {selectedRegistration.event_detail?.location_name && (
                                                            <div className="flex items-center gap-2 bg-[var(--dark-700)] p-3 rounded-xl border border-[var(--dark-600)]">
                                                                <MapPin className="w-4 h-4 text-[var(--brand-primary)]" />
                                                                <span className="font-semibold text-[var(--brand-light)]/80">{selectedRegistration.event_detail.location_name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Ticket Area */}
                                                {selectedRegistration.status === 'APPROVED' && selectedRegistration.ticket && activeTab === 'active' ? (
                                                    <div className="bg-[var(--brand-third)]/10 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center border border-dashed border-[var(--brand-third)]/50">
                                                        <div className="text-center mb-6">
                                                            <div className="mb-4 flex items-center justify-center gap-2 text-[var(--brand-third)] font-bold text-lg">
                                                                <CheckCircle className="w-6 h-6" />
                                                                <span className="font-heading">{t('confirmedSeat')}</span>
                                                            </div>
                                                            <div className="bg-[var(--dark-700)] px-6 py-4 rounded-xl border-2 border-[var(--brand-third)] mb-4">
                                                                <span className="text-lg sm:text-xl font-mono text-[var(--brand-light)] tracking-wider font-bold">
                                                                    {selectedRegistration.ticket.ticket_code}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Check if already checked in */}
                                                        {selectedRegistration.ticket.checked_in_at ? (
                                                            <div className="w-full max-w-md py-4">
                                                                <div className="w-20 h-20 bg-[var(--brand-third)] text-[var(--dark-900)] rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                                    <CheckCircle className="w-10 h-10" />
                                                                </div>
                                                                <h4 className="text-lg font-bold text-[var(--brand-third)] text-center font-heading">{t('alreadyCheckedIn')}</h4>
                                                                <p className="text-xs text-[var(--brand-light)]/60 mt-2 text-center font-semibold bg-[var(--dark-700)] px-3 py-2 rounded-lg inline-block">
                                                                    {format(new Date(selectedRegistration.ticket.checked_in_at), 'MMM d, yyyy • HH:mm', { locale: dateLocale })}
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
                                                                                <div className="p-3 bg-[var(--dark-700)] text-[var(--brand-light)]/70 text-xs rounded-xl border border-[var(--dark-600)] text-center font-semibold">
                                                                                    ⏰ {t('checkInOpens')} {format(oneHourBeforeStart, 'MMM d • HH:mm', { locale: dateLocale })}
                                                                                </div>
                                                                            ) : isTooLate ? (
                                                                                <div className="p-3 bg-[var(--dark-700)] text-[var(--brand-light)]/70 text-xs rounded-xl border border-[var(--dark-600)] text-center font-semibold">
                                                                                    ⏰ {t('eventEndedCheckInClosed')}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="p-3 bg-[var(--brand-third)]/10 text-[var(--brand-third)] text-xs rounded-xl border border-[var(--brand-third)]/30 text-center font-bold">
                                                                                    ⚠️ {t('showToStaffAndSwipe')}
                                                                                </div>
                                                                            )}
                                                                            <SwipeButton 
                                                                                onSuccess={handleCheckIn} 
                                                                                text={t('swipeToCheckIn')}
                                                                                successText={t('checkedIn')}
                                                                                color="green"
                                                                                disabled={!canCheckIn}
                                                                            />
                                                                        </div>
                                                                    )}

                                                                    {checkInState === 'SUCCESS' && (
                                                                        <div className="w-full max-w-md py-4 animate-in fade-in zoom-in duration-300">
                                                                            <div className="w-20 h-20 bg-[var(--brand-third)] text-[var(--dark-900)] rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                                                <CheckCircle className="w-10 h-10" />
                                                                            </div>
                                                                            <h4 className="text-lg font-bold text-[var(--brand-third)] text-center font-heading">{t('checkedIn')}</h4>
                                                                            <p className="text-xs text-[var(--brand-light)]/60 mt-2 text-center font-semibold bg-[var(--dark-700)] px-3 py-2 rounded-lg inline-block">{checkInMessage}</p>
                                                                        </div>
                                                                    )}

                                                                    {checkInState === 'ERROR' && (
                                                                        <div className="w-full max-w-md py-4">
                                                                            <div className="w-20 h-20 bg-[var(--brand-red)] text-white rounded-2xl flex items-center justify-center mx-auto mb-3">
                                                                                <AlertCircle className="w-10 h-10" />
                                                                            </div>
                                                                            <p className="text-lg font-bold text-[var(--brand-red)] text-center mb-2 font-heading">{t('error')}</p>
                                                                            <p className="text-sm text-[var(--brand-light)]/60 text-center mb-3 bg-[var(--brand-red)]/10 px-3 py-2 rounded-lg">{checkInMessage}</p>
                                                                            <button 
                                                                                onClick={() => {
                                                                                    setCheckInState('IDLE');
                                                                                    setCheckInMessage('');
                                                                                }}
                                                                                className="bg-[var(--brand-primary)] text-[var(--dark-900)] px-5 py-2.5 rounded-xl font-bold hover:bg-[var(--brand-primary)]/90 transition-all mx-auto block"
                                                                            >
                                                                                {t('tryAgain')}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )})()}
                                                    </div>
                                                ) : selectedRegistration.status === 'ATTENDED' && activeTab === 'history' ? (
                                                    <div className="bg-[var(--brand-third)]/10 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center border border-dashed border-[var(--brand-third)]/50">
                                                        <div className="text-center">
                                                            <div className="w-20 h-20 bg-[var(--brand-third)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                                <CheckCircle className="w-10 h-10 text-[var(--dark-900)]" />
                                                            </div>
                                                            <div className="mt-2 text-[var(--brand-third)] font-bold text-xl font-heading">
                                                                {t('eventAttended')}
                                                            </div>
                                                            {selectedRegistration.ticket && (
                                                                <div className="mt-4">
                                                                    <span className="text-sm font-mono text-[var(--brand-light)] tracking-wider bg-[var(--dark-700)] px-4 py-2.5 rounded-xl border border-[var(--brand-third)] font-bold inline-block">
                                                                        {selectedRegistration.ticket.ticket_code}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : activeTab === 'history' ? (
                                                    <div className="bg-[var(--dark-700)] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center border border-dashed border-[var(--dark-500)]">
                                                        <div className="text-center">
                                                            <div className="w-20 h-20 bg-[var(--dark-600)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                                <Calendar className="w-10 h-10 text-[var(--brand-light)]/40" />
                                                            </div>
                                                            <div className="mt-2 text-[var(--brand-light)] font-bold text-xl font-heading">
                                                                {t('pastEvent')}
                                                            </div>
                                                            <p className="text-sm text-[var(--brand-light)]/60 mt-2 font-semibold">
                                                                {t('eventHasEnded')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={`rounded-2xl p-6 sm:p-8 text-center border ${
                                                        selectedRegistration.status === 'WAITLIST' 
                                                            ? 'bg-[var(--brand-third)]/10 border-[var(--brand-third)]/30' 
                                                            : 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30'
                                                    }`}>
                                                        <div className="mb-4">
                                                            {selectedRegistration.status === 'WAITLIST' ? (
                                                                <div className="w-20 h-20 bg-[var(--brand-third)] rounded-2xl flex items-center justify-center mx-auto">
                                                                    <Clock className="w-10 h-10 text-[var(--dark-900)]" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-20 h-20 bg-[var(--brand-primary)] rounded-2xl flex items-center justify-center mx-auto">
                                                                    <AlertCircle className="w-10 h-10 text-[var(--dark-900)]" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className={`font-bold text-xl mb-3 font-heading ${
                                                            selectedRegistration.status === 'WAITLIST' ? 'text-[var(--brand-third)]' : 'text-[var(--brand-primary)]'
                                                        }`}>
                                                            {selectedRegistration.status === 'WAITLIST' ? t('youAreOnWaitlist') : 
                                                             selectedRegistration.status === 'PENDING_GUARDIAN' ? t('waitingForGuardianApproval') :
                                                             selectedRegistration.status === 'PENDING_ADMIN' ? t('waitingForAdminApproval') :
                                                             t('pendingApproval')}
                                                        </p>
                                                        <p className={`text-sm font-semibold bg-[var(--dark-700)] px-4 py-2 rounded-xl inline-block ${
                                                            selectedRegistration.status === 'WAITLIST' ? 'text-[var(--brand-third)]' : 'text-[var(--brand-primary)]'
                                                        }`}>
                                                            {selectedRegistration.status === 'WAITLIST' 
                                                                ? t('notifiedIfSeatAvailable')
                                                                : t('notifiedIfSeatConfirmed')}
                                                        </p>
                                                    </div>
                                                )}
                                                
                                                {/* Actions */}
                                                <div className="mt-6 pt-6 border-t border-[var(--dark-600)]">
                                                    <Link 
                                                        href={`/dashboard/youth/events/${selectedRegistration.event}`} 
                                                        className="inline-flex items-center gap-2 bg-[var(--brand-primary)] text-[var(--dark-900)] px-5 py-2.5 rounded-xl font-bold hover:bg-[var(--brand-primary)]/90 transition-all"
                                                    >
                                                        {t('viewEventDetails')} →
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </main>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
