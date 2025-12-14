// frontend/app/components/NavBar.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from './posts/PostCard';
import { fetchUnreadNotificationCount, visits } from '../../lib/api';
import { messengerApi } from '../../lib/messenger-api'; // Import messengerApi
import ActiveVisitModal from './visits/ActiveVisitModal';

interface NavBarProps {
    onMenuToggle?: () => void;
}

export default function NavBar({ onMenuToggle }: NavBarProps) {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0); // Notifications
    const [messageUnreadCount, setMessageUnreadCount] = useState(0); // Messages
    const [activeVisit, setActiveVisit] = useState<{id: number, is_checked_in: boolean, club_name?: string, check_in_at?: string} | null>(null);
    const [showVisitModal, setShowVisitModal] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        // Redirect to a dedicated search page with the query
        router.push(`/dashboard/youth/search?q=${encodeURIComponent(searchQuery)}`);
        
        // Optional: Clear search after navigating
        // setSearchQuery('');
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    // --- Fetch Unread Counts (Notifications & Messages) ---
    useEffect(() => {
        const loadCounts = async () => {
            if (!user) return;

            try {
                const [notifRes, msgRes] = await Promise.all([
                    fetchUnreadNotificationCount(),
                    messengerApi.getUnreadCount()
                ]);
                setUnreadCount(notifRes.data.count);
                setMessageUnreadCount(msgRes.data.count);
            } catch (error) {
                console.error("Failed to load counts", error);
            }
        };

        loadCounts();
        const interval = setInterval(loadCounts, 60000);
        return () => clearInterval(interval);
    }, [user]);

    // --- Check Active Visit Status (for Youth Members) ---
    useEffect(() => {
        if (!user || user.role !== 'YOUTH_MEMBER') return;

        const checkStatus = async () => {
            try {
                const res = await visits.getMyActiveVisit();
                setActiveVisit(res.data);
            } catch (e) {
                console.error(e);
                setActiveVisit(null);
            }
        };
        
        checkStatus();
        const interval = setInterval(checkStatus, 30000); // Poll every 30s
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
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-[#262626] shadow-lg">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-14">
                    {/* Left: Logo and Search */}
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={onMenuToggle}
                            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:bg-[#121212] hover:text-[#6D6DD4] transition-colors flex-shrink-0"
                            title="Menu"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                            </svg>
                        </button>
                        
                        {/* UA Logo */}
                        <button
                            onClick={() => router.push('/dashboard/youth')}
                            className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:opacity-80 transition-opacity"
                        >
                            <img 
                                src="/ua-logo-stylized.png" 
                                alt="Ungdomsappen Logo" 
                                className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded-full"
                            />
                        </button>

                        {/* Search Bar - Hidden on mobile */}
                        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:block">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search..."
                                    className="block w-full pl-10 pr-3 py-2 border border-[#262626] rounded-full bg-[#121212] text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4D4DA4] focus:border-[#4D4DA4] transition-colors"
                                />
                            </div>
                        </form>
                    </div>

                    {/* Center: Main Navigation Icons */}
                    <div className="flex items-center gap-0.5 sm:gap-1 flex-1 justify-center min-w-0 pr-2 sm:pr-4">
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h-4v-4H8m13-9v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2M5 3v2m0 12v2m0-6v2m14-8v2m0 6v2m-4-6h2m-6 0h2" />
                                </svg>
                            }
                            label="Scan"
                            onClick={() => router.push('/dashboard/youth/scan')}
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
                        <NavIcon
                            icon={
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            }
                            label="Borrow"
                            onClick={() => router.push('/dashboard/youth/inventory')}
                        />
                    </div>
                    
                    {/* Divider between action buttons and checked-in indicator */}
                    {activeVisit?.is_checked_in && (
                        <div className="h-6 w-px bg-[#262626] mx-2 sm:mx-4"></div>
                    )}
                    
                    {/* Divider between action buttons and right section (when no checked-in) */}
                    {!activeVisit?.is_checked_in && (
                        <div className="h-6 w-px bg-[#262626] mx-2 sm:mx-4 hidden sm:block"></div>
                    )}

                    {/* Right: Checked In Indicator, Notifications, Messages, User */}
                    <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end">
                        {/* Active Visit Indicator - Compact Pill */}
                        {activeVisit?.is_checked_in && (
                            <>
                                {/* Desktop: Full pill with text */}
                                <button 
                                    onClick={() => setShowVisitModal(true)}
                                    className="hidden md:flex items-center gap-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300 hover:shadow-sm px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-500/30 transition-all group"
                                    title={`Checked in at ${activeVisit.club_name}`}
                                >
                                    <div className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </div>
                                    <span className="max-w-[100px] truncate">
                                        {activeVisit.club_name}
                                    </span>
                                </button>
                                
                                {/* Mobile: Minified indicator */}
                                <button 
                                    onClick={() => setShowVisitModal(true)}
                                    className="md:hidden flex items-center justify-center w-8 h-8 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-full border border-emerald-500/30 transition-all"
                                    title={`Checked in at ${activeVisit.club_name}`}
                                >
                                    <div className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </div>
                                </button>
                                
                                {/* The Modal */}
                                <ActiveVisitModal 
                                    isOpen={showVisitModal} 
                                    onClose={() => setShowVisitModal(false)}
                                    visit={activeVisit}
                                    onCheckout={() => setActiveVisit(null)} // Clear state immediately
                                />
                                
                                {/* Divider after checked in indicator */}
                                <div className="h-6 w-px bg-[#262626] mx-2 sm:mx-4"></div>
                            </>
                        )}
                        <NavIcon
                            icon={
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                </svg>
                            }
                            label="Messages"
                            onClick={() => router.push('/dashboard/youth/messages')}
                            badge={messageUnreadCount}
                        />
                        
                        {/* --- NOTIFICATIONS WITH BADGE (closer to avatar) --- */}
                        <div className="flex items-center gap-1">
                            <NavIcon
                                icon={
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                                    </svg>
                                }
                                label="Notifications"
                                onClick={() => router.push('/dashboard/youth/notifications')}
                                badge={unreadCount}
                            />
                            {/* User Avatar */}
                            <button
                                onClick={() => router.push('/dashboard/youth/profile')}
                                className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8"
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
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#121212] border border-[#262626]"></div>
                            )}
                            </button>
                        </div>

                        {/* Three Dots Menu */}
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-gray-400 hover:bg-[#121212] hover:text-[#6D6DD4] transition-colors flex-shrink-0"
                                title="More options"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                                </svg>
                            </button>

                            {/* Flyout Menu */}
                            {showMenu && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-[#121212] rounded-lg shadow-xl border border-[#262626] py-1 z-50">
                                    <button
                                        onClick={() => {
                                            router.push('/dashboard/youth/settings');
                                            setShowMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a] hover:text-[#6D6DD4] transition-colors"
                                    >
                                        Settings
                                    </button>
                                    <button
                                        onClick={() => {
                                            router.push('/dashboard/youth/help');
                                            setShowMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a] hover:text-[#6D6DD4] transition-colors"
                                    >
                                        Help & Support
                                    </button>
                                    <hr className="my-1 border-[#262626]" />
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setShowMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-[#FF5485] hover:bg-[#1a1a1a] transition-colors"
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
            className="relative flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 rounded-lg text-gray-400 hover:bg-[#121212] hover:text-[#6D6DD4] transition-colors group flex-shrink-0"
            title={label}
        >
            <span className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                {icon}
            </span>
            
            {/* --- BADGE RENDERER --- */}
            {badge !== undefined && badge > 0 && (
                <span className="absolute top-1 right-1 sm:top-2 sm:right-2 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-[#FF5485] text-[9px] sm:text-[10px] font-bold text-white border border-black">
                    {badge > 9 ? '9+' : badge}
                </span>
            )}

            {/* Tooltip on hover */}
            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-[#121212] border border-[#262626] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                {label}
            </span>
        </button>
    );
}
