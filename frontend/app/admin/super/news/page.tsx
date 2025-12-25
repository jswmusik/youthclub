'use client';

import { Suspense } from 'react';
import ArticleManager from '@/app/components/ArticleManager';
import { FileText } from 'lucide-react';

function ArticleManagerPageContent() {
  return (
    <div className="py-4 sm:py-6 md:py-8 px-0">
      <ArticleManager basePath="/admin/super/news" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <p className="text-[var(--brand-light)]/60">Loading news...</p>
        </div>
      </div>
    }>
      <ArticleManagerPageContent />
    </Suspense>
  );
}
