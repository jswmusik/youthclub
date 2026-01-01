'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ClubForm from '../../../../components/ClubForm';

function CreatePageContent() {
  const searchParams = useSearchParams();
  
  const buildRedirectPath = () => {
    const params = new URLSearchParams(searchParams.toString());
    const queryString = params.toString();
    return queryString ? `/admin/super/clubs?${queryString}` : '/admin/super/clubs';
  };

  return <ClubForm redirectPath={buildRedirectPath()} scope="SUPER" />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--dark-900)]" />}>
      <CreatePageContent />
    </Suspense>
  );
}

