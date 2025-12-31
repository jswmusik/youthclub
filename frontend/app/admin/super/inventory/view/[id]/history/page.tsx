'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import ItemHistoryView from '@/app/components/inventory/ItemHistoryView';
import { History } from 'lucide-react';

function LoadingFallback() {
  const t = useTranslations('inventoryAdmin.history');
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
        <History className="w-6 h-6 text-white" />
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">{t('loading')}</div>
    </div>
  );
}

function ItemHistoryPageContent() {
  const params = useParams();
  
  return (
    <div className="py-4 sm:py-8 px-0">
      <ItemHistoryView itemId={params.id as string} basePath="/admin/super/inventory" />
    </div>
  );
}

export default function ItemHistoryPage() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <Suspense fallback={<LoadingFallback />}>
        <ItemHistoryPageContent />
      </Suspense>
    </div>
  );
}
