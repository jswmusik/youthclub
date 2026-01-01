'use client';

import { Suspense } from 'react';
import MunicipalityForm from '@/app/components/MunicipalityForm';

function CreatePageContent() {
  // Pass the base path without query params - the form will preserve params from its own URL
  return <MunicipalityForm redirectPath="/admin/super/municipalities" />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--dark-900)]" />}>
      <CreatePageContent />
    </Suspense>
  );
}
