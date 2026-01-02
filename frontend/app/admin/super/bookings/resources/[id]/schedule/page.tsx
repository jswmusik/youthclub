'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar } from 'lucide-react';
import ScheduleEditor from '../../../../../../components/bookings/ScheduleEditor';

function SchedulePageContent() {
  const t = useTranslations('bookingsAdmin.schedule');
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-6 md:py-8 px-0">
      {/* Header */}
      <div className="space-y-4 px-4 sm:px-6 mb-6">
        {/* Back button */}
        <Link 
          href="/admin/super/bookings/resources"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToResources')}
        </Link>
        
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[var(--dark-900)]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
            <p className="text-[var(--brand-light)]/50 text-sm">{t('description')}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6">
        <ScheduleEditor resourceId={Number(id)} />
      </div>
    </div>
  );
}

function LoadingFallback() {
  const t = useTranslations('bookingsAdmin.schedule');
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-[var(--brand-primary)] animate-pulse">
          <Calendar className="w-6 h-6 text-[var(--dark-900)]" />
        </div>
        <p className="text-[var(--brand-light)]/60">{t('loading')}</p>
      </div>
    </div>
  );
}

export default function SuperResourceSchedulePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SchedulePageContent />
    </Suspense>
  );
}
