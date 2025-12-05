'use client';

import ApplicationList from '@/app/components/events/ApplicationList';
import Link from 'next/link';

export default function ApplicationsPage() {
    return (
        <div className="h-[calc(100vh-100px)] p-4 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Link href="/admin/municipality/events" className="text-sm text-gray-500 hover:underline">
                        ← Back to Events
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 ml-4">Applications Overview</h1>
                </div>
            </div>
            
            <div className="flex-1 min-h-0">
                <ApplicationList scope="MUNICIPALITY" />
            </div>
        </div>
    );
}

