'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import RewardClaimHistory from '@/app/components/rewards/RewardClaimHistory';

function RewardClaimHistoryPageContent() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="max-w-7xl mx-auto p-4">
      <RewardClaimHistory 
        rewardId={id} 
        basePath="/admin/super/rewards" 
      />
    </div>
  );
}

export default function RewardClaimHistoryPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <RewardClaimHistoryPageContent />
    </Suspense>
  );
}

