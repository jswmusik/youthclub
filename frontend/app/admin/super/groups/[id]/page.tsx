'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import GroupDetailView from '@/app/components/GroupDetailView';
import { Layers } from 'lucide-react';

function DetailPageContent() {
  const { id } = useParams() as { id: string };
  return (
    <GroupDetailView groupId={id} basePath="/admin/super/groups" />
  );
}

function LoadingFallback() {
  const t = useTranslations('groupsAdmin.detail');
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse mx-auto mb-4">
          <Layers className="h-6 w-6 text-white" />
        </div>
        <p className="text-[var(--brand-light)]/60">{t('loading')}</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DetailPageContent />
    </Suspense>
  );
}
