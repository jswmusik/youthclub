'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import EventCalendar from '@/app/components/events/EventCalendar';
import Link from 'next/link';
import { ArrowLeft, Plus, Calendar } from 'lucide-react';

function EventCalendarPageContent() {
    const t = useTranslations('eventsAdmin.calendar');
    
    return (
        <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-6 md:py-8 px-0">
            {/* Header */}
            <div className="space-y-4 px-4 sm:px-6 mb-6">
                {/* Top row: Back button and New Event button */}
                <div className="flex items-center justify-between">
                    <Link href="/admin/super/events">
                        <button className="flex items-center gap-2 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] transition-colors text-sm font-medium">
                            <ArrowLeft className="h-4 w-4" />
                            {t('backToEvents')}
                        </button>
                    </Link>
                    <Link href="/admin/super/events/create">
                        <button className="flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-4 py-2.5 transition-all text-sm">
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">{t('newEvent')}</span>
                        </button>
                    </Link>
                </div>
                
                {/* Title and description */}
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
                    </div>
                    <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
                </div>
            </div>
            
            <div className="h-[calc(100vh-220px)] min-h-[600px] flex flex-col">
                <EventCalendar scope="SUPER" />
            </div>
        </div>
    );
}

function LoadingFallback() {
    const t = useTranslations('eventsAdmin.calendar');
    return (
        <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[var(--brand-light)]/60">{t('loading')}</p>
            </div>
        </div>
    );
}

export default function EventCalendarPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <EventCalendarPageContent />
        </Suspense>
    );
}
