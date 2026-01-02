'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function YouthLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const t = useTranslations('errors');

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

            // If user is a Guardian, show modal (handled in render)
            // Don't redirect here - let the render logic show the modal
        }
    }, [loading, user, router]);

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

    // Security check: Show modal only if user is GUARDIAN trying to access YOUTH pages
    if (user.role !== 'YOUTH_MEMBER') {
        // Only show modal for GUARDIAN role (cross-role access)
        if (user.role === 'GUARDIAN') {
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
                            {t('youthAccountRequired')}
                        </p>
                        <button
                            onClick={() => router.push('/dashboard/guardian')}
                            className="w-full bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold py-3 px-6 rounded-xl hover:bg-[var(--brand-primary)]/80 transition-colors"
                        >
                            {t('goToGuardianDashboard')}
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
            <BackgroundGlow variant="youth" />
            {children}
        </>
    );
}

