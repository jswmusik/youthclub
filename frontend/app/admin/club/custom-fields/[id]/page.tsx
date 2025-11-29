'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import CustomFieldDetailView from '../../../../components/CustomFieldDetailView';

function CustomFieldDetailPageContent() {
  const { id } = useParams() as { id: string };
  
  return (
    <CustomFieldDetailView fieldId={id} basePath="/admin/club/custom-fields" />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <CustomFieldDetailPageContent />
    </Suspense>
  );
}

