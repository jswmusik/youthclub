'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';
import ArticleDetailView from '@/app/components/ArticleDetailView';

function LoadingFallback() {
  const t = useTranslations('articleDetail');
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mx-auto mb-4 animate-pulse">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <div className="w-12 h-12 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--brand-light)]/60">{t('loading')}</p>
      </div>
    </div>
  );
}

function ArticleDetailViewContent() {
  const { id } = useParams() as { id: string };
  return (
    <div className="py-4 sm:py-6 md:py-8 px-0">
      <ArticleDetailView articleId={id} basePath="/admin/super/news" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ArticleDetailViewContent />
    </Suspense>
  );
}

