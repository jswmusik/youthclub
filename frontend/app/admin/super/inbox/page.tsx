'use client';

import MessengerManager from '../../../components/messenger/MessengerManager';

export default function SuperAdminInbox() {
    return (
        <div className="p-6 h-full flex flex-col">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Internal Inbox</h1>
                <p className="text-sm text-gray-500">Manage direct messages and broadcasts across the platform.</p>
            </div>
            
            <div className="flex-1 min-h-0">
                <MessengerManager role="ADMIN" scope="GLOBAL" />
            </div>
        </div>
    );
}
