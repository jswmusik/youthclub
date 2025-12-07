'use client';

import MessengerManager from '../../../components/messenger/MessengerManager';
import NavBar from '../../../components/NavBar';

export default function YouthMessagesPage() {
    return (
        <div className="min-h-screen bg-gray-100 pb-8">
            <NavBar />
            
            <div className="max-w-5xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">My Messages</h1>
                    <p className="text-sm text-gray-500">Chat with your leaders and clubs.</p>
                </div>

                <div className="h-[calc(100vh-200px)]">
                    <MessengerManager role="YOUTH" />
                </div>
            </div>
        </div>
    );
}
