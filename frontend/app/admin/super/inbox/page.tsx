'use client';

import MessengerManager from '../../../components/messenger/MessengerManager';

export default function SuperAdminInbox() {
    return (
        <div className="relative h-screen overflow-hidden">
            <div className="relative w-full flex flex-col overflow-hidden h-[calc(100vh-64px)] md:h-screen max-h-[calc(100vh-64px)] md:max-h-screen">
                <div className="p-6 flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="mb-6 shrink-0">
                        <h1 className="text-2xl font-bold text-gray-900">Internal Inbox</h1>
                        <p className="text-sm text-gray-500">Manage direct messages and broadcasts across the platform with real-time updates.</p>
                    </div>
                    
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <MessengerManager role="ADMIN" scope="GLOBAL" />
                    </div>
                </div>
            </div>
        </div>
    );
}
