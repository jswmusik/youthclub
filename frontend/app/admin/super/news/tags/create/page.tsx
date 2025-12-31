'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import TagForm from '@/app/components/TagForm';
import { Tag } from 'lucide-react';

function LoadingFallback() {
  const t = useTranslations('tagForm');
  return (
    <div className="py-4 sm:py-6 md:py-8 px-4 sm:px-0">
      <div className="sm:max-w-3xl sm:mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
            <Tag className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-2">
            <div className="h-7 w-40 bg-[var(--dark-700)] rounded-lg animate-pulse" />
            <div className="h-4 w-56 bg-[var(--dark-700)] rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="bg-[var(--dark-800)] rounded-2xl p-6 space-y-4">
          <div className="h-10 bg-[var(--dark-700)] rounded-xl animate-pulse" />
          <div className="h-10 bg-[var(--dark-700)] rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function TagFormPageContent() {
  return (
    <div className="py-4 sm:py-6 md:py-8 px-0">
      <TagForm redirectPath="/admin/super/news/tags" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TagFormPageContent />
    </Suspense>
  );
}

