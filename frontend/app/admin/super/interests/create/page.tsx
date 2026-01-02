'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import InterestForm from '@/app/components/InterestForm';
import { Heart } from 'lucide-react';

function LoadingState() {
  const t = useTranslations('interests.form');
  
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
          <Heart className="w-8 h-8 text-[var(--dark-900)]" />
        </div>
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">{t('loading')}</div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <Suspense fallback={<LoadingState />}>
        <InterestForm redirectPath="/admin/super/interests" />
      </Suspense>
    </div>
  );
}

