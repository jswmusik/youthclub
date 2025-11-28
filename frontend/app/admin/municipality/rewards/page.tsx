'use client';

import RewardManager from '../../../components/RewardManager';

export default function MunicipalityRewardsPage() {
  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* The component handles fetching only municipality-specific rewards automatically */}
      <RewardManager basePath="/admin/municipality/rewards" />
    </div>
  );
}