'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import NewsArticleReader from '../../../../components/NewsArticleReader';

function NewsArticleReaderContent() {
  const { id } = useParams() as { id: string };
  return (
    <NewsArticleReader 
      articleId={id} 
      backLink="/admin/super/news-feed" 
    />
  );
}

export default function SuperAdminArticlePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading article...</div>
      </div>
    }>
      <NewsArticleReaderContent />
    </Suspense>
  );
}