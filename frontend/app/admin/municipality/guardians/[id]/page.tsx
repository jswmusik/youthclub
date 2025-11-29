'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import GuardianDetailView from '@/app/components/GuardianDetailView';

function DetailPageContent() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams(); // Get search params from URL

  // Build the basePath with existing query parameters
  const buildBasePathWithParams = () => {
    const params = new URLSearchParams(searchParams.toString());
    const queryString = params.toString();
    return queryString ? `/admin/municipality/guardians?${queryString}` : '/admin/municipality/guardians';
  };

  return (
    <div className="p-8">
      <GuardianDetailView userId={id} basePath={buildBasePathWithParams()} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <DetailPageContent />
    </Suspense>
  );
}
