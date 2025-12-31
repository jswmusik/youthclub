'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../context/AuthContext';
import { Avatar } from '../posts/PostCard';
import { fetchUnreadNotificationCount } from '../../../lib/api';
import { messengerApi } from '../../../lib/messenger-api';
import { useLicense } from '@/hooks/useLicense';
import { 
    Menu, 
    Calendar, 
    Mail, 
    Bell, 
    MoreVertical,
    Settings,
    HelpCircle,
    LogOut,
    Home,
    Users,
    ChevronLeft,
    Search,
    Newspaper
} from 'lucide-react';

interface GuardianNavBarProps {
    onMenuToggle?: () => void;
    darkMode?: boolean;
}

export default function GuardianNavBar({ onMenuToggle, darkMode = false }: GuardianNavBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { hasFeature } = useLicense();
    const t = useTranslations('nav');
    const [showMenu, setShowMenu] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [messageUnreadCount, setMessageUnreadCount] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    // Check if current path matches
    const isActive = (path: string) => pathname?.startsWith(path);

    // Fetch Unread Counts
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
        <>
            {/* Top Navigation Bar - positioned below system alert if present */}
            <nav 
                className={`fixed left-0 right-0 z-50 ${
                    darkMode 
                        ? 'bg-[var(--dark-800)]' 
                        : 'bg-white border-b border-gray-200'
                }`}
                style={{ top: 'var(--system-alert-height, 0px)' }}
            >
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        {/* Left Section: Back, Menu, Logo */}
                        <div className="flex items-center gap-1 sm:gap-2">
                            {/* Back Button */}
                            <button
                                onClick={() => router.back()}
                                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95 ${
                                    darkMode 
                                        ? 'text-[var(--brand-light)] hover:bg-[var(--dark-600)]' 
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                                title={t('goBack') || 'Go back'}
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            
                            {/* Mobile Menu Toggle */}
                            {onMenuToggle && (
                                <button
                                    onClick={onMenuToggle}
                                    className={`md:hidden flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95 ${
                                        darkMode 
                                            ? 'text-[var(--brand-light)] hover:bg-[var(--dark-600)]' 
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                    title={t('menu') || 'Menu'}
                                >
                                    <Menu className="w-5 h-5" />
                                </button>
                            )}
                            
                            {/* Logo */}
                            <button
                                onClick={() => router.push('/dashboard/guardian')}
                                className="flex-shrink-0 h-8 sm:h-10 flex items-center hover:opacity-80 transition-opacity active:scale-95"
                            >
                                <img 
                                    src="/ua-icon-2026.svg" 
                                    alt="Ungdomsappen Logo" 
                                    className="h-full w-auto object-contain"
                                />
                            </button>
                        </div>

                        {/* Center Section: Primary Actions (Desktop) */}
                        <div className="hidden md:flex items-center gap-2">
                            {/* Events Button */}
                            {hasFeature('events') && (
                            <button
                                onClick={() => router.push('/dashboard/guardian/events')}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                                    darkMode
                                        ? isActive('/dashboard/guardian/events')
                                            ? 'bg-[var(--brand-secondary)] text-[var(--brand-light)] border border-[var(--brand-purple)]/30'
                                            : 'bg-[var(--dark-600)] text-[var(--brand-light)] hover:bg-[var(--brand-secondary)] border border-[var(--dark-500)]'
                                        : isActive('/dashboard/guardian/events')
                                            ? 'bg-[#4D4DA4] text-white shadow-lg shadow-[#4D4DA4]/25'
                                            : 'bg-[#EBEBFE] text-[#4D4DA4] hover:bg-[#4D4DA4] hover:text-white'
                                }`}
                            >
                                <Calendar className="w-5 h-5" />
                                <span>{t('events') || 'Events'}</span>
                            </button>
                            )}

                            {/* News Button */}
                            <button
                                onClick={() => router.push('/dashboard/guardian/news')}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 ${
                                    darkMode
                                        ? isActive('/dashboard/guardian/news')
                                            ? 'bg-[var(--dark-600)] text-[var(--brand-primary)]'
                                            : 'text-[var(--brand-light)]/70 hover:bg-[var(--dark-600)] hover:text-[var(--brand-primary)]'
                                        : isActive('/dashboard/guardian/news')
                                            ? 'bg-[#EBEBFE] text-[#4D4DA4]'
                                            : 'text-gray-600 hover:bg-[#EBEBFE] hover:text-[#4D4DA4]'
                                }`}
                            >
                                <Newspaper className="w-5 h-5" />
                                <span className="hidden lg:inline">{t('news') || 'News'}</span>
                            </button>

                            {/* Find Clubs Button */}
                            <button
                                onClick={() => router.push('/dashboard/guardian/clubs')}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 ${
                                    darkMode
                                        ? isActive('/dashboard/guardian/clubs')
                                            ? 'bg-[var(--dark-600)] text-[var(--brand-primary)]'
                                            : 'text-[var(--brand-light)]/70 hover:bg-[var(--dark-600)] hover:text-[var(--brand-primary)]'
                                        : isActive('/dashboard/guardian/clubs')
                                            ? 'bg-[#EBEBFE] text-[#4D4DA4]'
                                            : 'text-gray-600 hover:bg-[#EBEBFE] hover:text-[#4D4DA4]'
                                }`}
                            >
                                <Search className="w-5 h-5" />
                                <span className="hidden lg:inline">{t('findClubs') || 'Find Clubs'}</span>
                            </button>
                        </div>

                        {/* Right Section: Notifications, Profile, Menu */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Messages */}
                            {hasFeature('messenger') && (
                            <button
                                onClick={() => router.push('/dashboard/guardian/messages')}
                                className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95 ${
                                    darkMode
                                        ? 'text-[var(--brand-light)]/70 hover:bg-[var(--dark-600)] hover:text-[var(--brand-primary)]'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-[#4D4DA4]'
                                }`}
                                title={t('messages') || 'Messages'}
                            >
                                <Mail className="w-5 h-5" />
                                {messageUnreadCount > 0 && (
                                    <span className={`absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                                        darkMode
                                            ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                                            : 'bg-[#FF5485] text-white'
                                    }`}>
                                        {messageUnreadCount > 9 ? '9+' : messageUnreadCount}
                                    </span>
                                )}
                            </button>
                            )}
                            
                            {/* Notifications */}
                            <button
                                onClick={() => router.push('/dashboard/guardian/notifications')}
                                className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95 ${
                                    darkMode
                                        ? 'text-[var(--brand-light)]/70 hover:bg-[var(--dark-600)] hover:text-[var(--brand-primary)]'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-[#4D4DA4]'
                                }`}
                                title={t('notifications') || 'Notifications'}
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className={`absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                                        darkMode
                                            ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                                            : 'bg-[#FF5485] text-white'
                                    }`}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            
                            {/* User Avatar */}
                            <button
                                onClick={() => router.push('/dashboard/guardian/profile')}
                                className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden transition-all active:scale-95 ${
                                    darkMode
                                        ? 'ring-2 ring-[var(--dark-600)] hover:ring-[var(--brand-primary)]/50'
                                        : 'ring-2 ring-gray-200 hover:ring-[#4D4DA4]/30'
                                }`}
                                title={`${user?.first_name} ${user?.last_name}`}
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
                                    <div className={`w-full h-full flex items-center justify-center ${
                                        darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-100'
                                    }`}>
                                        <span className={`text-xs font-semibold ${
                                            darkMode ? 'text-[var(--brand-light)]' : 'text-gray-500'
                                        }`}>?</span>
                                    </div>
                                )}
                            </button>

                            {/* More Menu */}
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95 ${
                                        darkMode
                                            ? showMenu 
                                                ? 'bg-[var(--dark-600)] text-[var(--brand-primary)]' 
                                                : 'text-[var(--brand-light)]/70 hover:bg-[var(--dark-600)] hover:text-[var(--brand-primary)]'
                                            : showMenu 
                                                ? 'bg-gray-100 text-[#4D4DA4]' 
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-[#4D4DA4]'
                                    }`}
                                    title={t('moreOptions') || 'More options'}
                                >
                                    <MoreVertical className="w-5 h-5" />
                                </button>

                                {showMenu && (
                                    <>
                                        {/* Backdrop for mobile */}
                                        <div 
                                            className="fixed inset-0 z-40 md:hidden"
                                            onClick={() => setShowMenu(false)}
                                        />
                                        <div className={`fixed md:absolute right-3 md:right-0 top-14 md:top-full md:mt-2 w-[calc(100vw-24px)] md:w-52 max-w-[280px] rounded-xl py-2 z-50 overflow-hidden ${
                                            darkMode
                                                ? 'bg-[var(--dark-600)] border border-[var(--dark-500)] shadow-2xl'
                                                : 'bg-white shadow-2xl border border-gray-200'
                                        }`}>
                                            <button
                                                onClick={() => {
                                                    router.push('/dashboard/guardian/settings');
                                                    setShowMenu(false);
                                                }}
                                                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 ${
                                                    darkMode
                                                        ? 'text-[var(--brand-light)] hover:bg-[var(--dark-500)]'
                                                        : 'text-gray-700 hover:bg-gray-100'
                                                }`}
                                            >
                                                <Settings className="w-5 h-5" />
                                                <span className="font-medium">{t('settings') || 'Settings'}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    router.push('/dashboard/guardian/help');
                                                    setShowMenu(false);
                                                }}
                                                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 ${
                                                    darkMode
                                                        ? 'text-[var(--brand-light)] hover:bg-[var(--dark-500)]'
                                                        : 'text-gray-700 hover:bg-gray-100'
                                                }`}
                                            >
                                                <HelpCircle className="w-5 h-5" />
                                                <span className="font-medium">{t('help') || 'Help'}</span>
                                            </button>
                                            <hr className={`my-2 ${darkMode ? 'border-[var(--dark-500)]' : 'border-gray-100'}`} />
                                            <button
                                                onClick={() => {
                                                    handleLogout();
                                                    setShowMenu(false);
                                                }}
                                                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 ${
                                                    darkMode
                                                        ? 'text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10'
                                                        : 'text-[#FF5485] hover:bg-[#FF5485]/10'
                                                }`}
                                            >
                                                <LogOut className="w-5 h-5" />
                                                <span className="font-medium">{t('logout') || 'Log out'}</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Bottom Navigation */}
            <div className={`fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom ${
                darkMode
                    ? 'bg-[var(--dark-800)] border-t border-[var(--dark-600)]'
                    : 'bg-white border-t border-gray-200'
            }`}>
                <div className="flex items-center justify-around px-2 py-2">
                    {/* Home */}
                    <MobileNavItem
                        icon={<Home className="w-5 h-5" />}
                        label={t('home') || 'Home'}
                        isActive={pathname === '/dashboard/guardian'}
                        onClick={() => router.push('/dashboard/guardian')}
                        darkMode={darkMode}
                    />

                    {/* Events */}
                    {hasFeature('events') && (
                    <MobileNavItem
                        icon={<Calendar className="w-5 h-5" />}
                        label={t('events') || 'Events'}
                        isActive={isActive('/dashboard/guardian/events')}
                        onClick={() => router.push('/dashboard/guardian/events')}
                        darkMode={darkMode}
                    />
                    )}

                    {/* Find Clubs */}
                    <MobileNavItem
                        icon={<Search className="w-5 h-5" />}
                        label={t('findClubs') || 'Clubs'}
                        isActive={isActive('/dashboard/guardian/clubs')}
                        onClick={() => router.push('/dashboard/guardian/clubs')}
                        darkMode={darkMode}
                    />

                    {/* News */}
                    <MobileNavItem
                        icon={<Newspaper className="w-5 h-5" />}
                        label={t('news') || 'News'}
                        isActive={isActive('/dashboard/guardian/news')}
                        onClick={() => router.push('/dashboard/guardian/news')}
                        darkMode={darkMode}
                    />

                    {/* Children */}
                    <MobileNavItem
                        icon={<Users className="w-5 h-5" />}
                        label={t('children') || 'Children'}
                        isActive={isActive('/dashboard/guardian/children')}
                        onClick={() => router.push('/dashboard/guardian/children')}
                        darkMode={darkMode}
                    />
                </div>
            </div>

            {/* Spacer for fixed nav */}
            <div className="h-14 sm:h-16" />
            {/* Spacer for bottom nav on mobile */}
            <div className="h-[72px] md:hidden" />
        </>
    );
}

// Mobile Bottom Nav Item Component
interface MobileNavItemProps {
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick: () => void;
    badge?: number;
    darkMode?: boolean;
}

function MobileNavItem({ icon, label, isActive, onClick, badge, darkMode }: MobileNavItemProps) {
    return (
        <button
            onClick={onClick}
            className={`relative flex flex-col items-center justify-center w-14 py-1.5 rounded-xl transition-all active:scale-95 ${
                darkMode
                    ? isActive 
                        ? 'text-[var(--brand-primary)]' 
                        : 'text-[var(--brand-light)]/50 hover:text-[var(--brand-primary)]'
                    : isActive 
                        ? 'text-[#4D4DA4]'
                        : 'text-gray-500 hover:text-[#4D4DA4]'
            }`}
        >
            <span className={`transition-colors ${
                darkMode
                    ? isActive ? 'text-[var(--brand-primary)]' : ''
                    : isActive ? 'text-[#4D4DA4]' : ''
            }`}>
                {icon}
            </span>
            <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'font-semibold' : ''}`}>
                {label}
            </span>
            {badge !== undefined && badge > 0 && (
                <span className={`absolute top-0 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold ${
                    darkMode
                        ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                        : 'bg-[#FF5485] text-white'
                }`}>
                    {badge > 9 ? '9+' : badge}
                </span>
            )}
            {isActive && (
                <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                    darkMode ? 'bg-[var(--brand-primary)]' : 'bg-[#4D4DA4]'
                }`} />
            )}
        </button>
    );
}

