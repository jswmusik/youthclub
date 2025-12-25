'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import MessengerManager from '../../../components/messenger/MessengerManager';
import NavBar from '../../../components/NavBar';
import YouthSidebar from '../../../components/youth/YouthSidebar';
import { MessagesPageSkeleton } from '../../../components/ui/Skeleton';
import { X } from 'lucide-react';

// Minimum skeleton display time (in ms) for better UX
const MIN_LOADING_TIME = 400;

export default function YouthMessagesPage() {
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showSkeleton, setShowSkeleton] = useState(true);
    
    // Minimum loading time for skeleton display
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSkeleton(false);
        }, MIN_LOADING_TIME);
        return () => clearTimeout(timer);
    }, []);
    
    return (
        <div className="min-h-screen bg-[var(--dark-900)]" style={{ overflowX: 'hidden', width: '100%', maxWidth: '100vw' }}>
            <NavBar darkMode={true} showBackButton={true} hideBottomNavOnMobile={true} hideCheckedInIndicator={true} onMenuToggle={() => setIsSidebarOpen(true)} />
            
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
            
            {/* Mobile: Full width, no card. Desktop: Centered with max-width */}
            <div className="pt-12 sm:pt-16 md:px-6 lg:px-8" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                {/* Mobile: Hide title when in conversation view, Desktop: Always show */}
                <div className="mb-6 sm:mb-8 pt-4 sm:pt-6 px-2 sm:px-4 md:px-0 hidden md:block md:max-w-6xl lg:max-w-7xl md:mx-auto">
                    <h1 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)] font-heading">My Messages</h1>
                    <p className="text-xs sm:text-sm text-[var(--brand-light)]/60">Chat with your leaders and clubs.</p>
                </div>

                {/* Mobile: Full height minus navbar, Desktop: Fixed height */}
                <div className="h-[calc(100vh-3rem)] md:h-[calc(100vh-200px)]">
                    {showSkeleton ? (
                        <MessagesPageSkeleton />
                    ) : (
                        <MessengerManager role="YOUTH" darkMode={true} />
                    )}
                </div>
            </div>
        </div>
    );
}
