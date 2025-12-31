'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import YouthManager from '@/app/components/YouthManager';

function YouthManagerPageContent() {
  return (
    <div className="py-4 sm:py-6 md:py-8 px-0">
      <YouthManager basePath="/admin/super/youth" scope="SUPER" />
    </div>
  );
}

function LoadingFallback() {
  const t = useTranslations('youthManager');
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--brand-light)]/60">{t('skeleton.loading')}</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <YouthManagerPageContent />
    </Suspense>
  );
}
