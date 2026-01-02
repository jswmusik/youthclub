'use client';

import { useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useTranslations } from 'next-intl';
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

export default function GuardianLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const t = useTranslations('errors');

    // For unverified guardians, ONLY the verify tab and children tab on the profile page is allowed
    // They cannot access settings, other tabs, or any other guardian pages
    const isOnVerifyTab = pathname === '/dashboard/guardian/profile' && searchParams.get('tab') === 'verify';
    const isOnChildrenTab = pathname === '/dashboard/guardian/profile' && searchParams.get('tab') === 'children';
    const isOnProfilePage = pathname === '/dashboard/guardian/profile';

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
            <div className="min-h-screen flex items-center justify-center bg-[var(--dark-900)]">
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
                <div className="min-h-screen flex items-center justify-center bg-[var(--dark-900)]">
                    <div className="text-center p-8 sm:p-10 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] max-w-md mx-4">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--brand-red)]/20 flex items-center justify-center">
                            <ShieldAlert className="w-8 h-8 text-[var(--brand-red)]" />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--brand-light)] mb-2">
                            {t('accessDenied')}
                        </h2>
                        <p className="text-[var(--brand-light)]/60 mb-6">
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
