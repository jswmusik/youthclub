'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useTranslations } from 'next-intl';
import { ShieldAlert } from 'lucide-react';
import { BackgroundGlow } from '@/components/BackgroundGlow';

export default function YouthLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const t = useTranslations('errors');

    useEffect(() => {
        // If user is loaded and is a Guardian, redirect them to guardian dashboard
        if (!loading && user && user.role === 'GUARDIAN') {
            router.replace('/dashboard/guardian');
        }
    }, [loading, user, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--dark-900)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]"></div>
            </div>
        );
    }

    // Security check: Ensure user is actually a Youth Member
    if (!user || user.role !== 'YOUTH_MEMBER') {
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

    return (
        <>
            <BackgroundGlow variant="youth" />
            {children}
        </>
    );
}

