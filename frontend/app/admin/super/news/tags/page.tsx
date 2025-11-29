'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import TagManager from '@/app/components/TagManager';

function TagManagerPageContent() {
  return (
    <div className="p-8">
      <div className="mb-4">
        <Link href="/admin/super/news" className="text-gray-500 hover:text-gray-800 text-sm font-bold">← Back to News</Link>
      </div>
      <TagManager basePath="/admin/super/news/tags" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <TagManagerPageContent />
    </Suspense>
  );
}
