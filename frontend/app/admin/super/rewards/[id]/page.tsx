'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import RewardDetailView from '@/app/components/RewardDetailView';

function RewardDetailPageContent() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="max-w-7xl mx-auto p-4">
      <RewardDetailView 
        rewardId={id} 
        basePath="/admin/super/rewards" 
      />
    </div>
  );
}

export default function RewardDetailPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <RewardDetailPageContent />
    </Suspense>
  );
}