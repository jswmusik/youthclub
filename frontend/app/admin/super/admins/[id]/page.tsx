'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import AdminDetailView from '@/app/components/AdminDetailView';

function DetailPageContent() {
  const { id } = useParams() as { id: string };
  return (
    <div className="p-8">
      <AdminDetailView userId={id} basePath="/admin/super/admins" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <DetailPageContent />
    </Suspense>
  );
}

