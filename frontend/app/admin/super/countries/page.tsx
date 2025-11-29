'use client';

import { Suspense } from 'react';
import CountryManager from '@/app/components/CountryManager';

function CountryManagerPageContent() {
  return (
    <div className="p-8">
      <CountryManager basePath="/admin/super/countries" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <CountryManagerPageContent />
    </Suspense>
  );
}
