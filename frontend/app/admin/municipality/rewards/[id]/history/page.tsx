'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import RewardClaimHistory from '@/app/components/rewards/RewardClaimHistory';
import { Gift } from 'lucide-react';

function RewardClaimHistoryPageContent() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="py-4 sm:py-8 px-0">
      <RewardClaimHistory 
        rewardId={id} 
        basePath="/admin/municipality/rewards" 
      />
    </div>
  );
}

export default function RewardClaimHistoryPage() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <Suspense fallback={
        <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div className="text-[var(--brand-light)]/60 animate-pulse">Loading claim history...</div>
        </div>
      }>
        <RewardClaimHistoryPageContent />
      </Suspense>
    </div>
  );
}
