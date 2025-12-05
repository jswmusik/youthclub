'use client';

import EventCalendar from '@/app/components/events/EventCalendar';
import Link from 'next/link';

export default function EventCalendarPage() {
    return (
        <div className="h-[calc(100vh-100px)] p-4">
            <div className="mb-4 flex items-center gap-2">
                <Link href="/admin/super/events" className="text-sm text-gray-500 hover:underline">
                    ← Back to List
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Event Calendar</h1>
            </div>
            <EventCalendar scope="SUPER" />
        </div>
    );
}

