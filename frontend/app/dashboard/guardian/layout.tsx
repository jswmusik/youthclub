'use client';

import { useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useTranslations } from 'next-intl';
import { ShieldAlert } from 'lucide-react';
import { BackgroundGlow } from '@/components/BackgroundGlow';

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
        // If user is a Youth Member, redirect them to youth dashboard
        if (!loading && user && user.role === 'YOUTH_MEMBER') {
            router.replace('/dashboard/youth');
            return;
        }
        
        // If user is unverified guardian, they can ONLY access the verify or children tab
        if (!loading && user && user.role === 'GUARDIAN' && user.verification_status !== 'VERIFIED') {
            // If not on verify or children tab, redirect to verify
            if (!isOnVerifyTab && !isOnChildrenTab) {
                router.replace('/dashboard/guardian/profile?tab=verify');
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

    // Security check: Ensure user is actually a Guardian
    if (!user || user.role !== 'GUARDIAN') {
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

    return (
        <>
            <BackgroundGlow variant="guardian" />
            {children}
        </>
    );
}
