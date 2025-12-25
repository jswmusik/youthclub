'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import GuardianDetailView from '@/app/components/GuardianDetailView';
import { ShieldCheck } from 'lucide-react';

function DetailPageContent() {
  const { id } = useParams() as { id: string };
  return (
    <div className="py-4 sm:py-8 px-0">
      <GuardianDetailView userId={id} basePath="/admin/municipality/guardians" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <p className="text-[var(--brand-light)]/60">Loading guardian...</p>
        </div>
      </div>
    }>
      <DetailPageContent />
    </Suspense>
  );
}
