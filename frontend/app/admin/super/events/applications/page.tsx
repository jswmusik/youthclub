'use client';

import ApplicationList from '@/app/components/events/ApplicationList';

export default function SuperApplicationsPage() {
    return (
        <div className="h-[calc(100vh-64px)] p-6 flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Global Application Queue</h1>
            <div className="flex-1 min-h-0"><ApplicationList scope="SUPER" /></div>
        </div>
    );
}
