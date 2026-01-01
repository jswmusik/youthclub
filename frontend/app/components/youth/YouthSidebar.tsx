'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../context/AuthContext';
// License hook for feature gating
import { useLicense } from '../../../hooks/useLicense';
import { 
    Home, 
    QrCode, 
    Package, 
    CalendarCheck, 
    ClipboardList, 
    Users, 
    MapPin, 
    Newspaper,
    CalendarDays,
    ChevronRight
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';


interface YouthSidebarProps {
    activePath?: string;
    unfinishedCount?: number;
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
    disabled?: boolean;
    darkMode?: boolean;
}

function NavItem({ icon, label, path, isActive, onClick, badge, badgeColor = 'pink', disabled, darkMode }: NavItemProps) {
    if (disabled) {
        return (
            <button
                disabled
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-not-allowed ${
                    darkMode 
                        ? 'text-[var(--brand-light)]/30 bg-[var(--dark-700)]' 
                        : 'text-gray-400 bg-gray-50'
                }`}
            >
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    darkMode ? 'bg-[var(--dark-600)]' : 'bg-gray-100'
                }`}>
                    {icon}
                </span>
                <span className="flex-1 text-left font-medium">{label}</span>
            </button>
        );
    }

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
            {badge !== undefined && (
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

export default function YouthSidebar({ activePath, unfinishedCount = 0, darkMode }: YouthSidebarProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { hasFeature } = useLicense(); // Use license hook
    const t = useTranslations('sidebar');

    const checkActive = (path: string) => {
        if (!activePath) return false;
        if (path === '/dashboard/youth' && activePath === '/dashboard/youth') return true;
        if (path !== '/dashboard/youth' && activePath.startsWith(path)) return true;
        return false;
    };

    // Navigation items - FILTERED BY LICENSE
    const navItems = [
        // Always Visible (Core)
        { 
            icon: <Home className="w-5 h-5" />, 
            label: t('yourFeed'), 
            path: '/dashboard/youth',
        },
        // Core Check-in (Visits)
        { 
            icon: <QrCode className="w-5 h-5" />, 
            label: t('scanToCheckIn'), 
            path: '/dashboard/youth/scan',
        },
        // Feature: Inventory
        ...(hasFeature('inventory') ? [{ 
            icon: <Package className="w-5 h-5" />, 
            label: t('borrowItems'), 
            path: '/dashboard/youth/inventory',
        }] : []),
        // Feature: Bookings
        ...(hasFeature('bookings') ? [{ 
            icon: <CalendarCheck className="w-5 h-5" />, 
            label: t('bookings'), 
            path: '/dashboard/youth/bookings',
        }] : []),
        // Feature: Questionnaires
        ...(hasFeature('questionnaires') ? [{ 
            icon: <ClipboardList className="w-5 h-5" />, 
            label: t('questionnaires'), 
            path: '/dashboard/youth/questionnaires',
            badge: unfinishedCount > 0 ? unfinishedCount : undefined,
        }] : []),
        // Feature: Groups
        ...(hasFeature('groups') ? [{ 
            icon: <Users className="w-5 h-5" />, 
            label: t('groups'), 
            path: '/dashboard/youth/groups',
        }] : []),
        // Core Club Info
        { 
            icon: <MapPin className="w-5 h-5" />, 
            label: t('myClub'), 
            path: user?.preferred_club?.id ? `/dashboard/youth/club/${user.preferred_club.id}` : '',
            checkPath: '/dashboard/youth/club',
            disabled: !user?.preferred_club?.id,
        },
        // Feature: News (Posts)
        ...(hasFeature('posts') ? [{ 
            icon: <Newspaper className="w-5 h-5" />, 
            label: t('news'), 
            path: '/dashboard/youth/news',
        }] : []),
        // Feature: Events
        ...(hasFeature('events') ? [{ 
            icon: <CalendarDays className="w-5 h-5" />, 
            label: t('events'), 
            path: '/dashboard/youth/events',
        }] : []),
    ];

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-5 hidden md:block">
                <h1 className={`text-2xl mb-0.5 font-heading font-bold ${
                    darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
                }`}>
                    {t('menu')}
                </h1>
                <p className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                    {t('navigateDashboard')}
                </p>
            </div>

            {/* Navigation */}
            <nav className="space-y-1.5">
                {navItems.map((item) => (
                    <NavItem
                        key={item.path || item.label}
                        icon={item.icon}
                        label={item.label}
                        path={item.path}
                        isActive={checkActive(item.checkPath || item.path)}
                        onClick={() => item.path && router.push(item.path)}
                        badge={item.badge}
                        badgeColor={item.badgeColor}
                        disabled={item.disabled}
                        darkMode={darkMode}
                    />
                ))}
            </nav>

            {/* Theme Toggle */}
            <div className={`mt-6 pt-4 ${
                darkMode ? 'border-t border-[var(--dark-600)]' : 'border-t border-gray-100'
            }`}>
                <ThemeToggle showLabel className="w-full justify-center" />
            </div>

            {/* Footer hint */}
            <div className={`mt-4 hidden md:block`}>
                <p className={`text-[10px] text-center ${
                    darkMode ? 'text-[var(--brand-light)]/30' : 'text-gray-400'
                }`}>
                    {t('tapToNavigate')}
                </p>
            </div>
        </div>
    );
}
