'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import TagManager from '@/app/components/TagManager';

function TagManagerPageContent() {
  return (
    <div className="p-8">
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
