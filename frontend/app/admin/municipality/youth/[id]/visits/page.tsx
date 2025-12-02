'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import UserVisitsManager from '@/app/components/visits/UserVisitsManager';

function VisitsPageContent() {
  const { id } = useParams() as { id: string };
  return (
    <UserVisitsManager 
      userId={id} 
      basePath="/admin/municipality/youth"
      canFilterClubs={true} // They can filter between clubs in their municipality
    />
  );
}

export default function YouthVisitsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Loading interface...</div>}>
      <VisitsPageContent />
    </Suspense>
  );
}

