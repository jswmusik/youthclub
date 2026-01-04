// frontend/app/components/NavBar.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useAuth } from '../../context/AuthContext';
import { fetchUnreadNotificationCount, visits } from '../../lib/api';
import { messengerApi } from '../../lib/messenger-api';
import ActiveVisitModal from './visits/ActiveVisitModal';
import { useLicense } from '@/hooks/useLicense';
import { 
    Menu, 
    Calendar, 
    QrCode, 
    Gift, 
    Package, 
    Mail, 
    Bell, 
    MoreVertical,
    Settings,
    LogOut,
    ArrowLeft,
    Home,
    Users,
    ChevronLeft
} from 'lucide-react';

interface NavBarProps {
    onMenuToggle?: () => void;
    showBackButton?: boolean;
    darkMode?: boolean; // Deprecated - theme is now detected automatically
    hideBottomNavOnMobile?: boolean;
    hideCheckedInIndicator?: boolean;
}

export default function NavBar({ onMenuToggle, showBackButton = false, darkMode: _darkModeProp = false, hideBottomNavOnMobile = false, hideCheckedInIndicator = false }: NavBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { hasFeature } = useLicense();
    const t = useTranslations('nav');
    const tVisits = useTranslations('visits');
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [messageUnreadCount, setMessageUnreadCount] = useState(0);
    const [activeVisit, setActiveVisit] = useState<{id: number, is_checked_in: boolean, club_name?: string, check_in_at?: string} | null>(null);
    const [showVisitModal, setShowVisitModal] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    
    // Avoid hydration mismatch for theme
    useEffect(() => {
        setMounted(true);
    }, []);
    
    // Use theme directly for navbar visibility, default to light mode for initial render
    const darkMode = theme === 'dark';

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

    // Check Active Visit Status
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
        const interval = setInterval(checkStatus, 30000);
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
                <div className={`max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 ${!activeVisit?.is_checked_in && darkMode ? 'border-b border-[var(--dark-600)]' : !activeVisit?.is_checked_in ? '' : ''}`}>
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        {/* Left Section: Back, Menu, Logo */}
                        <div className="flex items-center gap-1 sm:gap-2">
                            {/* Back Button - Always visible */}
                            <button
                                onClick={() => router.back()}
                                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95 ${
                                    darkMode 
                                        ? 'text-[var(--brand-light)] hover:bg-[var(--dark-600)]' 
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                                title={t('goBack')}
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
                                    title={t('menu')}
                                >
                                    <Menu className="w-5 h-5" />
                                </button>
                            )}
                            
                            {/* Desktop Menu Toggle */}
                            {onMenuToggle && (
                                <button
                                    onClick={onMenuToggle}
                                    className={`hidden md:flex lg:hidden items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-95 ${
                                        darkMode 
                                            ? 'text-[var(--brand-light)] hover:bg-[var(--dark-600)] hover:text-[var(--brand-primary)]' 
                                            : 'text-gray-600 hover:bg-[#EBEBFE] hover:text-[#4D4DA4]'
                                    }`}
                                    title={t('menu')}
                                >
                                    <Menu className="w-5 h-5" />
                                </button>
                            )}
                            
                            {/* Logo */}
                            <button
                                onClick={() => router.push('/dashboard/youth')}
                                className="flex-shrink-0 h-8 sm:h-10 flex items-center hover:opacity-80 transition-opacity active:scale-95"
                            >
                                <img 
                                    src={darkMode ? "/ua-logo-2026.svg" : "/ua-logo.svg"} 
                                    alt="Ungdomsappen Logo" 
                                    className={`h-full w-auto object-contain ${darkMode ? 'brightness-0 invert' : ''}`}
                                />
                            </button>
                        </div>

                        {/* Center Section: Primary Actions (Desktop) */}
                        <div className="hidden md:flex items-center gap-2">
                            {/* Scan Button - Primary CTA */}
                            <button
                                onClick={() => router.push('/dashboard/youth/scan')}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                                    darkMode
                                        ? isActive('/dashboard/youth/scan')
                                            ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                                            : 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/80'
                                        : isActive('/dashboard/youth/scan')
                                            ? 'bg-[#FF8C42] text-white shadow-lg shadow-[#FF8C42]/25'
                                            : 'bg-[#FF8C42] text-white hover:bg-[#FF7A28] shadow-md hover:shadow-lg shadow-[#FF8C42]/20'
                                }`}
                            >
                                <QrCode className="w-5 h-5" />
                                <span>{t('checkIn')}</span>
                            </button>

                            {/* Events Button - Secondary CTA - Only show if events feature is enabled */}
                            {hasFeature('events') && (
                            <button
                                onClick={() => router.push('/dashboard/youth/events')}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                                    darkMode
                                        ? isActive('/dashboard/youth/events')
                                            ? 'bg-[var(--brand-secondary)] text-[var(--brand-light)] border border-[var(--brand-purple)]/30'
                                            : 'bg-[var(--dark-600)] text-[var(--brand-light)] hover:bg-[var(--brand-secondary)] border border-[var(--dark-500)]'
                                        : isActive('/dashboard/youth/events')
                                            ? 'bg-[#4D4DA4] text-white shadow-lg shadow-[#4D4DA4]/25'
                                            : 'bg-[#EBEBFE] text-[#4D4DA4] hover:bg-[#4D4DA4] hover:text-white'
                                }`}
                            >
                                <Calendar className="w-5 h-5" />
                                <span>{t('events')}</span>
                            </button>
                            )}

                            {/* Rewards - Only show if rewards feature is enabled */}
                            {hasFeature('rewards') && (
                            <button
                                onClick={() => router.push('/dashboard/youth/profile?tab=wallet')}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 ${
                                    darkMode
                                        ? isActive('/dashboard/youth/profile') && pathname?.includes('tab=wallet')
                                            ? 'bg-[var(--dark-600)] text-[var(--brand-third)]'
                                            : 'text-[var(--brand-light)]/70 hover:bg-[var(--dark-600)] hover:text-[var(--brand-third)]'
                                        : isActive('/dashboard/youth/profile') && pathname?.includes('tab=wallet')
                                            ? 'bg-[#EBEBFE] text-[#4D4DA4]'
                                            : 'text-gray-600 hover:bg-[#EBEBFE] hover:text-[#4D4DA4]'
                                }`}
                            >
                                <Gift className="w-5 h-5" />
                                <span className="hidden lg:inline">{t('rewards')}</span>
                            </button>
                            )}

                            {/* Borrow - Only show if inventory feature is enabled */}
                            {hasFeature('inventory') && (
                            <button
                                onClick={() => router.push('/dashboard/youth/inventory')}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95 ${
                                    darkMode
                                        ? isActive('/dashboard/youth/inventory')
                                            ? 'bg-[var(--dark-600)] text-[var(--brand-sky)]'
                                            : 'text-[var(--brand-light)]/70 hover:bg-[var(--dark-600)] hover:text-[var(--brand-sky)]'
                                        : isActive('/dashboard/youth/inventory')
                                            ? 'bg-[#EBEBFE] text-[#4D4DA4]'
                                            : 'text-gray-600 hover:bg-[#EBEBFE] hover:text-[#4D4DA4]'
                                }`}
                            >
                                <Package className="w-5 h-5" />
                                <span className="hidden lg:inline">{t('borrow')}</span>
                            </button>
                            )}
                        </div>

                        {/* Right Section: Notifications, Profile, Menu */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Messages - Only show if messenger feature is enabled */}
                            {hasFeature('messenger') && (
                            <button
                                onClick={() => router.push('/dashboard/youth/messages')}
                                className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95 ${
                                    darkMode
                                        ? 'text-[var(--brand-light)]/70 hover:bg-[var(--dark-600)] hover:text-[var(--brand-primary)]'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-[#4D4DA4]'
                                }`}
                                title={t('messages')}
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
                                onClick={() => router.push('/dashboard/youth/notifications')}
                                className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95 ${
                                    darkMode
                                        ? 'text-[var(--brand-light)]/70 hover:bg-[var(--dark-600)] hover:text-[var(--brand-primary)]'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-[#4D4DA4]'
                                }`}
                                title={t('notifications')}
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
                                onClick={() => router.push('/dashboard/youth/profile')}
                                className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden transition-all active:scale-95 ${
                                    darkMode
                                        ? 'ring-2 ring-[var(--dark-600)] hover:ring-[var(--brand-primary)]/50'
                                        : 'ring-2 ring-gray-200 hover:ring-[#4D4DA4]/30'
                                }`}
                                title={`${user?.first_name} ${user?.last_name}`}
                            >
                                {user?.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt={`${user.first_name} ${user.last_name}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : user ? (
                                    <div className={`w-full h-full flex items-center justify-center text-sm font-semibold ${
                                        darkMode 
                                            ? 'bg-[var(--brand-secondary)]/20 text-[var(--brand-purple)]' 
                                            : 'bg-[#EBEBFE] text-[#4D4DA4]'
                                    }`}>
                                        {(user.first_name?.[0] || '').toUpperCase()}{(user.last_name?.[0] || '').toUpperCase()}
                                    </div>
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
                                    title={t('moreOptions')}
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
                                                    router.push('/dashboard/youth/profile/edit');
                                                    setShowMenu(false);
                                                }}
                                                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 ${
                                                    darkMode
                                                        ? 'text-[var(--brand-light)] hover:bg-[var(--dark-500)]'
                                                        : 'text-gray-700 hover:bg-gray-100'
                                                }`}
                                            >
                                                <Settings className="w-5 h-5" />
                                                <span className="font-medium">{t('settings')}</span>
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
                                                <span className="font-medium">{t('logout')}</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Active Visit Indicator Bar - Only shows when checked in and not hidden */}
                {activeVisit?.is_checked_in && !hideCheckedInIndicator && (
                    <button 
                        onClick={() => setShowVisitModal(true)}
                        className={`w-full px-3 py-2 flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                            darkMode
                                ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-b border-[var(--brand-green)]/30 hover:bg-[var(--brand-green)]/30'
                                : 'bg-[var(--brand-green)]/10 text-[var(--brand-green)] border-b border-[var(--brand-green)]/20 hover:bg-[var(--brand-green)]/20'
                        }`}
                    >
                        <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-green)] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-green)]"></span>
                        </div>
                        <span>{tVisits('checkedInAt')} <strong>{activeVisit.club_name}</strong></span>
                        <span className="opacity-60">• {tVisits('tapToCheckOut')}</span>
                    </button>
                )}
                
                <ActiveVisitModal 
                    isOpen={showVisitModal} 
                    onClose={() => setShowVisitModal(false)}
                    visit={activeVisit}
                    onCheckout={() => setActiveVisit(null)}
                />
            </nav>

            {/* Mobile Bottom Navigation */}
            {!hideBottomNavOnMobile && (
            <div className={`fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom ${
                darkMode
                    ? 'bg-[var(--dark-800)] border-t border-[var(--dark-600)]'
                    : 'bg-white border-t border-gray-200'
            }`}>
                <div className="flex items-center justify-around px-2 py-2">
                    {/* Home */}
                    <MobileNavItem
                        icon={<Home className="w-5 h-5" />}
                        label={t('home')}
                        isActive={pathname === '/dashboard/youth'}
                        onClick={() => router.push('/dashboard/youth')}
                        darkMode={darkMode}
                    />

                    {/* Events - Only show if events feature is enabled */}
                    {hasFeature('events') && (
                    <MobileNavItem
                        icon={<Calendar className="w-5 h-5" />}
                        label={t('events')}
                        isActive={isActive('/dashboard/youth/events')}
                        onClick={() => router.push('/dashboard/youth/events')}
                        darkMode={darkMode}
                    />
                    )}

                    {/* Scan - Center Primary Button */}
                    <button
                        onClick={() => router.push('/dashboard/youth/scan')}
                        className="relative -mt-4 flex flex-col items-center justify-center"
                    >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                            darkMode
                                ? isActive('/dashboard/youth/scan')
                                    ? 'bg-[var(--brand-primary)]'
                                    : 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80'
                                : isActive('/dashboard/youth/scan')
                                    ? 'bg-[#FF8C42] shadow-lg shadow-[#FF8C42]/30'
                                    : 'bg-[#FF8C42] shadow-lg shadow-[#FF8C42]/25 hover:shadow-[#FF8C42]/40'
                        }`}>
                            <QrCode className={`w-7 h-7 ${darkMode ? 'text-[var(--dark-900)]' : 'text-white'}`} />
                        </div>
                        <span className={`text-[10px] font-semibold mt-1 ${
                            darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF8C42]'
                        }`}>{t('checkIn')}</span>
                        {/* Active visit indicator on scan button */}
                        {activeVisit?.is_checked_in && (
                            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                                darkMode ? 'bg-[var(--dark-800)]' : 'bg-white'
                            }`}>
                                <div className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-green)] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--brand-green)]"></span>
                                </div>
                            </div>
                        )}
                    </button>

                    {/* Rewards - Only show if rewards feature is enabled */}
                    {hasFeature('rewards') && (
                    <MobileNavItem
                        icon={<Gift className="w-5 h-5" />}
                        label={t('rewards')}
                        isActive={isActive('/dashboard/youth/profile') && pathname?.includes('tab=wallet')}
                        onClick={() => router.push('/dashboard/youth/profile?tab=wallet')}
                        darkMode={darkMode}
                    />
                    )}

                    {/* Groups - Only show if groups feature is enabled */}
                    {hasFeature('groups') && (
                    <MobileNavItem
                        icon={<Users className="w-5 h-5" />}
                        label={t('groups')}
                        isActive={isActive('/dashboard/youth/groups')}
                        onClick={() => router.push('/dashboard/youth/groups')}
                        darkMode={darkMode}
                    />
                    )}
                </div>
            </div>
            )}

            {/* Spacer for bottom nav on mobile */}
            {!hideBottomNavOnMobile && <div className="h-[72px] md:hidden" />}
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
    highlight?: boolean;
    darkMode?: boolean;
}

function MobileNavItem({ icon, label, isActive, onClick, badge, highlight, darkMode }: MobileNavItemProps) {
    return (
        <button
            onClick={onClick}
            className={`relative flex flex-col items-center justify-center w-14 py-1.5 rounded-xl transition-all active:scale-95 ${
                darkMode
                    ? isActive 
                        ? 'text-[var(--brand-primary)]' 
                        : 'text-[var(--brand-light)]/50 hover:text-[var(--brand-primary)]'
                    : isActive 
                        ? highlight 
                            ? 'text-[#4D4DA4]' 
                            : 'text-[#4D4DA4]'
                        : 'text-gray-500 hover:text-[#4D4DA4]'
            }`}
        >
            <span className={`transition-colors ${
                darkMode
                    ? isActive ? 'text-[var(--brand-primary)]' : ''
                    : isActive ? (highlight ? 'text-[#4D4DA4]' : 'text-[#4D4DA4]') : ''
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
