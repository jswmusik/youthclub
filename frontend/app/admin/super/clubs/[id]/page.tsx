'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import ClubDetailView from '@/app/components/ClubDetailView';

function ClubViewPageContent() {
  const params = useParams();
  const clubId = params?.id as string;

  return (
    <div className="p-8">
      <ClubDetailView clubId={clubId} basePath="/admin/super/clubs" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <ClubViewPageContent />
    </Suspense>
  );
}
