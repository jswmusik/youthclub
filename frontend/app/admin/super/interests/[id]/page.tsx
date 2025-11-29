'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import InterestDetailView from '@/app/components/InterestDetailView';

function InterestDetailPageContent() {
  const { id } = useParams() as { id: string };
  return (
    <div className="p-8">
      <InterestDetailView interestId={id} basePath="/admin/super/interests" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <InterestDetailPageContent />
    </Suspense>
  );
}

