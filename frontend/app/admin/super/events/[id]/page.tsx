'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, BarChart3, ChevronDown, ChevronUp, CheckCircle, Clock, Calendar, MapPin, Users, Building, Settings, Target, Bell, Ticket } from 'lucide-react';
import api from '@/lib/api';
import ParticipantManager from '@/app/components/events/ParticipantManager';
import { Event } from '@/types/event';
import { getMediaUrl, getInitials } from '@/app/utils';
import { format } from 'date-fns';

// Shadcn
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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

    // Build back URL
    const buildBackUrl = () => {
        const urlParams = new URLSearchParams();
        const page = searchParams.get('page');
        const search = searchParams.get('search');
        const status = searchParams.get('status');
        const recurring = searchParams.get('recurring');
        
        urlParams.set('page', page || '1');
        if (search) urlParams.set('search', search);
        if (status) urlParams.set('status', status);
        if (recurring) urlParams.set('recurring', recurring);
        
        const queryString = urlParams.toString();
        return `/admin/super/events?${queryString}`;
    };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link href={buildBackUrl()}>
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Events
                    </Button>
                </Link>
                <Link href={`/admin/super/events/edit/${event.id}`}>
                    <Button size="sm" className="gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white">
                        <Edit className="h-4 w-4" />
                        Edit Event
                    </Button>
                </Link>
            </div>

            {/* Analytics Dashboard */}
            {!loading && (
                <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-gray-500" />
                            <h3 className="text-sm font-semibold text-gray-500">Analytics</h3>
                        </div>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-9 p-0 h-8">
                                <ChevronUp className={cn(
                                    "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                                    analyticsExpanded ? "rotate-0" : "rotate-180"
                                )} />
                                <span className="sr-only">Toggle Analytics</span>
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                            {/* Card 1: Confirmed */}
                            <Card className="bg-[#EBEBFE]/30 border border-transparent shadow-sm transition-all duration-200 hover:bg-[#EBEBFE]/60 hover:border-[#4D4DA4]/30 cursor-pointer">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Confirmed</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-[#4D4DA4]">{confirmedCount}</div>
                                    <p className="text-xs text-muted-foreground mt-1">of {event.max_seats || 'Unlimited'} seats</p>
                                </CardContent>
                            </Card>

                            {/* Card 2: Waitlist */}
                            <Card className="bg-[#EBEBFE]/30 border border-transparent shadow-sm transition-all duration-200 hover:bg-[#EBEBFE]/60 hover:border-[#4D4DA4]/30 cursor-pointer">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Waitlist</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-[#4D4DA4]">{waitlistCount}</div>
                                    <p className="text-xs text-muted-foreground mt-1">people waiting</p>
                                </CardContent>
                            </Card>

                            {/* Card 3: Demographics */}
                            <Card className="bg-[#EBEBFE]/30 border border-transparent shadow-sm transition-all duration-200 hover:bg-[#EBEBFE]/60 hover:border-[#4D4DA4]/30 cursor-pointer">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Demographics</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Male:</span>
                                            <span className="font-bold text-[#4D4DA4]">{demographics.male}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Female:</span>
                                            <span className="font-bold text-[#4D4DA4]">{demographics.female}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Other:</span>
                                            <span className="font-bold text-[#4D4DA4]">{demographics.other}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Card 4: Target Groups */}
                            <Card className="bg-[#EBEBFE]/30 border border-transparent shadow-sm transition-all duration-200 hover:bg-[#EBEBFE]/60 hover:border-[#4D4DA4]/30 cursor-pointer">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Target Groups</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {event.target_groups_details && event.target_groups_details.length > 0 ? (
                                        <div className="space-y-1">
                                            {event.target_groups_details.slice(0, 3).map((group: any) => (
                                                <div key={group.id} className="text-sm font-medium text-[#4D4DA4] truncate">
                                                    {group.name}
                                                </div>
                                            ))}
                                            {event.target_groups_details.length > 3 && (
                                                <div className="text-xs text-muted-foreground">
                                                    +{event.target_groups_details.length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No target groups</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            )}

            {/* Event Title Card */}
            <Card className="border-none shadow-sm bg-gradient-to-br from-[#EBEBFE] via-[#EBEBFE]/50 to-white relative overflow-hidden">
                {event.cover_image && (
                    <div 
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage: `url(${getMediaUrl(event.cover_image)})`,
                            opacity: 0.25
                        }}
                    />
                )}
                <CardContent className="p-6 sm:p-10 relative z-10">
                    <div className="flex items-start gap-6">
                        <Avatar className="h-16 w-16 rounded-lg bg-[#EBEBFE] flex-shrink-0">
                            <AvatarFallback className="rounded-lg font-bold text-xl text-[#4D4DA4] bg-[#EBEBFE]">
                                <Calendar className="h-8 w-8" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold tracking-tight text-[#121213] mb-2">{event.title}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    <span>{new Date(event.start_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4" />
                                    <span>{event.location_name}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <div className="border-b border-gray-200 flex gap-6">
                <button 
                    onClick={() => setActiveTab('PARTICIPANTS')}
                    className={cn(
                        "pb-3 text-sm font-semibold border-b-2 transition-colors",
                        activeTab === 'PARTICIPANTS' 
                            ? 'border-[#4D4DA4] text-[#4D4DA4]' 
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                >
                    Participants & Applications
                </button>
                {event.enable_tickets && (
                    <button 
                        onClick={() => setActiveTab('CHECKIN')}
                        className={cn(
                            "pb-3 text-sm font-semibold border-b-2 transition-colors",
                            activeTab === 'CHECKIN' 
                                ? 'border-[#4D4DA4] text-[#4D4DA4]' 
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        Check-in & Tickets
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('OVERVIEW')}
                    className={cn(
                        "pb-3 text-sm font-semibold border-b-2 transition-colors",
                        activeTab === 'OVERVIEW' 
                            ? 'border-[#4D4DA4] text-[#4D4DA4]' 
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
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
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle>Checked-In Members</CardTitle>
                                <CardDescription>
                                    {(() => {
                                        const checkedIn = registrations.filter((r: any) => 
                                            r.status === 'ATTENDED' || r.ticket?.checked_in_at
                                        );
                                        return `${checkedIn.length} member${checkedIn.length !== 1 ? 's' : ''} checked in`;
                                    })()}
                                </CardDescription>
                            </CardHeader>
                            <Separator />
                            <CardContent className="pt-6">

                                {loading ? (
                                    <div className="p-8 text-center text-muted-foreground">
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
                                            <div className="p-12 text-center text-muted-foreground">
                                                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                                <p className="font-medium text-[#121213] mb-1">No check-ins yet</p>
                                                <p className="text-sm">Members will appear here once they check in using the swipe feature.</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-muted/30 border-b border-gray-200">
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
                                                                        <Avatar className="h-10 w-10 rounded-full">
                                                                            <AvatarImage src={getMediaUrl(reg.user_detail?.avatar) || undefined} />
                                                                            <AvatarFallback className="rounded-full bg-[#EBEBFE] text-[#4D4DA4] font-bold text-sm">
                                                                                {getInitials(reg.user_detail?.first_name, reg.user_detail?.last_name)}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <div>
                                                                            <div className="text-sm font-semibold text-[#121213]">
                                                                                {reg.user_detail?.first_name} {reg.user_detail?.last_name}
                                                                            </div>
                                                                            <div className="text-xs text-muted-foreground">{reg.user_detail?.email}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <Badge variant="outline" className="font-mono">
                                                                        {reg.ticket?.ticket_code || 'N/A'}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    {checkInTime ? (
                                                                        <div className="text-sm text-[#121213]">
                                                                            <div>{format(checkInTime, 'MMM d, yyyy')}</div>
                                                                            <div className="text-xs text-muted-foreground">{format(checkInTime, 'h:mm a')}</div>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-sm text-muted-foreground">N/A</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <Badge className="bg-green-100 text-green-700 border-green-200">
                                                                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                                                        Checked In
                                                                    </Badge>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'OVERVIEW' && (
                    <div className="space-y-6">
                        {/* Cover Image */}
                        {event.cover_image && (
                            <Card className="border-none shadow-sm overflow-hidden p-0">
                                <img 
                                    src={getMediaUrl(event.cover_image) || ''} 
                                    alt={event.title}
                                    className="w-full h-64 object-cover"
                                />
                            </Card>
                        )}

                        {/* Basic Information */}
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-[#4D4DA4]" />
                                    Basic Information
                                </CardTitle>
                            </CardHeader>
                            <Separator />
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Title</label>
                                        <p className="text-lg font-semibold text-[#121213] mt-1">{event.title}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Description</label>
                                        <div className="news-content mt-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: event.description }} />
                                    </div>
                                    {event.video_url && (
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Video URL</label>
                                            <a href={event.video_url} target="_blank" rel="noopener noreferrer" className="text-[#4D4DA4] hover:text-[#FF5485] hover:underline mt-1 block">
                                                {event.video_url}
                                            </a>
                                        </div>
                                    )}
                                    {event.cost !== null && event.cost !== undefined && (
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Cost</label>
                                            <p className="text-lg font-semibold text-[#121213] mt-1">
                                                {parseFloat(event.cost.toString()) === 0 ? 'Free' : `$${parseFloat(event.cost.toString()).toFixed(2)}`}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Date & Time */}
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-[#4D4DA4]" />
                                    Date & Time
                                </CardTitle>
                            </CardHeader>
                            <Separator />
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Start Date & Time</label>
                                        <p className="text-[#121213] font-medium mt-1">
                                            {new Date(event.start_date).toLocaleDateString()} at {new Date(event.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase">End Date & Time</label>
                                        <p className="text-[#121213] font-medium mt-1">
                                            {new Date(event.end_date).toLocaleDateString()} at {new Date(event.end_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                    {event.is_recurring && (
                                        <>
                                            <div>
                                                <label className="text-xs font-bold text-muted-foreground uppercase">Recurrence Pattern</label>
                                                <p className="text-[#121213] font-medium mt-1">{event.recurrence_pattern || 'NONE'}</p>
                                            </div>
                                            {event.recurrence_end_date && (
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground uppercase">Recurrence End Date</label>
                                                    <p className="text-[#121213] font-medium mt-1">
                                                        {new Date(event.recurrence_end_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Location */}
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-[#4D4DA4]" />
                                    Location
                                </CardTitle>
                            </CardHeader>
                            <Separator />
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Location Name</label>
                                        <p className="text-[#121213] font-medium mt-1">{event.location_name}</p>
                                    </div>
                                    {event.address && (
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Address</label>
                                            <p className="text-muted-foreground mt-1">{event.address}</p>
                                        </div>
                                    )}
                                    {(event.latitude && event.longitude) && (
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Coordinates</label>
                                            <p className="text-muted-foreground mt-1">
                                                {event.latitude}, {event.longitude}
                                            </p>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Map Visible</label>
                                        <p className="text-[#121213] font-medium mt-1">
                                            {event.is_map_visible ? 'Yes' : 'No'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Organization */}
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building className="h-5 w-5 text-[#4D4DA4]" />
                                    Organization
                                </CardTitle>
                            </CardHeader>
                            <Separator />
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Municipality</label>
                                        <p className="text-[#121213] font-medium mt-1">
                                            {event.municipality_detail?.name || (typeof event.municipality === 'object' ? event.municipality.name : 'N/A')}
                                        </p>
                                    </div>
                                    {(event.club_detail || event.club) && (
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Club</label>
                                            <p className="text-[#121213] font-medium mt-1">
                                                {event.club_detail?.name || (typeof event.club === 'object' ? event.club.name : 'N/A')}
                                            </p>
                                        </div>
                                    )}
                                    {event.organizer_name && (
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Organizer Name</label>
                                            <p className="text-[#121213] font-medium mt-1">{event.organizer_name}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Registration Settings */}
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-[#4D4DA4]" />
                                    Registration Settings
                                </CardTitle>
                            </CardHeader>
                            <Separator />
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Registration Allowed</label>
                                            <p className="text-[#121213] font-medium mt-1">
                                                <Badge variant="outline" className={event.allow_registration ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}>
                                                    {event.allow_registration ? 'Yes' : 'No'}
                                                </Badge>
                                            </p>
                                        </div>
                                        {event.allow_registration && (
                                            <>
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground uppercase">Max Seats</label>
                                                    <p className="text-[#121213] font-medium mt-1">
                                                        {event.max_seats === 0 ? 'Unlimited' : event.max_seats}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-muted-foreground uppercase">Max Waitlist</label>
                                                    <p className="text-[#121213] font-medium mt-1">
                                                        {event.max_waitlist === 0 ? 'No waitlist' : event.max_waitlist}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {event.allow_registration && (
                                        <>
                                            <Separator />
                                            <div className="pt-4">
                                                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Requirements</label>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${event.requires_verified_account ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                                        <span className="text-sm text-[#121213]">Requires Verified Account</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${event.requires_guardian_approval ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                                        <span className="text-sm text-[#121213]">Requires Guardian Approval</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${event.requires_admin_approval ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                                        <span className="text-sm text-[#121213]">Requires Admin Approval</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {(event.registration_open_date || event.registration_close_date) && (
                                                <>
                                                    <Separator />
                                                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {event.registration_open_date && (
                                                            <div>
                                                                <label className="text-xs font-bold text-muted-foreground uppercase">Registration Opens</label>
                                                                <p className="text-[#121213] font-medium mt-1">
                                                                    {new Date(event.registration_open_date).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {event.registration_close_date && (
                                                            <div>
                                                                <label className="text-xs font-bold text-muted-foreground uppercase">Registration Closes</label>
                                                                <p className="text-[#121213] font-medium mt-1">
                                                                    {new Date(event.registration_close_date).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Targeting & Visibility */}
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="h-5 w-5 text-[#4D4DA4]" />
                                    Targeting & Visibility
                                </CardTitle>
                            </CardHeader>
                            <Separator />
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Target Audience</label>
                                            <p className="text-[#121213] font-medium mt-1">{event.target_audience}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Global Visibility</label>
                                            <p className="text-[#121213] font-medium mt-1">
                                                <Badge variant="outline" className={event.is_global ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'}>
                                                    {event.is_global ? 'Global' : 'Limited'}
                                                </Badge>
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {event.target_groups_details && event.target_groups_details.length > 0 && (
                                        <>
                                            <Separator />
                                            <div className="pt-4">
                                                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Target Groups</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {event.target_groups_details.map((group: any) => (
                                                        <Badge key={group.id} variant="secondary" className="bg-[#EBEBFE] text-[#4D4DA4] border-[#4D4DA4]/20">
                                                            {group.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {(event.target_genders?.length > 0 || event.target_min_age || event.target_max_age || event.target_grades?.length > 0) && (
                                        <>
                                            <Separator />
                                            <div className="pt-4">
                                                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Demographic Filters</label>
                                                <div className="space-y-2">
                                                    {event.target_genders?.length > 0 && (
                                                        <div>
                                                            <span className="text-sm font-medium text-[#121213]">Genders: </span>
                                                            <span className="text-sm text-muted-foreground">{event.target_genders.join(', ')}</span>
                                                        </div>
                                                    )}
                                                    {(event.target_min_age || event.target_max_age) && (
                                                        <div>
                                                            <span className="text-sm font-medium text-[#121213]">Age Range: </span>
                                                            <span className="text-sm text-muted-foreground">
                                                                {event.target_min_age || 'Any'} - {event.target_max_age || 'Any'}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {event.target_grades?.length > 0 && (
                                                        <div>
                                                            <span className="text-sm font-medium text-[#121213]">Grades: </span>
                                                            <span className="text-sm text-muted-foreground">{event.target_grades.join(', ')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Notifications & Tickets */}
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Bell className="h-5 w-5 text-[#4D4DA4]" />
                                    Notifications & Tickets
                                </CardTitle>
                            </CardHeader>
                            <Separator />
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Send Reminders</label>
                                            <p className="text-[#121213] font-medium mt-1">
                                                <Badge variant="outline" className={event.send_reminders ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}>
                                                    {event.send_reminders ? 'Enabled' : 'Disabled'}
                                                </Badge>
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Enable Tickets</label>
                                            <p className="text-[#121213] font-medium mt-1">
                                                <Badge variant="outline" className={event.enable_tickets ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}>
                                                    {event.enable_tickets ? 'Enabled' : 'Disabled'}
                                                </Badge>
                                            </p>
                                        </div>
                                    </div>
                                    {event.custom_welcome_message && (
                                        <>
                                            <Separator />
                                            <div className="pt-4">
                                                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Custom Welcome Message</label>
                                                <p className="text-muted-foreground bg-muted/30 p-3 rounded-lg">{event.custom_welcome_message}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Status & Statistics */}
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-[#4D4DA4]" />
                                    Status & Statistics
                                </CardTitle>
                            </CardHeader>
                            <Separator />
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Status</label>
                                        <p className="mt-1">
                                            <Badge variant="outline" className={
                                                event.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 border-green-200' : 
                                                event.status === 'DRAFT' ? 'bg-gray-50 text-gray-700 border-gray-200' : 
                                                event.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                event.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-yellow-50 text-yellow-700 border-yellow-200'
                                            }>
                                                {event.status}
                                            </Badge>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Confirmed Participants</label>
                                        <p className="text-[#121213] font-medium mt-1">{event.confirmed_participants_count}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Waitlist Count</label>
                                        <p className="text-[#121213] font-medium mt-1">{event.waitlist_count}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
