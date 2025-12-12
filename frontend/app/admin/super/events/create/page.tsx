'use client';

import { useRouter } from 'next/navigation';
import EventForm from '@/app/components/events/EventForm';

export default function CreateEventPage() {
    const router = useRouter();

    return (
        <div className="p-8">
            <EventForm scope="SUPER" />
        </div>
    );
}

