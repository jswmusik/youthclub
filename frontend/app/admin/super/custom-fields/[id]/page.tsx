'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import CustomFieldDetailView from '../../../../components/CustomFieldDetailView';
import { Settings2 } from 'lucide-react';

function LoadingFallback() {
  const t = useTranslations('customFields.detail');
  
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
        <Settings2 className="w-6 h-6 text-[var(--dark-900)]" />
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">{t('loading')}</div>
    </div>
  );
}

function CustomFieldDetailPageContent() {
  const { id } = useParams() as { id: string };
  
  return (
    <CustomFieldDetailView fieldId={id} basePath="/admin/super/custom-fields" />
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <LoadingFallback />
    }>
      <CustomFieldDetailPageContent />
    </Suspense>
  );
}
