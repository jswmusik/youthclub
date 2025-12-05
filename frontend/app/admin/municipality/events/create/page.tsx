'use client';

import { useRouter } from 'next/navigation';
import EventForm from '@/app/components/events/EventForm';

export default function CreateEventPage() {
    const router = useRouter();

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-6">
                <button 
                    onClick={() => router.back()}
                    className="text-sm text-gray-500 hover:text-gray-700 mb-2"
                >
                    ← Back to Events
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Create New Event</h1>
                <p className="text-gray-500">Configure details, targeting, and registration rules.</p>
            </div>

            <EventForm scope="MUNICIPALITY" />
        </div>
    );
}

