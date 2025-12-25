'use client';

import { Suspense } from 'react';
import CountryManager from '@/app/components/CountryManager';

function CountryManagerPageContent() {
  return (
    <div className="py-4 sm:py-8">
      <CountryManager basePath="/admin/super/countries" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
        <p className="text-[var(--brand-light)]/50 text-sm">Loading...</p>
      </div>
    }>
      <CountryManagerPageContent />
    </Suspense>
  );
}
