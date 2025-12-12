'use client';

import MessengerManager from '../../../components/messenger/MessengerManager';

export default function SuperAdminInbox() {
    return (
        <div className="space-y-4 sm:space-y-6 h-full flex flex-col min-w-0 max-w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 flex-shrink-0 min-w-0">
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#121213] break-words">Internal Inbox</h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 break-words">Manage direct messages and broadcasts across the platform.</p>
                </div>
            </div>
            
            {/* Messenger Manager */}
            <div className="flex-1 min-h-0 overflow-hidden min-w-0 max-w-full">
                <MessengerManager role="ADMIN" scope="GLOBAL" />
            </div>
        </div>
    );
}
