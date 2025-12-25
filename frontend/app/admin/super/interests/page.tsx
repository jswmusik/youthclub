'use client';

import { Suspense } from 'react';
import InterestManager from '@/app/components/InterestManager';
import { Heart } from 'lucide-react';

function InterestManagerPageContent() {
  return <InterestManager basePath="/admin/super/interests" />;
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <div className="absolute -inset-2 bg-[var(--brand-primary)]/20 rounded-3xl blur-xl animate-pulse"></div>
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">Loading interests...</div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <Suspense fallback={<LoadingState />}>
        <InterestManagerPageContent />
      </Suspense>
    </div>
  );
}
