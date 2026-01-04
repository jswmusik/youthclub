'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { ShieldAlert } from 'lucide-react';
import { BackgroundGlow } from '@/components/BackgroundGlow';

// Helper function to get admin dashboard URL based on role
const getAdminDashboardUrl = (role: string): string | null => {
    switch (role) {
        case 'SUPER_ADMIN':
            return '/admin/super';
        case 'MUNICIPALITY_ADMIN':
            return '/admin/municipality';
        case 'CLUB_ADMIN':
            return '/admin/club';
        default:
            return null;
    }
};

// List of public/auth paths that authenticated users should not navigate back to
const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/'];

export default function GuardianLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const t = useTranslations('errors');
    const historyCleared = useRef(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);
    
    const darkMode = !mounted || theme === 'dark';

    // For unverified guardians, ONLY the verify tab and children tab on the profile page is allowed
    // They cannot access settings, other tabs, or any other guardian pages
    const isOnVerifyTab = pathname === '/dashboard/guardian/profile' && searchParams.get('tab') === 'verify';
    const isOnChildrenTab = pathname === '/dashboard/guardian/profile' && searchParams.get('tab') === 'children';
    const isOnProfilePage = pathname === '/dashboard/guardian/profile';

    // Clear browser history to prevent back navigation to public pages
    useEffect(() => {
        if (!loading && user && user.role === 'GUARDIAN' && !historyCleared.current) {
            // Replace the current history state to prevent going back to public pages
            // This effectively makes the dashboard the "start" of the navigation history
            if (typeof window !== 'undefined') {
                // Clear the history by replacing state
                const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
                window.history.replaceState(null, '', fullPath);
                historyCleared.current = true;
            }
        }
    }, [loading, user, pathname, searchParams]);

    // Handle popstate (back button) to prevent navigation to public pages
    useEffect(() => {
        if (!loading && user && user.role === 'GUARDIAN') {
            const handlePopState = () => {
                // If user tries to navigate back to a public page, redirect to dashboard
                const currentPath = window.location.pathname;
                if (publicPaths.some(p => currentPath === p || currentPath.startsWith(p + '/'))) {
                    router.replace('/dashboard/guardian');
                }
            };

            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [loading, user, router]);

    useEffect(() => {
        if (!loading) {
            // If not logged in, redirect to login
            if (!user) {
                router.replace('/login');
                return;
            }

            // If admin role, redirect to their dashboard
            const adminUrl = getAdminDashboardUrl(user.role);
            if (adminUrl) {
                router.replace(adminUrl);
                return;
            }

            // If user is a Youth Member, show modal (handled in render)
            // Don't redirect here - let the render logic show the modal
            
            // If user is unverified guardian, they can ONLY access the verify or children tab
            if (user.role === 'GUARDIAN' && user.verification_status !== 'VERIFIED') {
                // If not on verify or children tab, redirect to verify
                if (!isOnVerifyTab && !isOnChildrenTab) {
                    router.replace('/dashboard/guardian/profile?tab=verify');
                }
            }
        }
    }, [loading, user, pathname, searchParams, isOnVerifyTab, isOnChildrenTab, router]);

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]"></div>
            </div>
        );
    }

    // If not logged in, don't render (redirect to login is happening)
    if (!user) {
        return null;
    }

    // If admin role, don't render (redirect to admin dashboard is happening)
    if (getAdminDashboardUrl(user.role)) {
        return null;
    }

    // Security check: Show modal only if user is YOUTH_MEMBER trying to access GUARDIAN pages
    if (user.role !== 'GUARDIAN') {
        // Only show modal for YOUTH_MEMBER role (cross-role access)
        if (user.role === 'YOUTH_MEMBER') {
            return (
                <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
                    <div className={`text-center p-8 sm:p-10 rounded-xl border max-w-md mx-4 ${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' : 'bg-white border-[#4D4DA4]/15 shadow-lg'}`}>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--brand-red)]/20 flex items-center justify-center">
                            <ShieldAlert className="w-8 h-8 text-[var(--brand-red)]" />
                        </div>
                        <h2 className={`text-xl font-bold mb-2 ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>
                            {t('accessDenied')}
                        </h2>
                        <p className={`mb-6 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                            {t('guardianAccountRequired')}
                        </p>
                        <button
                            onClick={() => router.push('/dashboard/youth')}
                            className="w-full bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold py-3 px-6 rounded-xl hover:bg-[var(--brand-primary)]/80 transition-colors"
                        >
                            {t('goToYouthDashboard')}
                        </button>
                    </div>
                </div>
            );
        }
        // For any other role, redirect to login
        router.replace('/login');
        return null;
    }

    return (
        <>
            <BackgroundGlow variant="guardian" />
            {children}
        </>
    );
}
