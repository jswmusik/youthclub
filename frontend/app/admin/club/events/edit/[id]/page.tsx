'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import EventForm from '@/app/components/events/EventForm';
import { Event } from '@/types/event';

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
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
                router.push('/admin/club/events');
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
                <Link 
                    href={(() => {
                        // Build back URL with preserved query parameters
                        const urlParams = new URLSearchParams();
                        const page = searchParams.get('page');
                        const search = searchParams.get('search');
                        const status = searchParams.get('status');
                        const recurring = searchParams.get('recurring');
                        
                        // Always include page (even if it's 1) to ensure pagination state is preserved
                        urlParams.set('page', page || '1');
                        if (search) urlParams.set('search', search);
                        if (status) urlParams.set('status', status);
                        if (recurring) urlParams.set('recurring', recurring);
                        
                        const queryString = urlParams.toString();
                        return `/admin/club/events?${queryString}`;
                    })()}
                    className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
                >
                    ← Back
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
            </div>
            {event && <EventForm initialData={event} scope="CLUB" />}
        </div>
    );
}

