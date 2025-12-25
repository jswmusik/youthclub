'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import EventForm from '@/app/components/events/EventForm';
import { Event } from '@/types/event';
import { Calendar } from 'lucide-react';

function EditEventContent() {
    const params = useParams();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await api.get(`/events/${params.id}/`);
                setEvent(res.data);
            } catch (err) {
                console.error(err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        if (params.id) fetchEvent();
    }, [params.id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
                <div className="sm:max-w-4xl sm:mx-auto sm:px-6 px-4">
                    <div className="flex items-center justify-center gap-3 py-20">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
                            <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-[var(--brand-light)]/50">Loading event...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
                <div className="sm:max-w-4xl sm:mx-auto sm:px-6 px-4">
                    <div className="flex items-center justify-center gap-3 py-20">
                        <span className="text-[var(--brand-red)]">Failed to load event</span>
                    </div>
                </div>
            </div>
        );
    }

    return <EventForm initialData={event} scope="SUPER" />;
}

export default function EditEventPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
                <div className="sm:max-w-4xl sm:mx-auto sm:px-6 px-4">
                    <div className="flex items-center justify-center gap-3 py-20">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
                            <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-[var(--brand-light)]/50">Loading form...</span>
                    </div>
                </div>
            </div>
        }>
            <EditEventContent />
        </Suspense>
    );
}
