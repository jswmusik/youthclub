'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
    Edit, BarChart3, ChevronDown, ChevronUp, CheckCircle, Clock, Calendar, 
    MapPin, Users, Building, Settings, Target, Bell, Ticket, Eye, User, 
    CalendarDays, Globe, Shield, FileText, ChevronRight, Sparkles
} from 'lucide-react';
import api from '@/lib/api';
import { sanitizeHtml } from '@/lib/sanitize';
import ParticipantManager from '@/app/components/events/ParticipantManager';
import { Event } from '@/types/event';
import { getMediaUrl, getInitials } from '@/app/utils';
import { format } from 'date-fns';
import BackButton from '@/app/components/BackButton';

export default function EventDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [event, setEvent] = useState<Event | null>(null);
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PARTICIPANTS' | 'CHECKIN'>('PARTICIPANTS');
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await api.get(`/events/${params.id}/`);
                const eventData = res.data;
                setEvent(eventData);
            } catch (error) {
                console.error(error);
            }
        };
        const fetchRegistrations = async () => {
            try {
                setLoading(true);
                let allRegistrations: any[] = [];
                let page = 1;
                const pageSize = 100;
                const maxPages = 100;
                
                while (page <= maxPages) {
                    const res: any = await api.get(`/registrations/?event=${params.id}&page=${page}&page_size=${pageSize}`);
                    const responseData: any = res?.data;
                    
                    if (!responseData) break;
                    
                    let pageRegistrations: any[] = [];
                    
                    if (Array.isArray(responseData)) {
                        pageRegistrations = responseData;
                        allRegistrations = [...allRegistrations, ...pageRegistrations];
                        break;
                    } else if (responseData.results && Array.isArray(responseData.results)) {
                        pageRegistrations = responseData.results;
                        allRegistrations = [...allRegistrations, ...pageRegistrations];
                        
                        const hasNext = responseData.next !== null && responseData.next !== undefined;
                        const gotEmptyPage = pageRegistrations.length === 0;
                        
                        if (!hasNext || gotEmptyPage) break;
                        page++;
                    } else {
                        break;
                    }
                }
                
                setRegistrations(allRegistrations);
            } catch (error) {
                console.error('Error fetching registrations:', error);
            } finally {
                setLoading(false);
            }
        };
        
        if (params.id) {
            fetchEvent();
            fetchRegistrations();
        }
    }, [params.id]);

    useEffect(() => {
        if (event && !event.enable_tickets && activeTab === 'CHECKIN') {
            setActiveTab('PARTICIPANTS');
        }
    }, [event, activeTab]);

    if (!event) {
        return (
            <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[var(--brand-light)]/60">Loading event details...</p>
                </div>
            </div>
        );
    }

    // Calculate analytics
    const confirmedCount = registrations.length > 0 
        ? registrations.filter((r: any) => r.status === 'APPROVED' || r.status === 'ATTENDED').length
        : event.confirmed_participants_count || 0;
    const waitlistCount = registrations.length > 0
        ? registrations.filter((r: any) => r.status === 'WAITLIST').length
        : event.waitlist_count || 0;
    
    const demographics = {
        male: registrations.filter((r: any) => r.user_detail?.legal_gender === 'MALE').length,
        female: registrations.filter((r: any) => r.user_detail?.legal_gender === 'FEMALE').length,
        other: registrations.filter((r: any) => {
            const gender = r.user_detail?.legal_gender;
            return gender && gender !== 'MALE' && gender !== 'FEMALE';
        }).length,
    };

    const buildBackUrl = () => {
        const urlParams = new URLSearchParams();
        const page = searchParams.get('page');
        const search = searchParams.get('search');
        const status = searchParams.get('status');
        const recurring = searchParams.get('recurring');
        const club = searchParams.get('club');
        
        urlParams.set('page', page || '1');
        if (search) urlParams.set('search', search);
        if (status) urlParams.set('status', status);
        if (recurring) urlParams.set('recurring', recurring);
        if (club) urlParams.set('club', club);
        
        const queryString = urlParams.toString();
        return `/admin/municipality/events?${queryString}`;
    };

    const getStatusBadgeClasses = (status: string) => {
        switch (status) {
            case 'PUBLISHED': return 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30';
            case 'DRAFT': return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
            case 'SCHEDULED': return 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30';
            case 'CANCELLED': return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30';
            default: return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
        }
    };

    return (
        <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8 px-0">
            <div className="space-y-0 sm:space-y-6 px-0 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                
                {/* Navigation Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-0 mb-6">
                    <BackButton href={buildBackUrl()} translationKey="backToEvents" />
                    <Link 
                        href={`/admin/municipality/events/edit/${event.id}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all text-sm shadow-lg shadow-[var(--brand-primary)]/20"
                    >
                        <Edit className="h-4 w-4" /> Edit Event
                    </Link>
                </div>

                {/* Hero Card */}
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                    {/* Header Banner with Background Image */}
                    <div 
                        className="relative h-36 sm:h-56 bg-gradient-to-br from-[var(--brand-purple)]/30 via-[var(--dark-700)] to-[var(--brand-primary)]/20"
                        style={{
                            backgroundImage: event.cover_image ? `url(${getMediaUrl(event.cover_image)})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}
                    >
                        {event.cover_image && <div className="absolute inset-0 bg-[var(--dark-900)]/50" />}
                        
                        {!event.cover_image && (
                            <div className="absolute inset-0 opacity-30">
                                <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
                                <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-[var(--brand-purple)]/20 blur-2xl" />
                            </div>
                        )}
                        
                        {/* Status Badge - Top Right */}
                        <div className={`absolute top-4 right-4 px-4 py-2 rounded-xl backdrop-blur-sm border flex items-center gap-2 ${getStatusBadgeClasses(event.status)}`}>
                            {event.status === 'PUBLISHED' && <CheckCircle className="w-4 h-4" />}
                            {event.status === 'SCHEDULED' && <Clock className="w-4 h-4" />}
                            <span className="text-sm font-semibold">{event.status}</span>
                        </div>

                        {/* Recurring Badge - Top Left */}
                        {event.is_recurring && (
                            <div className="absolute top-4 left-4 px-4 py-2 rounded-xl backdrop-blur-sm bg-[var(--brand-purple)]/20 border border-[var(--brand-purple)]/30">
                                <span className="text-sm text-[var(--brand-purple)] font-medium flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4" /> Recurring Event
                                </span>
                            </div>
                        )}
                    </div>
                    
                    {/* Title Section */}
                    <div className="relative z-10 px-4 sm:px-6 pb-6 -mt-14 sm:-mt-16">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
                            {/* Icon */}
                            <div className="relative z-20 w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-[var(--dark-800)] shadow-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center overflow-hidden flex-shrink-0">
                                <CalendarDays className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                            </div>

                            {/* Title & Info */}
                            <div className="flex-1 space-y-2 pt-2">
                                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                                    {event.title}
                                </h1>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2 text-[var(--brand-light)]/50 text-sm">
                                        <Calendar className="h-4 w-4" />
                                        <span>{new Date(event.start_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[var(--brand-light)]/50 text-sm">
                                        <MapPin className="h-4 w-4" />
                                        <span>{event.location_name}</span>
                                    </div>
                                    {event.is_global && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]">
                                            <Globe className="w-3 h-3" /> Global
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Analytics Dashboard */}
                {!loading && (
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                        <button 
                            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--dark-700)]/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                    <BarChart3 className="h-5 w-5 text-white" />
                                </div>
                                <h2 className="text-lg font-semibold text-[var(--brand-light)]">Analytics Dashboard</h2>
                            </div>
                            <ChevronUp className={`w-5 h-5 text-[var(--brand-light)]/50 transition-transform ${analyticsExpanded ? '' : 'rotate-180'}`} />
                        </button>
                        
                        {analyticsExpanded && (
                            <div className="px-6 pb-6 pt-2">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Confirmed */}
                                    <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--brand-primary)]/30 hover:border-[var(--brand-primary)]/50 transition-all">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center">
                                                <CheckCircle className="h-5 w-5 text-[var(--brand-primary)]" />
                                            </div>
                                            <span className="text-sm font-medium text-[var(--brand-light)]/70">Confirmed</span>
                                        </div>
                                        <div className="text-3xl font-bold text-[var(--brand-light)]">{confirmedCount}</div>
                                        <p className="text-xs text-[var(--brand-light)]/50 mt-1">of {event.max_seats || 'Unlimited'} seats</p>
                                    </div>

                                    {/* Waitlist */}
                                    <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--brand-blue)]/30 hover:border-[var(--brand-blue)]/50 transition-all">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center">
                                                <Clock className="h-5 w-5 text-[var(--brand-blue)]" />
                                            </div>
                                            <span className="text-sm font-medium text-[var(--brand-light)]/70">Waitlist</span>
                                        </div>
                                        <div className="text-3xl font-bold text-[var(--brand-light)]">{waitlistCount}</div>
                                        <p className="text-xs text-[var(--brand-light)]/50 mt-1">people waiting</p>
                                    </div>

                                    {/* Demographics */}
                                    <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--brand-green)]/30 hover:border-[var(--brand-green)]/50 transition-all">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-[var(--brand-green)]/20 flex items-center justify-center">
                                                <Users className="h-5 w-5 text-[var(--brand-green)]" />
                                            </div>
                                            <span className="text-sm font-medium text-[var(--brand-light)]/70">Demographics</span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--brand-light)]/50">Male:</span>
                                                <span className="font-semibold text-[var(--brand-light)]">{demographics.male}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--brand-light)]/50">Female:</span>
                                                <span className="font-semibold text-[var(--brand-light)]">{demographics.female}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--brand-light)]/50">Other:</span>
                                                <span className="font-semibold text-[var(--brand-light)]">{demographics.other}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Target Groups */}
                                    <div className="p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--brand-pink)]/30 hover:border-[var(--brand-pink)]/50 transition-all">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-[var(--brand-pink)]/20 flex items-center justify-center">
                                                <Target className="h-5 w-5 text-[var(--brand-pink)]" />
                                            </div>
                                            <span className="text-sm font-medium text-[var(--brand-light)]/70">Target Groups</span>
                                        </div>
                                        {event.target_groups_details && event.target_groups_details.length > 0 ? (
                                            <div className="space-y-1">
                                                {event.target_groups_details.slice(0, 3).map((group: any) => (
                                                    <div key={group.id} className="text-sm font-medium text-[var(--brand-light)] truncate">
                                                        {group.name}
                                                    </div>
                                                ))}
                                                {event.target_groups_details.length > 3 && (
                                                    <div className="text-xs text-[var(--brand-light)]/50">
                                                        +{event.target_groups_details.length - 3} more
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-[var(--brand-light)]/50">No target groups</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                    <div className="flex border-b border-[var(--dark-600)]">
                        <button 
                            onClick={() => setActiveTab('PARTICIPANTS')}
                            className={`flex-1 sm:flex-none px-6 py-4 text-sm font-semibold transition-all ${
                                activeTab === 'PARTICIPANTS' 
                                    ? 'text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)] bg-[var(--dark-700)]/30' 
                                    : 'text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)]/20'
                            }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <Users className="w-4 h-4" />
                                <span className="hidden sm:inline">Participants</span>
                            </span>
                        </button>
                        {event.enable_tickets && (
                            <button 
                                onClick={() => setActiveTab('CHECKIN')}
                                className={`flex-1 sm:flex-none px-6 py-4 text-sm font-semibold transition-all ${
                                    activeTab === 'CHECKIN' 
                                        ? 'text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)] bg-[var(--dark-700)]/30' 
                                        : 'text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)]/20'
                                }`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <Ticket className="w-4 h-4" />
                                    <span className="hidden sm:inline">Check-in</span>
                                </span>
                            </button>
                        )}
                        <button 
                            onClick={() => setActiveTab('OVERVIEW')}
                            className={`flex-1 sm:flex-none px-6 py-4 text-sm font-semibold transition-all ${
                                activeTab === 'OVERVIEW' 
                                    ? 'text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)] bg-[var(--dark-700)]/30' 
                                    : 'text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-700)]/20'
                            }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <Eye className="w-4 h-4" />
                                <span className="hidden sm:inline">Overview</span>
                            </span>
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4 sm:p-6">
                        {activeTab === 'PARTICIPANTS' && (
                            <ParticipantManager eventId={event.id} />
                        )}

                        {activeTab === 'CHECKIN' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-[var(--brand-light)]">Checked-In Members</h3>
                                    <span className="text-sm text-[var(--brand-light)]/50">
                                        {registrations.filter((r: any) => r.status === 'ATTENDED' || r.ticket?.checked_in_at).length} checked in
                                    </span>
                                </div>

                                {loading ? (
                                    <div className="py-12 text-center text-[var(--brand-light)]/50">
                                        Loading check-ins...
                                    </div>
                                ) : (() => {
                                    const checkedInRegistrations = registrations.filter((r: any) => 
                                        r.status === 'ATTENDED' || r.ticket?.checked_in_at
                                    ).sort((a: any, b: any) => {
                                        const timeA = a.ticket?.checked_in_at ? new Date(a.ticket.checked_in_at).getTime() : 0;
                                        const timeB = b.ticket?.checked_in_at ? new Date(b.ticket.checked_in_at).getTime() : 0;
                                        return timeB - timeA;
                                    });

                                    if (checkedInRegistrations.length === 0) {
                                        return (
                                            <div className="py-16 text-center">
                                                <Clock className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-4" />
                                                <p className="font-medium text-[var(--brand-light)] mb-1">No check-ins yet</p>
                                                <p className="text-sm text-[var(--brand-light)]/50">Members will appear here once they check in.</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-3">
                                            {checkedInRegistrations.map((reg: any) => {
                                                const checkInTime = reg.ticket?.checked_in_at 
                                                    ? new Date(reg.ticket.checked_in_at)
                                                    : null;
                                                
                                                return (
                                                    <div key={reg.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--dark-700)]/50 border border-[var(--dark-500)]">
                                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                                                            {reg.user_detail?.avatar ? (
                                                                <img src={getMediaUrl(reg.user_detail.avatar) || ''} alt="" className="w-full h-full object-cover rounded-xl" />
                                                            ) : (
                                                                <span className="text-white font-bold">
                                                                    {getInitials(reg.user_detail?.first_name, reg.user_detail?.last_name)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-semibold text-[var(--brand-light)]">
                                                                {reg.user_detail?.first_name} {reg.user_detail?.last_name}
                                                            </div>
                                                            <div className="text-xs text-[var(--brand-light)]/50">{reg.user_detail?.email}</div>
                                                        </div>
                                                        <div className="text-right hidden sm:block">
                                                            <div className="text-xs text-[var(--brand-light)]/50 mb-1">Ticket</div>
                                                            <code className="text-xs bg-[var(--dark-600)] px-2 py-1 rounded text-[var(--brand-light)]/70">
                                                                {reg.ticket?.ticket_code || 'N/A'}
                                                            </code>
                                                        </div>
                                                        <div className="text-right hidden sm:block">
                                                            {checkInTime && (
                                                                <>
                                                                    <div className="text-xs text-[var(--brand-light)]/50">{format(checkInTime, 'MMM d')}</div>
                                                                    <div className="text-xs text-[var(--brand-light)]/70">{format(checkInTime, 'h:mm a')}</div>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand-green)]/20 text-[var(--brand-green)] text-xs font-medium">
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            <span className="hidden sm:inline">Checked In</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {activeTab === 'OVERVIEW' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Main Column */}
                                <div className="lg:col-span-2 space-y-6">
                                    
                                    {/* Basic Information */}
                                    <div className="bg-[var(--dark-700)]/50 rounded-xl border border-[var(--dark-500)] overflow-hidden">
                                        <div className="px-5 py-4 border-b border-[var(--dark-500)] bg-[var(--dark-600)]/30 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center">
                                                <FileText className="w-4 h-4 text-[var(--brand-primary)]" />
                                            </div>
                                            <h3 className="font-semibold text-[var(--brand-light)]">Basic Information</h3>
                                        </div>
                                        <div className="p-5 space-y-4">
                                            <div>
                                                <label className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1 block">Title</label>
                                                <p className="text-lg font-semibold text-[var(--brand-light)]">{event.title}</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1 block">Description</label>
                                                <div className="prose prose-invert prose-sm max-w-none text-[var(--brand-light)]/80" dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description) }} />
                                            </div>
                                            {event.cost !== null && event.cost !== undefined && (
                                                <div>
                                                    <label className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1 block">Cost</label>
                                                    <p className="text-lg font-semibold text-[var(--brand-light)]">
                                                        {parseFloat(event.cost.toString()) === 0 ? 'Free' : `$${parseFloat(event.cost.toString()).toFixed(2)}`}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Date & Time */}
                                    <div className="bg-[var(--dark-700)]/50 rounded-xl border border-[var(--dark-500)] overflow-hidden">
                                        <div className="px-5 py-4 border-b border-[var(--dark-500)] bg-[var(--dark-600)]/30 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                                                <Calendar className="w-4 h-4 text-[var(--brand-purple)]" />
                                            </div>
                                            <h3 className="font-semibold text-[var(--brand-light)]">Date & Time</h3>
                                        </div>
                                        <div className="p-5">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="p-4 rounded-xl bg-[var(--dark-600)]/50 border border-[var(--dark-500)]">
                                                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">Start</div>
                                                    <div className="text-sm text-[var(--brand-light)] font-medium">
                                                        {new Date(event.start_date).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-xs text-[var(--brand-light)]/50">
                                                        {new Date(event.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-xl bg-[var(--dark-600)]/50 border border-[var(--dark-500)]">
                                                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">End</div>
                                                    <div className="text-sm text-[var(--brand-light)] font-medium">
                                                        {new Date(event.end_date).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-xs text-[var(--brand-light)]/50">
                                                        {new Date(event.end_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </div>
                                                </div>
                                            </div>
                                            {event.is_recurring && (
                                                <div className="mt-4 p-4 rounded-xl bg-[var(--brand-purple)]/10 border border-[var(--brand-purple)]/30">
                                                    <div className="flex items-center gap-2 text-[var(--brand-purple)] text-sm font-medium mb-2">
                                                        <Sparkles className="w-4 h-4" /> Recurring Event
                                                    </div>
                                                    <div className="text-xs text-[var(--brand-light)]/60">
                                                        Pattern: {event.recurrence_pattern || 'NONE'}
                                                        {event.recurrence_end_date && (
                                                            <span> • Ends: {new Date(event.recurrence_end_date).toLocaleDateString()}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div className="bg-[var(--dark-700)]/50 rounded-xl border border-[var(--dark-500)] overflow-hidden">
                                        <div className="px-5 py-4 border-b border-[var(--dark-500)] bg-[var(--dark-600)]/30 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-peach)]/20 flex items-center justify-center">
                                                <MapPin className="w-4 h-4 text-[var(--brand-peach)]" />
                                            </div>
                                            <h3 className="font-semibold text-[var(--brand-light)]">Location</h3>
                                        </div>
                                        <div className="p-5 space-y-3">
                                            <div className="p-4 rounded-xl bg-[var(--dark-600)]/50 border border-[var(--dark-500)]">
                                                <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">Location Name</div>
                                                <div className="text-sm text-[var(--brand-light)] font-medium">{event.location_name}</div>
                                            </div>
                                            {event.address && (
                                                <div className="p-4 rounded-xl bg-[var(--dark-600)]/50 border border-[var(--dark-500)]">
                                                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">Address</div>
                                                    <div className="text-sm text-[var(--brand-light)]/70">{event.address}</div>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-xs text-[var(--brand-light)]/50">
                                                <span className={`w-2 h-2 rounded-full ${event.is_map_visible ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-500)]'}`}></span>
                                                Map {event.is_map_visible ? 'visible' : 'hidden'} on event page
                                            </div>
                                        </div>
                                    </div>

                                    {/* Registration Settings */}
                                    <div className="bg-[var(--dark-700)]/50 rounded-xl border border-[var(--dark-500)] overflow-hidden">
                                        <div className="px-5 py-4 border-b border-[var(--dark-500)] bg-[var(--dark-600)]/30 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-green)]/20 flex items-center justify-center">
                                                <Settings className="w-4 h-4 text-[var(--brand-green)]" />
                                            </div>
                                            <h3 className="font-semibold text-[var(--brand-light)]">Registration Settings</h3>
                                        </div>
                                        <div className="p-5 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-[var(--brand-light)]/70">Registration</span>
                                                <span className={`px-3 py-1 rounded-lg text-xs font-medium ${event.allow_registration ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)]' : 'bg-[var(--dark-600)] text-[var(--brand-light)]/50'}`}>
                                                    {event.allow_registration ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </div>
                                            {event.allow_registration && (
                                                <>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-4 rounded-xl bg-[var(--dark-600)]/50 border border-[var(--dark-500)]">
                                                            <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">Max Seats</div>
                                                            <div className="text-lg font-semibold text-[var(--brand-light)]">
                                                                {event.max_seats === 0 ? '∞' : event.max_seats}
                                                            </div>
                                                        </div>
                                                        <div className="p-4 rounded-xl bg-[var(--dark-600)]/50 border border-[var(--dark-500)]">
                                                            <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-1">Waitlist</div>
                                                            <div className="text-lg font-semibold text-[var(--brand-light)]">
                                                                {event.max_waitlist === 0 ? 'None' : event.max_waitlist}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2 pt-2">
                                                        <div className="flex items-center gap-2 text-sm text-[var(--brand-light)]/70">
                                                            <span className={`w-2 h-2 rounded-full ${event.requires_guardian_approval ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-500)]'}`}></span>
                                                            Guardian Approval {event.requires_guardian_approval ? 'Required' : 'Not Required'}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-[var(--brand-light)]/70">
                                                            <span className={`w-2 h-2 rounded-full ${event.requires_admin_approval ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-500)]'}`}></span>
                                                            Admin Approval {event.requires_admin_approval ? 'Required' : 'Not Required'}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Sidebar */}
                                <div className="space-y-6">
                                    
                                    {/* Organization */}
                                    <div className="bg-[var(--dark-700)]/50 rounded-xl border border-[var(--dark-500)] overflow-hidden">
                                        <div className="px-5 py-4 border-b border-[var(--dark-500)] bg-[var(--dark-600)]/30 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-third)]/20 flex items-center justify-center">
                                                <Building className="w-4 h-4 text-[var(--brand-third)]" />
                                            </div>
                                            <h3 className="font-semibold text-[var(--brand-light)]">Organization</h3>
                                        </div>
                                        <div className="p-5 space-y-3">
                                            <div className="p-3 rounded-xl bg-[var(--dark-600)]/50 border border-[var(--dark-500)]">
                                                <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">Municipality</div>
                                                <div className="text-sm text-[var(--brand-light)] font-medium">
                                                    {event.municipality_detail?.name || (typeof event.municipality === 'object' ? event.municipality.name : 'N/A')}
                                                </div>
                                            </div>
                                            {(event.club_detail || event.club) && (
                                                <div className="p-3 rounded-xl bg-[var(--dark-600)]/50 border border-[var(--dark-500)]">
                                                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-0.5">Club</div>
                                                    <div className="text-sm text-[var(--brand-light)] font-medium">
                                                        {event.club_detail?.name || (typeof event.club === 'object' ? event.club.name : 'N/A')}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Targeting */}
                                    <div className="bg-[var(--dark-700)]/50 rounded-xl border border-[var(--dark-500)] overflow-hidden">
                                        <div className="px-5 py-4 border-b border-[var(--dark-500)] bg-[var(--dark-600)]/30 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-pink)]/20 flex items-center justify-center">
                                                <Target className="w-4 h-4 text-[var(--brand-pink)]" />
                                            </div>
                                            <h3 className="font-semibold text-[var(--brand-light)]">Targeting</h3>
                                        </div>
                                        <div className="p-5 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-[var(--brand-light)]/70">Audience</span>
                                                <span className="text-sm text-[var(--brand-light)] font-medium">{event.target_audience}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-[var(--brand-light)]/70">Visibility</span>
                                                <span className={`px-3 py-1 rounded-lg text-xs font-medium ${event.is_global ? 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)]' : 'bg-[var(--dark-600)] text-[var(--brand-light)]/50'}`}>
                                                    {event.is_global ? 'Global' : 'Limited'}
                                                </span>
                                            </div>
                                            {event.target_groups_details && event.target_groups_details.length > 0 && (
                                                <div>
                                                    <div className="text-[10px] text-[var(--brand-light)]/40 uppercase font-semibold mb-2">Target Groups</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {event.target_groups_details.map((group: any) => (
                                                            <span key={group.id} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
                                                                {group.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {(event.target_min_age || event.target_max_age) && (
                                                <div className="text-sm text-[var(--brand-light)]/70">
                                                    Age: {event.target_min_age || 'Any'} - {event.target_max_age || 'Any'}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Notifications & Tickets */}
                                    <div className="bg-[var(--dark-700)]/50 rounded-xl border border-[var(--dark-500)] overflow-hidden">
                                        <div className="px-5 py-4 border-b border-[var(--dark-500)] bg-[var(--dark-600)]/30 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-blue)]/20 flex items-center justify-center">
                                                <Bell className="w-4 h-4 text-[var(--brand-blue)]" />
                                            </div>
                                            <h3 className="font-semibold text-[var(--brand-light)]">Notifications</h3>
                                        </div>
                                        <div className="p-5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-[var(--brand-light)]/70">Reminders</span>
                                                <span className={`px-3 py-1 rounded-lg text-xs font-medium ${event.send_reminders ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)]' : 'bg-[var(--dark-600)] text-[var(--brand-light)]/50'}`}>
                                                    {event.send_reminders ? 'On' : 'Off'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-[var(--brand-light)]/70">Tickets</span>
                                                <span className={`px-3 py-1 rounded-lg text-xs font-medium ${event.enable_tickets ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)]' : 'bg-[var(--dark-600)] text-[var(--brand-light)]/50'}`}>
                                                    {event.enable_tickets ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div className="bg-[var(--dark-700)]/50 rounded-xl border border-[var(--dark-500)] overflow-hidden">
                                        <div className="px-5 py-4 border-b border-[var(--dark-500)] bg-[var(--dark-600)]/30 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center">
                                                <BarChart3 className="w-4 h-4 text-[var(--brand-primary)]" />
                                            </div>
                                            <h3 className="font-semibold text-[var(--brand-light)]">Status</h3>
                                        </div>
                                        <div className="p-5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-[var(--brand-light)]/70">Status</span>
                                                <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusBadgeClasses(event.status)}`}>
                                                    {event.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-[var(--brand-light)]/70">Confirmed</span>
                                                <span className="text-sm text-[var(--brand-light)] font-semibold">{event.confirmed_participants_count}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-[var(--brand-light)]/70">Waitlist</span>
                                                <span className="text-sm text-[var(--brand-light)] font-semibold">{event.waitlist_count}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
