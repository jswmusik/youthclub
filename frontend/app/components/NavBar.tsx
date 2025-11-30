// frontend/app/components/NavBar.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from './posts/PostCard';
import { fetchUnreadNotificationCount } from '../../lib/api'; // <--- NEW IMPORT

export default function NavBar() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0); // <--- NEW STATE
    const menuRef = useRef<HTMLDivElement>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Implement search functionality
        console.log('Search:', searchQuery);
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    // --- NEW: Fetch Unread Count ---
    useEffect(() => {
        const loadUnreadCount = async () => {
            if (!user) return;

            try {
                const res = await fetchUnreadNotificationCount();
                setUnreadCount(res.data.count);
            } catch (error) {
                console.error("Failed to load notification count", error);
            }
        };

        loadUnreadCount();
        
        // Optional: Poll every 60 seconds to keep it fresh
        const interval = setInterval(loadUnreadCount, 60000);
        return () => clearInterval(interval);
    }, [user]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showMenu]);

    return (
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-14">
                    {/* Left: Logo and Search */}
                    <div className="flex items-center gap-4 flex-1">
                        {/* UA Logo */}
                        <button
                            onClick={() => router.push('/dashboard/youth')}
                            className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition-colors"
                        >
                            <span className="text-white font-bold text-sm">UA</span>
                        </button>

                        {/* Search Bar */}
                        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:block">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search..."
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                                />
                            </div>
                        </form>
                    </div>

                    {/* Center: Main Navigation Icons */}
                    <div className="flex items-center gap-1 flex-1 justify-center">
                        <NavIcon
                            icon={
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            }
                            label="Events"
                            onClick={() => router.push('/dashboard/youth/events')}
                        />
                        <NavIcon
                            icon={
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            }
                            label="Groups"
                            onClick={() => router.push('/dashboard/youth/groups')}
                        />
                        <NavIcon
                            icon={
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                </svg>
                            }
                            label="Rewards"
                            onClick={() => router.push('/dashboard/youth/rewards')}
                        />
                        {/* <NavIcon
                            icon={
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            }
                            label="Booking"
                            onClick={() => router.push('/dashboard/youth/booking')}
                        /> 
                        */}
                    </div>

                    {/* Right: Notifications, News, Messages, User */}
                    <div className="flex items-center gap-2 flex-1 justify-end">
                        {/* --- NOTIFICATIONS WITH BADGE --- */}
                        <NavIcon
                            icon={
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            }
                            label="Notifications"
                            onClick={() => router.push('/dashboard/youth/notifications')}
                            badge={unreadCount} // <--- PASS BADGE COUNT
                        />
                        
                        <NavIcon
                            icon={
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                </svg>
                            }
                            label="News"
                            onClick={() => router.push('/dashboard/youth/news')}
                        />
                        <NavIcon
                            icon={
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            }
                            label="Messages"
                            onClick={() => router.push('/dashboard/youth/messages')}
                        />
                        {/* User Avatar */}
                        <button
                            onClick={() => router.push('/dashboard/youth/profile')}
                            className="flex-shrink-0 ml-2"
                        >
                            {user ? (
                                <Avatar
                                    src={user.avatar || null}
                                    alt={`${user.first_name} ${user.last_name}`}
                                    firstName={user.first_name || ''}
                                    lastName={user.last_name || ''}
                                    size="md"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-300"></div>
                            )}
                        </button>

                        {/* Three Dots Menu */}
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
                                title="More options"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                            </button>

                            {/* Flyout Menu */}
                            {showMenu && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                    <button
                                        onClick={() => {
                                            router.push('/dashboard/youth/settings');
                                            setShowMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                        Settings
                                    </button>
                                    <button
                                        onClick={() => {
                                            router.push('/dashboard/youth/help');
                                            setShowMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                        Help & Support
                                    </button>
                                    <hr className="my-1 border-gray-200" />
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setShowMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}

// --- UPDATED NAV ICON COMPONENT ---

interface NavIconProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    badge?: number; // <--- NEW PROP
}

function NavIcon({ icon, label, onClick, badge }: NavIconProps) {
    return (
        <button
            onClick={onClick}
            className="relative flex items-center justify-center w-12 h-12 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-colors group"
            title={label}
        >
            {icon}
            
            {/* --- BADGE RENDERER --- */}
            {badge !== undefined && badge > 0 && (
                <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border border-white">
                    {badge > 9 ? '9+' : badge}
                </span>
            )}

            {/* Tooltip on hover */}
            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {label}
            </span>
        </button>
    );
}
