'use client';

import { Suspense } from 'react';
import YouthManager from '@/app/components/YouthManager';

function YouthManagerPageContent() {
  return (
    <div className="p-8">
      <YouthManager basePath="/admin/club/youth" scope="CLUB" />
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
