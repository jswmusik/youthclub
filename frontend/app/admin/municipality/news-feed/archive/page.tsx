'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, Archive } from 'lucide-react';
import NewsArchive from '../../../../components/NewsArchive';

function NewsArchiveContent() {
  const t = useTranslations('newsArchive');
  
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      {/* Header */}
      <div className="bg-[var(--dark-800)] border-b border-[var(--dark-600)]">
        <div className="sm:max-w-6xl sm:mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/municipality/news-feed"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t('backToFeed')}</span>
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                <Archive className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
                <p className="text-sm text-[var(--brand-light)]/50 mt-0.5">{t('description')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="sm:max-w-6xl sm:mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <NewsArchive basePath="/admin/municipality/news-feed" publishedOnly={true} />
      </div>
    </div>
  );
}

function LoadingFallback() {
  const t = useTranslations('newsArchive');
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Archive className="w-8 h-8 text-white" />
        </div>
        <div className="w-8 h-8 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--brand-light)]/60">{t('loading')}</p>
      </div>
    </div>
  );
}

export default function MunicipalityAdminNewsArchive() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewsArchiveContent />
    </Suspense>
  );
}

