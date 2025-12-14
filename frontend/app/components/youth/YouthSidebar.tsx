'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';

interface YouthSidebarProps {
    activePath?: string;
    unfinishedCount?: number;
}

export default function YouthSidebar({ activePath, unfinishedCount = 0 }: YouthSidebarProps) {
    const router = useRouter();
    const { user } = useAuth();

    const isActive = (path: string) => {
        if (!activePath) return false;
        if (path === '/dashboard/youth' && activePath === '/dashboard/youth') return true;
        return activePath.startsWith(path);
    };

    const navItemClass = (path: string) => {
        const active = isActive(path);
        if (active) {
            return "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 bg-[#4D4DA4] text-white shadow-sm hover:shadow-md hover:bg-[#5D5DB4] flex items-center gap-3";
        }
        return "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-700 bg-white hover:bg-[#EBEBFE] border border-gray-200 hover:border-[#4D4DA4]/20 flex items-center gap-3 group";
    };

    return (
        <aside className="w-full md:w-64 flex-shrink-0 md:sticky md:top-[72px] md:self-start md:max-h-[calc(100vh-88px)] md:overflow-y-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[#4D4DA4] mb-1">Dashboard</h1>
                <p className="text-sm text-gray-600">Your space to explore</p>
            </div>

            {/* Navigation Menu */}
            <div className="space-y-2">
                {/* Your Feed - Start */}
                <button
                    onClick={() => router.push('/dashboard/youth')}
                    className={navItemClass('/dashboard/youth')}
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                    </svg>
                    <span>Your Feed</span>
                </button>
                
                {/* Scan to Check In */}
                <button
                    onClick={() => router.push('/dashboard/youth/scan')}
                    className={navItemClass('/dashboard/youth/scan')}
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 13h6v-6h-6v6zm1.5-1.5h3v3h-3v-3z"/>
                    </svg>
                    <span>Scan to Check In</span>
                </button>
                
                {/* Borrow Items */}
                <button
                    onClick={() => router.push('/dashboard/youth/inventory')}
                    className={navItemClass('/dashboard/youth/inventory')}
                >
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
                    </svg>
                    <span>Borrow Items</span>
                </button>
                
                {/* Bookings */}
                <button
                    onClick={() => router.push('/dashboard/youth/bookings')}
                    className={navItemClass('/dashboard/youth/bookings')}
                >
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
                    </svg>
                    <span>Bookings</span>
                </button>
                
                {/* Questionnaires */}
                <button
                    onClick={() => router.push('/dashboard/youth/questionnaires')}
                    className={`${navItemClass('/dashboard/youth/questionnaires').replace('gap-3', 'justify-between')} group`}
                >
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                        </svg>
                        <span>Questionnaires</span>
                    </div>
                    {unfinishedCount > 0 && (
                        <span className="bg-[#FF5485] text-white text-xs font-bold px-2 py-1 rounded-full min-w-[22px] text-center">
                            {unfinishedCount}
                        </span>
                    )}
                </button>
                
                {/* My Groups */}
                <button
                    onClick={() => router.push('/dashboard/youth/profile?tab=clubs')}
                    className={navItemClass('/dashboard/youth/profile')}
                >
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                    </svg>
                    <span>My Groups</span>
                </button>
                
                {/* My Club */}
                {user?.preferred_club?.id ? (
                    <button
                        onClick={() => router.push(`/dashboard/youth/club/${user.preferred_club.id}`)}
                        className={navItemClass('/dashboard/youth/club')}
                    >
                        <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        <span>My Club</span>
                    </button>
                ) : (
                    <button
                        disabled
                        className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed flex items-center gap-3"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        <span>My Club</span>
                    </button>
                )}
                
                {/* News */}
                <button
                    onClick={() => router.push('/dashboard/youth/news')}
                    className={navItemClass('/dashboard/youth/news')}
                >
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                    <span>News</span>
                </button>
                
                {/* Events */}
                <button
                    onClick={() => router.push('/dashboard/youth/events')}
                    className={`${navItemClass('/dashboard/youth/events').replace('gap-3', 'justify-between')} group`}
                >
                    <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-600 group-hover:text-[#4D4DA4]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17 10H7v2h10v-2zm2-7h-3V1h-2v2H8V1H6v2H3c-1.11 0-1.99.9-1.99 2L1 19c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V8h16v11zm-5-9H7v2h7v-2z"/>
                        </svg>
                        <span>Events</span>
                    </div>
                    <span className="bg-[#FF5485] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        6
                    </span>
                </button>
            </div>
        </aside>
    );
}
