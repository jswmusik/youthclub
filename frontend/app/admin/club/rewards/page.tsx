'use client';

import RewardManager from '../../../components/RewardManager';

export default function ClubRewardsPage() {
  return (
    <div className="max-w-7xl mx-auto p-4">
      <RewardManager basePath="/admin/club/rewards" />
    </div>
  );
}