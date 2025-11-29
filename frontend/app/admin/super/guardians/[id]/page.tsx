'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import GuardianDetailView from '@/app/components/GuardianDetailView';

function DetailPageContent() {
  const { id } = useParams() as { id: string };
  return (
    <div className="p-8">
      <GuardianDetailView userId={id} basePath="/admin/super/guardians" />
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
