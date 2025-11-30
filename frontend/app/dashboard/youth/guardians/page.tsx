'use client';

import NavBar from '@/app/components/NavBar';
import YouthGuardianManager from '@/app/components/youth/guardians/YouthGuardianManager';

export default function MyGuardiansPage() {
    return (
        <div className="min-h-screen bg-gray-100 pb-20">
            <NavBar />
            <div className="max-w-7xl mx-auto p-4 lg:p-8">
                {/* Back Link for mobile convenience */}
                <div className="mb-6 lg:hidden">
                    <a href="/dashboard/youth" className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-medium">
                        ← Back to Dashboard
                    </a>
                </div>
                
                <YouthGuardianManager />
            </div>
        </div>
    );
}

