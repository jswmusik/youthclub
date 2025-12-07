'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import ParticipantManager from '@/app/components/events/ParticipantManager';
import { Event } from '@/types/event';
import { getMediaUrl, getInitials } from '@/app/utils';
import { format } from 'date-fns';
import { CheckCircle, Clock } from 'lucide-react';

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
                // Fetch all registrations for this event
                let allRegistrations: any[] = [];
                let page = 1;
                const pageSize = 100;
                const maxPages = 100;
                
                while (page <= maxPages) {
                    // Use the same endpoint as ParticipantManager
                    const res: any = await api.get(`/registrations/?event=${params.id}&page=${page}&page_size=${pageSize}`);
                    const responseData: any = res?.data;
                    
                    if (!responseData) {
                        console.log('No response data for page', page);
                        break;
                    }
                    
                    let pageRegistrations: any[] = [];
                    
                    if (Array.isArray(responseData)) {
                        pageRegistrations = responseData;
                        allRegistrations = [...allRegistrations, ...pageRegistrations];
                        console.log('Got array response, total registrations:', allRegistrations.length);
                        break;
                    } else if (responseData.results && Array.isArray(responseData.results)) {
                        pageRegistrations = responseData.results;
                        allRegistrations = [...allRegistrations, ...pageRegistrations];
                        
                        console.log(`Page ${page}: Got ${pageRegistrations.length} registrations, total: ${allRegistrations.length}`);
                        
                        const hasNext = responseData.next !== null && responseData.next !== undefined;
                        const gotEmptyPage = pageRegistrations.length === 0;
                        
                        if (!hasNext || gotEmptyPage) {
                            break;
                        }
                        
                        page++;
                    } else {
                        console.log('Unexpected response format:', responseData);
                        break;
                    }
                }
                
                console.log('Final registrations:', allRegistrations);
                console.log('Sample registration:', allRegistrations[0]);
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

    // Redirect from CHECKIN tab if tickets are disabled
    useEffect(() => {
        if (event && !event.enable_tickets && activeTab === 'CHECKIN') {
            setActiveTab('PARTICIPANTS');
        }
    }, [event, activeTab]);

    if (!event) return <div className="p-8 text-center">Loading Dashboard...</div>;

    // Calculate analytics
    // Use registrations if available, otherwise fall back to event's denormalized counts
    const confirmedCount = registrations.length > 0 
        ? registrations.filter((r: any) => r.status === 'APPROVED' || r.status === 'ATTENDED').length
        : event.confirmed_participants_count || 0;
    const waitlistCount = registrations.length > 0
        ? registrations.filter((r: any) => r.status === 'WAITLIST').length
        : event.waitlist_count || 0;
    
    // Demographics - count all registrations
    const demographics = {
        male: registrations.filter((r: any) => r.user_detail?.legal_gender === 'MALE').length,
        female: registrations.filter((r: any) => r.user_detail?.legal_gender === 'FEMALE').length,
        other: registrations.filter((r: any) => {
            const gender = r.user_detail?.legal_gender;
            return gender && gender !== 'MALE' && gender !== 'FEMALE';
        }).length,
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 p-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <Link 
                        href={(() => {
                            // Build back URL with preserved query parameters
                            const urlParams = new URLSearchParams();
                            const page = searchParams.get('page');
                            const search = searchParams.get('search');
                            const status = searchParams.get('status');
                            const recurring = searchParams.get('recurring');
                            const club = searchParams.get('club');
                            
                            // Always include page (even if it's 1) to ensure pagination state is preserved
                            urlParams.set('page', page || '1');
                            if (search) urlParams.set('search', search);
                            if (status) urlParams.set('status', status);
                            if (recurring) urlParams.set('recurring', recurring);
                            if (club) urlParams.set('club', club);
                            
                            const queryString = urlParams.toString();
                            return `/admin/municipality/events?${queryString}`;
                        })()}
                        className="text-sm text-gray-500 hover:underline mb-2 inline-block"
                    >
                        ← Back to Events
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
                    <p className="text-gray-500 flex items-center gap-2">
                        <span>{new Date(event.start_date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{event.location_name}</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link 
                        href={`/admin/municipality/events/edit/${event.id}`}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50"
                    >
                        Edit Settings
                    </Link>
                    {/* Link to Public View would go here */}
                </div>
            </div>

            {/* Analytics Dashboard */}
            {!loading && (
                <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {/* Toggle Button */}
                    <button
                        onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
                        className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-700">Analytics Dashboard</span>
                        </div>
                        <svg 
                            className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${analyticsExpanded ? 'rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Analytics Cards - Collapsible */}
                    <div 
                        className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${
                            analyticsExpanded 
                                ? 'max-h-[500px] opacity-100' 
                                : 'max-h-0 opacity-0'
                        } overflow-hidden`}
                    >
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Card 1: Confirmed */}
                            <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Confirmed</h3>
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{confirmedCount}</p>
                                <p className="text-xs text-gray-500 mt-1">of {event.max_seats || 'Unlimited'} seats</p>
                            </div>

                            {/* Card 2: Waitlist */}
                            <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-orange-300 hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Waitlist</h3>
                                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{waitlistCount}</p>
                                <p className="text-xs text-gray-500 mt-1">people waiting</p>
                            </div>

                            {/* Card 3: Demographics */}
                            <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-purple-300 hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Demographics</h3>
                                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Male:</span>
                                        <span className="font-bold text-gray-900">{demographics.male}</span>
                </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Female:</span>
                                        <span className="font-bold text-gray-900">{demographics.female}</span>
                </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Other:</span>
                                        <span className="font-bold text-gray-900">{demographics.other}</span>
                </div>
                </div>
            </div>

                            {/* Card 4: Target Groups */}
                            <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Target Groups</h3>
                                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                </div>
                                {event.target_groups_details && event.target_groups_details.length > 0 ? (
                                    <div className="space-y-1">
                                        {event.target_groups_details.slice(0, 3).map((group: any) => (
                                            <div key={group.id} className="text-sm font-medium text-gray-900 truncate">
                                                {group.name}
                                            </div>
                                        ))}
                                        {event.target_groups_details.length > 3 && (
                                            <div className="text-xs text-gray-500">
                                                +{event.target_groups_details.length - 3} more
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400">No target groups</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b flex gap-6">
                <button 
                    onClick={() => setActiveTab('PARTICIPANTS')}
                    className={`pb-3 text-sm font-bold border-b-2 transition ${
                        activeTab === 'PARTICIPANTS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                    }`}
                >
                    Participants & Applications
                </button>
                {event.enable_tickets && (
                <button 
                    onClick={() => setActiveTab('CHECKIN')}
                    className={`pb-3 text-sm font-bold border-b-2 transition ${
                        activeTab === 'CHECKIN' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                    }`}
                >
                    Check-in & Tickets
                </button>
                )}
                <button 
                    onClick={() => setActiveTab('OVERVIEW')}
                    className={`pb-3 text-sm font-bold border-b-2 transition ${
                        activeTab === 'OVERVIEW' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                    }`}
                >
                    Overview
                </button>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeTab === 'PARTICIPANTS' && (
                    <ParticipantManager eventId={event.id} />
                )}

                {activeTab === 'CHECKIN' && (
                    <div className="space-y-6">
                        {/* Check-in List */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <h2 className="text-lg font-bold text-gray-900">
                                    Checked-In Members
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {(() => {
                                        const checkedIn = registrations.filter((r: any) => 
                                            r.status === 'ATTENDED' || r.ticket?.checked_in_at
                                        );
                                        return `${checkedIn.length} member${checkedIn.length !== 1 ? 's' : ''} checked in`;
                                    })()}
                                </p>
                            </div>

                            {loading ? (
                                <div className="p-8 text-center text-gray-500">
                                    Loading check-ins...
                                </div>
                            ) : (() => {
                                const checkedInRegistrations = registrations.filter((r: any) => 
                                    r.status === 'ATTENDED' || r.ticket?.checked_in_at
                                ).sort((a: any, b: any) => {
                                    // Sort by check-in time, most recent first
                                    const timeA = a.ticket?.checked_in_at ? new Date(a.ticket.checked_in_at).getTime() : 0;
                                    const timeB = b.ticket?.checked_in_at ? new Date(b.ticket.checked_in_at).getTime() : 0;
                                    return timeB - timeA;
                                });

                                if (checkedInRegistrations.length === 0) {
                                    return (
                                        <div className="p-12 text-center text-gray-500">
                                            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                            <p className="font-medium text-gray-900 mb-1">No check-ins yet</p>
                                            <p className="text-sm">Members will appear here once they check in using the swipe feature.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Member
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Ticket Code
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Check-in Time
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {checkedInRegistrations.map((reg: any) => {
                                                    const checkInTime = reg.ticket?.checked_in_at 
                                                        ? new Date(reg.ticket.checked_in_at)
                                                        : null;
                                                    
                                                    return (
                                                        <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center gap-3">
                                                                    {reg.user_detail?.avatar ? (
                                                                        <img 
                                                                            src={getMediaUrl(reg.user_detail.avatar) || ''} 
                                                                            className="w-10 h-10 rounded-full object-cover" 
                                                                            alt={`${reg.user_detail.first_name} ${reg.user_detail.last_name}`}
                                                                        />
                                                                    ) : (
                                                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-sm">
                                                                            {getInitials(reg.user_detail?.first_name, reg.user_detail?.last_name)}
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <div className="text-sm font-semibold text-gray-900">
                                                                            {reg.user_detail?.first_name} {reg.user_detail?.last_name}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500">{reg.user_detail?.email}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="text-sm font-mono text-gray-700 bg-gray-100 px-3 py-1 rounded">
                                                                    {reg.ticket?.ticket_code || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {checkInTime ? (
                                                                    <div className="text-sm text-gray-900">
                                                                        <div>{format(checkInTime, 'MMM d, yyyy')}</div>
                                                                        <div className="text-xs text-gray-500">{format(checkInTime, 'h:mm a')}</div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-sm text-gray-400">N/A</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                                    Checked In
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {activeTab === 'OVERVIEW' && (
                    <div className="space-y-6">
                        {/* Cover Image */}
                        {event.cover_image && (
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <img 
                                    src={getMediaUrl(event.cover_image) || ''} 
                                    alt={event.title}
                                    className="w-full h-64 object-cover"
                                />
                            </div>
                        )}

                        {/* Basic Information */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Basic Information
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Title</label>
                                    <p className="text-lg font-semibold text-gray-900 mt-1">{event.title}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                                    <div className="news-content mt-2" dangerouslySetInnerHTML={{ __html: event.description }} />
                                </div>
                                {event.video_url && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Video URL</label>
                                        <a href={event.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mt-1 block">
                                            {event.video_url}
                                        </a>
                                    </div>
                                )}
                                {event.cost !== null && event.cost !== undefined && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Cost</label>
                                        <p className="text-lg font-semibold text-gray-900 mt-1">
                                            {parseFloat(event.cost.toString()) === 0 ? 'Free' : `$${parseFloat(event.cost.toString()).toFixed(2)}`}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Date & Time
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Start Date & Time</label>
                                    <p className="text-gray-900 font-medium mt-1">
                                        {new Date(event.start_date).toLocaleDateString()} at {new Date(event.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">End Date & Time</label>
                                    <p className="text-gray-900 font-medium mt-1">
                                        {new Date(event.end_date).toLocaleDateString()} at {new Date(event.end_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                                {event.is_recurring && (
                                    <>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Recurrence Pattern</label>
                                            <p className="text-gray-900 font-medium mt-1">{event.recurrence_pattern || 'NONE'}</p>
                                        </div>
                                        {event.recurrence_end_date && (
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Recurrence End Date</label>
                                                <p className="text-gray-900 font-medium mt-1">
                                                    {new Date(event.recurrence_end_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Location */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Location
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Location Name</label>
                                    <p className="text-gray-900 font-medium mt-1">{event.location_name}</p>
                                </div>
                                {event.address && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Address</label>
                                        <p className="text-gray-700 mt-1">{event.address}</p>
                                    </div>
                                )}
                                {(event.latitude && event.longitude) && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Coordinates</label>
                                        <p className="text-gray-700 mt-1">
                                            {event.latitude}, {event.longitude}
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Map Visible</label>
                                    <p className="text-gray-900 font-medium mt-1">
                                        {event.is_map_visible ? 'Yes' : 'No'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Organization */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Organization
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Municipality</label>
                                    <p className="text-gray-900 font-medium mt-1">
                                        {event.municipality_detail?.name || (typeof event.municipality === 'object' ? event.municipality.name : 'N/A')}
                                    </p>
                                </div>
                                {(event.club_detail || event.club) && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Club</label>
                                        <p className="text-gray-900 font-medium mt-1">
                                            {event.club_detail?.name || (typeof event.club === 'object' ? event.club.name : 'N/A')}
                                        </p>
                                    </div>
                                )}
                                {event.organizer_name && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Organizer Name</label>
                                        <p className="text-gray-900 font-medium mt-1">{event.organizer_name}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Registration Settings */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Registration Settings
                            </h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Registration Allowed</label>
                                        <p className="text-gray-900 font-medium mt-1">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                event.allow_registration ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {event.allow_registration ? 'Yes' : 'No'}
                                            </span>
                                        </p>
                                    </div>
                                    {event.allow_registration && (
                                        <>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Max Seats</label>
                                                <p className="text-gray-900 font-medium mt-1">
                                                    {event.max_seats === 0 ? 'Unlimited' : event.max_seats}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase">Max Waitlist</label>
                                                <p className="text-gray-900 font-medium mt-1">
                                                    {event.max_waitlist === 0 ? 'No waitlist' : event.max_waitlist}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {event.allow_registration && (
                                    <>
                                        <div className="border-t pt-4 mt-4">
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Requirements</label>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${event.requires_verified_account ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                                    <span className="text-sm text-gray-700">Requires Verified Account</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${event.requires_guardian_approval ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                                    <span className="text-sm text-gray-700">Requires Guardian Approval</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${event.requires_admin_approval ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                                    <span className="text-sm text-gray-700">Requires Admin Approval</span>
                                                </div>
                                            </div>
                                        </div>
                                        {(event.registration_open_date || event.registration_close_date) && (
                                            <div className="border-t pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {event.registration_open_date && (
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 uppercase">Registration Opens</label>
                                                        <p className="text-gray-900 font-medium mt-1">
                                                            {new Date(event.registration_open_date).toLocaleString()}
                                                        </p>
                                                    </div>
                                                )}
                                                {event.registration_close_date && (
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 uppercase">Registration Closes</label>
                                                        <p className="text-gray-900 font-medium mt-1">
                                                            {new Date(event.registration_close_date).toLocaleString()}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Targeting & Visibility */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Targeting & Visibility
                            </h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Target Audience</label>
                                        <p className="text-gray-900 font-medium mt-1">{event.target_audience}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Global Visibility</label>
                                        <p className="text-gray-900 font-medium mt-1">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                event.is_global ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {event.is_global ? 'Global' : 'Limited'}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                
                                {event.target_groups_details && event.target_groups_details.length > 0 && (
                                    <div className="border-t pt-4 mt-4">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Target Groups</label>
                                        <div className="flex flex-wrap gap-2">
                                            {event.target_groups_details.map((group: any) => (
                                                <span key={group.id} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                                    {group.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(event.target_genders?.length > 0 || event.target_min_age || event.target_max_age || event.target_grades?.length > 0) && (
                                    <div className="border-t pt-4 mt-4">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Demographic Filters</label>
                                        <div className="space-y-2">
                                            {event.target_genders?.length > 0 && (
                                                <div>
                                                    <span className="text-sm font-medium text-gray-700">Genders: </span>
                                                    <span className="text-sm text-gray-600">{event.target_genders.join(', ')}</span>
                                                </div>
                                            )}
                                            {(event.target_min_age || event.target_max_age) && (
                                                <div>
                                                    <span className="text-sm font-medium text-gray-700">Age Range: </span>
                                                    <span className="text-sm text-gray-600">
                                                        {event.target_min_age || 'Any'} - {event.target_max_age || 'Any'}
                                                    </span>
                                                </div>
                                            )}
                                            {event.target_grades?.length > 0 && (
                                                <div>
                                                    <span className="text-sm font-medium text-gray-700">Grades: </span>
                                                    <span className="text-sm text-gray-600">{event.target_grades.join(', ')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notifications & Tickets */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                Notifications & Tickets
                            </h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Send Reminders</label>
                                        <p className="text-gray-900 font-medium mt-1">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                event.send_reminders ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {event.send_reminders ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Enable Tickets</label>
                                        <p className="text-gray-900 font-medium mt-1">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                event.enable_tickets ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {event.enable_tickets ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                {event.custom_welcome_message && (
                                    <div className="border-t pt-4 mt-4">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Custom Welcome Message</label>
                                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{event.custom_welcome_message}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status & Statistics */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Status & Statistics
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                                    <p className="mt-1">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            event.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 
                                            event.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : 
                                            event.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                                            event.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {event.status}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Confirmed Participants</label>
                                    <p className="text-gray-900 font-medium mt-1">{event.confirmed_participants_count}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Waitlist Count</label>
                                    <p className="text-gray-900 font-medium mt-1">{event.waitlist_count}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
