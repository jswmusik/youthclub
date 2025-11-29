'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import MunicipalityDetailView from '@/app/components/MunicipalityDetailView';

function DetailPageContent() {
  const { id } = useParams() as { id: string };
  return (
    <div className="p-8">
      <MunicipalityDetailView municipalityId={id} basePath="/admin/super/municipalities" />
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
