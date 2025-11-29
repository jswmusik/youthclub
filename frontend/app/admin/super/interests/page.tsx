'use client';

import { Suspense } from 'react';
import InterestManager from '@/app/components/InterestManager';

function InterestManagerPageContent() {
  return (
    <div className="p-8">
      <InterestManager basePath="/admin/super/interests" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <InterestManagerPageContent />
    </Suspense>
  );
}
