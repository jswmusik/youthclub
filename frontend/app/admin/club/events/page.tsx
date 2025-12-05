'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Event } from '@/types/event';

export default function ClubEventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            // The backend ViewSet automatically filters for the club admin
            const res = await api.get('/events/');
            setEvents(Array.isArray(res.data) ? res.data : res.data.results || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Events</h1>
                    <p className="text-gray-500">Manage your club activities and registrations</p>
                </div>
                <Link 
                    href="/admin/club/events/create" 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                >
                    + Create Event
                </Link>
            </div>

            {loading ? (
                <div className="text-center py-10">Loading events...</div>
            ) : (
                <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">Event</th>
                                <th className="p-4 font-semibold text-gray-600">Date</th>
                                <th className="p-4 font-semibold text-gray-600">Status</th>
                                <th className="p-4 font-semibold text-gray-600">Registrations</th>
                                <th className="p-4 font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {events.map(event => (
                                <tr key={event.id} className="hover:bg-gray-50 transition">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-900">{event.title}</div>
                                        <div className="text-sm text-gray-500 truncate max-w-xs">{event.location_name}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm">
                                            {new Date(event.start_date).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(event.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold
                                            ${event.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 
                                              event.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' : 
                                              'bg-yellow-100 text-yellow-700'}
                                        `}>
                                            {event.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm">
                                        {event.allow_registration ? (
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium">{event.confirmed_participants_count}</span>
                                                <span className="text-gray-400">/</span>
                                                <span className="text-gray-500">{event.max_seats === 0 ? '∞' : event.max_seats}</span>
                                                {event.waitlist_count > 0 && (
                                                    <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1 rounded">
                                                        +{event.waitlist_count} WL
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic">No Reg</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-3 text-sm">
                                            <Link href={`/admin/club/events/edit/${event.id}`} className="text-blue-600 hover:underline">
                                                Edit
                                            </Link>
                                            <Link href={`/admin/club/events/${event.id}`} className="text-gray-600 hover:underline">
                                                Manage
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {events.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        No events found. Click "Create Event" to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

