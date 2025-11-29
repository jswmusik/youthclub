'use client';

import { Suspense } from 'react';
import GuardianManager from '@/app/components/GuardianManager';

function GuardianManagerPageContent() {
  return (
    <div className="p-8">
      <GuardianManager basePath="/admin/club/guardians" scope="CLUB" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <GuardianManagerPageContent />
    </Suspense>
  );
}
