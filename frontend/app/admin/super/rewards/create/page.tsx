'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import RewardForm from '../../../../components/RewardForm';
import { Gift } from 'lucide-react';

function RewardCreatePageContent() {
  return <RewardForm redirectPath="/admin/super/rewards" />;
}

function LoadingFallback() {
  const t = useTranslations('rewardsAdmin.form');
  return (
    <div className="bg-[var(--dark-900)] min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="flex flex-col items-center text-[var(--brand-light)]/50">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mb-4 animate-pulse">
          <Gift className="w-8 h-8 text-white" />
        </div>
        <p className="text-lg font-medium">{t('loading')}</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RewardCreatePageContent />
    </Suspense>
  );
}
