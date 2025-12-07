'use client';

import MessengerManager from '../../../components/messenger/MessengerManager';
// Assuming Guardian dashboard also uses the standard NavBar or a specific GuardianNavBar
// If you use a shared layout, you might not need to import NavBar here, but for safety:
import NavBar from '../../../components/NavBar'; 

export default function GuardianMessagesPage() {
    return (
        <div className="min-h-screen bg-gray-100 pb-8">
            <NavBar />
            
            <div className="max-w-5xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                    <p className="text-sm text-gray-500">Contact club staff regarding your children.</p>
                </div>

                <div className="h-[calc(100vh-200px)]">
                    <MessengerManager role="GUARDIAN" />
                </div>
            </div>
        </div>
    );
}
