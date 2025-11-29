'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import ArticleDetailView from '@/app/components/ArticleDetailView';

function ArticleDetailViewContent() {
  const { id } = useParams() as { id: string };
  return (
    <ArticleDetailView articleId={id} basePath="/admin/super/news" />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-500">Loading article...</div>}>
      <ArticleDetailViewContent />
    </Suspense>
  );
}

