'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Newspaper } from 'lucide-react';
import NewsArticleReader from '../../../../components/NewsArticleReader';

function NewsArticleReaderContent() {
  const { id } = useParams() as { id: string };
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <NewsArticleReader 
        articleId={id} 
        backLink="/admin/super/news-feed" 
      />
    </div>
  );
}

export default function SuperAdminArticlePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Newspaper className="w-8 h-8 text-white" />
          </div>
          <div className="w-8 h-8 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--brand-light)]/60">Loading article...</p>
        </div>
      </div>
    }>
      <NewsArticleReaderContent />
    </Suspense>
  );
}