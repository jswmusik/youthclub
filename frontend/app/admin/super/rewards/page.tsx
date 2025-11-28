'use client';

import RewardManager from '../../../components/RewardManager';

export default function SuperAdminRewardsPage() {
  return (
    <div className="max-w-7xl mx-auto p-4">
      <RewardManager basePath="/admin/super/rewards" />
    </div>
  );
}