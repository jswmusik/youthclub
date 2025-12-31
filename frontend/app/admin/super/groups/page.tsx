'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import GroupManager from '@/app/components/GroupManager';
import { Layers } from 'lucide-react';

function GroupManagerPageContent() {
  return (
    <GroupManager basePath="/admin/super/groups" />
  );
}

function LoadingFallback() {
  const t = useTranslations('groupsAdmin');
  return (
    <div className="flex items-center justify-center gap-3 py-20">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
        <Layers className="h-5 w-5 text-white" />
      </div>
      <span className="text-[var(--brand-light)]/50">{t('loading')}</span>
    </div>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-7xl sm:mx-auto sm:px-6">
        <Suspense fallback={<LoadingFallback />}>
          <GroupManagerPageContent />
        </Suspense>
      </div>
    </div>
  );
}
