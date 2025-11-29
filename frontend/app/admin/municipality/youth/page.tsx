'use client';

import { Suspense } from 'react';
import YouthManager from '@/app/components/YouthManager';

function YouthManagerPageContent() {
  return (
    <div className="p-8">
      <YouthManager basePath="/admin/municipality/youth" scope="MUNICIPALITY" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <YouthManagerPageContent />
    </Suspense>
  );
}
