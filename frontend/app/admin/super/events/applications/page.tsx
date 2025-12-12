'use client';

import ApplicationList from '@/app/components/events/ApplicationList';

export default function SuperApplicationsPage() {
    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Global Application Queue</h1>
                <p className="text-sm text-muted-foreground mt-1">Review and manage event registration applications.</p>
            </div>
            <ApplicationList scope="SUPER" />
        </div>
    );
}
