'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Gift } from 'lucide-react';
import RewardDetailView from '@/app/components/RewardDetailView';

function RewardDetailPageContent() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="bg-[var(--dark-900)] min-h-screen py-4 sm:py-8 px-0">
      <RewardDetailView 
        rewardId={id} 
        basePath="/admin/super/rewards" 
      />
    </div>
  );
}

export default function RewardDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <Gift className="w-6 h-6 text-white" />
        </div>
        <div className="text-[var(--brand-light)]/60 animate-pulse">Loading...</div>
      </div>
    }>
      <RewardDetailPageContent />
    </Suspense>
  );
}
