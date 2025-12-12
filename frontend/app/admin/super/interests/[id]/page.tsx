'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import InterestDetailView from '@/app/components/InterestDetailView';

function InterestDetailPageContent() {
  const { id } = useParams() as { id: string };
  return <InterestDetailView interestId={id} basePath="/admin/super/interests" />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-pulse text-gray-400">Loading...</div></div>}>
      <div className="p-4 sm:p-6 md:p-8">
        <InterestDetailPageContent />
      </div>
    </Suspense>
  );
}

