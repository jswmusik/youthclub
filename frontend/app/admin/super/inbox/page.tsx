'use client';

import { Suspense, useState, useEffect } from 'react';
import MessengerManager from '../../../components/messenger/MessengerManager';
import { Inbox } from 'lucide-react';

// Minimum skeleton display time (in ms) for better UX
const MIN_LOADING_TIME = 400;

function InboxPageContent() {
    const [showSkeleton, setShowSkeleton] = useState(true);
    
    // Minimum loading time for skeleton display
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSkeleton(false);
        }, MIN_LOADING_TIME);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
            {/* Header - Hidden on mobile */}
            <div className="hidden md:block px-4 sm:px-6 py-4 sm:py-6 flex-shrink-0">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/20 flex items-center justify-center">
                        <Inbox className="w-5 h-5 text-[var(--brand-primary)]" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Internal Inbox</h1>
                </div>
                <p className="text-sm text-[var(--brand-light)]/50 pl-[52px]">Manage direct messages and broadcasts across the platform.</p>
            </div>
            
            {/* Messenger Container - Full height on mobile, with padding on desktop */}
            <div className="flex-1 min-h-0 overflow-hidden md:px-4 sm:md:px-6 md:pb-6">
                {showSkeleton ? (
                    <InboxSkeleton />
                ) : (
                    <MessengerManager role="ADMIN" scope="GLOBAL" darkMode={true} />
                )}
            </div>
        </div>
    );
}

// Skeleton component for loading state
function InboxSkeleton() {
    return (
        <div className="flex h-full bg-[var(--dark-800)] md:rounded-2xl md:border md:border-[var(--dark-600)] overflow-hidden">
            {/* Filters Column Skeleton */}
            <div className="hidden md:flex flex-col w-16 lg:w-48 xl:w-64 border-r border-[var(--dark-600)] bg-[var(--dark-700)]/50 p-4 gap-3">
                <div className="h-10 bg-[var(--dark-600)] rounded-xl animate-pulse" />
                <div className="h-10 bg-[var(--dark-600)] rounded-xl animate-pulse" />
                <div className="mt-4 space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 bg-[var(--dark-600)] rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
            
            {/* List Column Skeleton */}
            <div className="w-full md:w-72 lg:w-80 xl:w-96 border-r border-[var(--dark-600)] flex flex-col">
                <div className="p-4 border-b border-[var(--dark-600)]">
                    <div className="h-6 w-24 bg-[var(--dark-600)] rounded animate-pulse mb-3" />
                    <div className="h-10 bg-[var(--dark-600)] rounded-xl animate-pulse" />
                </div>
                <div className="flex-1 p-3 space-y-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--dark-700)]">
                            <div className="w-12 h-12 rounded-full bg-[var(--dark-600)] animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-32 bg-[var(--dark-600)] rounded animate-pulse" />
                                <div className="h-3 w-48 bg-[var(--dark-600)] rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Detail Column Skeleton */}
            <div className="hidden md:flex flex-1 flex-col bg-[var(--dark-900)]">
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                            <Inbox className="w-8 h-8 text-[var(--brand-light)]/30" />
                        </div>
                        <p className="text-[var(--brand-light)]/40">Select a conversation to start</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SuperAdminInbox() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)]/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Inbox className="w-6 h-6 text-[var(--brand-primary)]" />
                    </div>
                    <p className="text-[var(--brand-light)]/60">Loading inbox...</p>
                </div>
            </div>
        }>
            <InboxPageContent />
        </Suspense>
    );
}
