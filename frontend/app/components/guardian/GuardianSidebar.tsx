'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { 
    Home, 
    User, 
    CalendarDays, 
    Newspaper, 
    MessageCircle, 
    Search,
    Settings,
    ChevronRight,
    Bell
} from 'lucide-react';

interface GuardianSidebarProps {
    unfinishedCount?: number; // For questionnaires or notifications
    pendingApprovalsCount?: number; // For event approvals - can be passed or fetched
    darkMode?: boolean;
}

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    path: string;
    isActive: boolean;
    onClick: () => void;
    badge?: number | string;
    badgeColor?: 'pink' | 'orange';
    darkMode?: boolean;
}

function NavItem({ icon, label, path, isActive, onClick, badge, badgeColor = 'pink', darkMode }: NavItemProps) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                darkMode
                    ? isActive
                        ? 'bg-[var(--brand-secondary)] text-[var(--brand-light)] border border-[var(--brand-purple)]/30'
                        : 'text-[var(--brand-light)]/80 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]'
                    : isActive
                        ? 'bg-[#4D4DA4] text-white shadow-md shadow-[#4D4DA4]/20'
                        : 'text-gray-700 hover:bg-[#EBEBFE]'
            }`}
        >
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                darkMode
                    ? isActive 
                        ? 'bg-[var(--brand-primary)]/20' 
                        : 'bg-[var(--dark-600)] group-hover:bg-[var(--dark-500)]'
                    : isActive 
                        ? 'bg-white/20' 
                        : 'bg-gray-100 group-hover:bg-[#4D4DA4]/10'
            }`}>
                {icon}
            </span>
            <span className="flex-1 text-left font-medium">{label}</span>
            {badge !== undefined && badge !== 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center ${
                    darkMode
                        ? isActive 
                            ? 'bg-[var(--brand-primary)]/30 text-[var(--brand-primary)]' 
                            : badgeColor === 'orange'
                            ? 'bg-[var(--brand-peach)] text-[var(--dark-900)]'
                            : 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                        : isActive 
                            ? 'bg-white/20 text-white' 
                            : badgeColor === 'orange'
                            ? 'bg-orange-500 text-white'
                            : 'bg-[#FF5485] text-white'
                }`}>
                    {badge}
                </span>
            )}
            {isActive && (
                <ChevronRight className={`w-4 h-4 ${darkMode ? 'text-[var(--brand-primary)]' : 'opacity-60'}`} />
            )}
        </button>
    );
}

export default function GuardianSidebar({ unfinishedCount = 0, pendingApprovalsCount, darkMode }: GuardianSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations('sidebar');
    
    // Local state for pending approvals if not passed as prop
    const [localPendingCount, setLocalPendingCount] = useState<number>(0);
    
    // Fetch pending approvals count if not provided
    useEffect(() => {
        if (pendingApprovalsCount === undefined) {
            const fetchPendingApprovals = async () => {
                try {
                    // Use the same endpoint as GuardianEventList (with large page size)
                    const res = await api.get('/registrations/?page_size=1000');
                    const allRegs = res.data.results || res.data;
                    const pendingRegs = allRegs.filter((r: any) => 
                        r.status === 'PENDING_GUARDIAN'
                    );
                    setLocalPendingCount(pendingRegs.length);
                } catch (err) {
                    console.error('Failed to fetch pending approvals:', err);
                    setLocalPendingCount(0);
                }
            };
            fetchPendingApprovals();
        }
    }, [pendingApprovalsCount]);
    
    // Use prop if provided, otherwise use local state
    const pendingCount = pendingApprovalsCount !== undefined ? pendingApprovalsCount : localPendingCount;

    const checkActive = (path: string) => {
        if (path === '/dashboard/guardian' && pathname === '/dashboard/guardian') return true;
        if (path !== '/dashboard/guardian' && pathname?.startsWith(path)) return true;
        return false;
    };

    const navItems = [
        { 
            icon: <Home className="w-5 h-5" />, 
            label: t('dashboard') || "Dashboard", 
            path: '/dashboard/guardian',
        },
        { 
            icon: <User className="w-5 h-5" />, 
            label: t('myProfile') || "My Profile", 
            path: '/dashboard/guardian/profile',
        },
        { 
            icon: <CalendarDays className="w-5 h-5" />, 
            label: t('events') || "Events", 
            path: '/dashboard/guardian/events',
            badge: pendingCount > 0 ? pendingCount : undefined,
            badgeColor: 'orange' as const,
        },
        { 
            icon: <Newspaper className="w-5 h-5" />, 
            label: t('news') || "News", 
            path: '/dashboard/guardian/news',
        },
        { 
            icon: <MessageCircle className="w-5 h-5" />, 
            label: t('messages') || "Messages", 
            path: '/dashboard/guardian/messages',
        },
        { 
            icon: <Search className="w-5 h-5" />, 
            label: t('findClubs') || "Find Clubs", 
            path: '/dashboard/guardian/clubs',
        },
        { 
            icon: <Bell className="w-5 h-5" />, 
            label: t('notifications') || "Notifications", 
            path: '/dashboard/guardian/notifications',
            badge: unfinishedCount > 0 ? unfinishedCount : undefined
        },
        { 
            icon: <Settings className="w-5 h-5" />, 
            label: t('settings') || "Settings", 
            path: '/dashboard/guardian/settings',
        },
    ];

    return (
        <div className="w-full">
            <div className="mb-5 hidden md:block">
                <h1 className={`text-2xl mb-0.5 font-heading font-bold ${
                    darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
                }`}>
                    {t('guardianMenu') || "Guardian Menu"}
                </h1>
                <p className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                    {t('manageFamily') || "Manage your family"}
                </p>
            </div>

            <nav className="space-y-1.5">
                {navItems.map((item) => (
                    <NavItem
                        key={item.path}
                        icon={item.icon}
                        label={item.label}
                        path={item.path}
                        isActive={checkActive(item.path)}
                        onClick={() => router.push(item.path)}
                        badge={item.badge}
                        badgeColor={item.badgeColor}
                        darkMode={darkMode}
                    />
                ))}
            </nav>
        </div>
    );
}
