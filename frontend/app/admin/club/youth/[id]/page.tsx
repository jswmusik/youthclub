'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import YouthDetailView from '@/app/components/YouthDetailView';

function DetailPageContent() {
  const { id } = useParams() as { id: string };
  return (
    <div className="p-8">
      <YouthDetailView userId={id} basePath="/admin/club/youth" />
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
