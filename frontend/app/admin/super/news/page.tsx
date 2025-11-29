'use client';

import { Suspense } from 'react';
import ArticleManager from '@/app/components/ArticleManager';

function ArticleManagerPageContent() {
  return (
    <div className="p-8">
      <ArticleManager basePath="/admin/super/news" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8"><div className="p-12 text-center text-gray-500">Loading...</div></div>}>
      <ArticleManagerPageContent />
    </Suspense>
  );
}
