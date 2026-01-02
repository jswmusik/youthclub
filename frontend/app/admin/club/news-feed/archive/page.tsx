'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, Archive } from 'lucide-react';
import NewsArchive from '../../../../components/NewsArchive';

function NewsArchiveContent() {
  const t = useTranslations('newsArchive');
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 sm:px-0">
        {/* Back Button */}
        <Link 
          href="/admin/club/news-feed"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium w-fit"
        >
          <ArrowLeft className="h-4 w-4" /> {t('backToFeed')}
        </Link>
        
        {/* Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <Archive className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <NewsArchive basePath="/admin/club/news-feed" publishedOnly={true} />
    </div>
  );
}

function LoadingFallback() {
  const t = useTranslations('newsArchive');
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--brand-primary)] flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Archive className="w-8 h-8 text-[var(--dark-900)]" />
        </div>
        <div className="w-8 h-8 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--brand-light)]/60">{t('loading')}</p>
      </div>
    </div>
  );
}

export default function ClubAdminNewsArchive() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewsArchiveContent />
    </Suspense>
  );
}

