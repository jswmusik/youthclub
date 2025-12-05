'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import ParticipantManager from '@/app/components/events/ParticipantManager';
import { Event } from '@/types/event';

export default function EventDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PARTICIPANTS' | 'CHECKIN'>('PARTICIPANTS');

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await api.get(`/events/${params.id}/`);
                setEvent(res.data);
            } catch (error) {
                console.error(error);
            }
        };
        if (params.id) fetchEvent();
    }, [params.id]);

    if (!event) return <div className="p-8 text-center">Loading Dashboard...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6 p-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <button 
                        onClick={() => router.push('/admin/municipality/events')} 
                        className="text-sm text-gray-500 hover:underline mb-2"
                    >
                        ← Back to Events
                    </button>
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="text-gray-500 text-xs uppercase font-bold">Confirmed</div>
                    <div className="text-2xl font-bold text-blue-600">{event.confirmed_participants_count}</div>
                    <div className="text-xs text-gray-400">of {event.max_seats || 'Unlimited'} seats</div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="text-gray-500 text-xs uppercase font-bold">Waitlist</div>
                    <div className="text-2xl font-bold text-orange-600">{event.waitlist_count}</div>
                    <div className="text-xs text-gray-400">people waiting</div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="text-gray-500 text-xs uppercase font-bold">Status</div>
                    <div className="text-2xl font-bold text-gray-800 capitalize">{event.status.toLowerCase()}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="text-gray-500 text-xs uppercase font-bold">Audience</div>
                    <div className="text-lg font-bold text-gray-800">{event.target_audience}</div>
                </div>
            </div>

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
                <button 
                    onClick={() => setActiveTab('CHECKIN')}
                    className={`pb-3 text-sm font-bold border-b-2 transition ${
                        activeTab === 'CHECKIN' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
                    }`}
                >
                    Check-in & Tickets
                </button>
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
                    <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                        Ticket Scanner and Check-in list will be implemented here (Phase 5).
                    </div>
                )}

                {activeTab === 'OVERVIEW' && (
                    <div className="bg-white p-6 rounded-xl border">
                        <h3 className="font-bold mb-4">Description</h3>
                        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: event.description }} />
                    </div>
                )}
            </div>
        </div>
    );
}

