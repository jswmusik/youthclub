'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import ItemForm from '@/app/components/inventory/ItemForm';
import { Package } from 'lucide-react';

function LoadingFallback() {
  const t = useTranslations('inventoryAdmin.form');
  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-4xl sm:mx-auto sm:px-6 px-4">
        <div className="flex items-center justify-center gap-3 py-20">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
            <Package className="h-5 w-5 text-[var(--dark-900)]" />
          </div>
          <span className="text-[var(--brand-light)]/50">{t('loading')}</span>
        </div>
      </div>
    </div>
  );
}

function CreateItemPageContent() {
  return <ItemForm />;
}

export default function CreateItemPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CreateItemPageContent />
    </Suspense>
  );
}
