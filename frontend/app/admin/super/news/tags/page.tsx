'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import TagManager from '@/app/components/TagManager';
import { Tag } from 'lucide-react';

function LoadingFallback() {
  const t = useTranslations('tagManager');
  return (
    <div className="py-4 sm:py-6 md:py-8 px-4 sm:px-6 md:px-8">
      <div className="flex items-center justify-center gap-3 py-20">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <Tag className="h-5 w-5 text-white" />
        </div>
        <span className="text-[var(--brand-light)]/50">{t('loading')}</span>
      </div>
    </div>
  );
}

function TagManagerPageContent() {
  return (
    <div className="py-4 sm:py-6 md:py-8 px-0">
      <TagManager basePath="/admin/super/news/tags" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TagManagerPageContent />
    </Suspense>
  );
}
