'use client';

import { Suspense } from 'react';
import TagForm from '@/app/components/TagForm';

function TagFormPageContent() {
  return (
    <div className="p-8">
      <TagForm redirectPath="/admin/super/news/tags" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <TagFormPageContent />
    </Suspense>
  );
}

