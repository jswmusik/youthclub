'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import InterestDetailView from '@/app/components/InterestDetailView';
import { Heart } from 'lucide-react';

function LoadingState() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <div className="absolute -inset-2 bg-gradient-to-br from-[var(--brand-primary)]/20 to-[var(--brand-purple)]/20 rounded-3xl blur-xl animate-pulse"></div>
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">Loading...</div>
    </div>
  );
}

function InterestDetailPageContent() {
  const { id } = useParams() as { id: string };
  return <InterestDetailView interestId={id} basePath="/admin/super/interests" />;
}

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <Suspense fallback={<LoadingState />}>
        <InterestDetailPageContent />
      </Suspense>
    </div>
  );
}

