'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import NavBar from '@/app/components/NavBar';
import YouthGuardianManager from '@/app/components/youth/guardians/YouthGuardianManager';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import { X } from 'lucide-react';

export default function MyGuardiansPage() {
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    return (
        <div className="min-h-screen bg-[var(--dark-900)] pb-20">
            <NavBar darkMode={true} showBackButton={true} onMenuToggle={() => setIsSidebarOpen(true)} />
            
            {/* Mobile Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-black/70 z-40 md:hidden transition-opacity duration-300 ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsSidebarOpen(false)}
            />
            
            {/* Mobile Sidebar */}
            <aside 
                className={`fixed top-0 left-0 h-screen w-64 z-50 bg-[var(--dark-800)] transform transition-transform duration-300 md:hidden ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between h-14 sm:h-16 px-4 border-b border-[var(--dark-500)]">
                    <h1 className="text-xl font-bold text-[var(--brand-primary)]">Menu</h1>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]">
                    <YouthSidebar activePath={pathname} darkMode />
                </div>
            </aside>
            
            <div className="max-w-7xl mx-auto p-4 lg:p-8 pt-16 sm:pt-20">
                <YouthGuardianManager darkMode={true} />
            </div>
        </div>
    );
}
