'use client';

import { useParams } from 'next/navigation';
import RewardDetailView from '@/app/components/RewardDetailView';

export default function RewardDetailPage() {
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