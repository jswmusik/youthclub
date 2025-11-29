'use client';

import { Suspense } from 'react';
import ArticleForm from '@/app/components/ArticleForm';

function ArticleFormPageContent() {
  return (
    <div className="p-8">
      <ArticleForm redirectPath="/admin/super/news" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8"><div className="p-12 text-center text-gray-500">Loading...</div></div>}>
      <ArticleFormPageContent />
    </Suspense>
  );
}

