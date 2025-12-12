'use client';

import { Suspense } from 'react';
import InterestManager from '@/app/components/InterestManager';

function InterestManagerPageContent() {
  return <InterestManager basePath="/admin/super/interests" />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-pulse text-gray-400">Loading...</div></div>}>
      <div className="p-4 sm:p-6 md:p-8">
        <InterestManagerPageContent />
      </div>
    </Suspense>
  );
}
