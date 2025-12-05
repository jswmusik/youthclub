'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import EventForm from '@/app/components/events/EventForm';
import { Event } from '@/types/event';

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await api.get(`/events/${params.id}/`);
                setEvent(res.data);
            } catch (err) {
                console.error(err);
                alert("Failed to load event");
                router.push('/admin/super/events');
            } finally {
                setLoading(false);
            }
        };
        if (params.id) fetchEvent();
    }, [params.id, router]);

    if (loading) return <div className="p-4 text-center">Loading...</div>;

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-6">
                <button 
                    onClick={() => router.back()} 
                    className="text-sm text-gray-500 hover:text-gray-700 mb-2"
                >
                    ← Back
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
            </div>
            {event && <EventForm initialData={event} scope="SUPER" />}
        </div>
    );
}

