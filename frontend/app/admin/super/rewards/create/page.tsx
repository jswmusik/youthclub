'use client';

import RewardForm from '../../../../components/RewardForm';

export default function CreateRewardPage() {
  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Reward</h1>
        <p className="text-gray-500">
          Rewards can be targeted to specific groups, demographics, or triggered automatically.
        </p>
      </div>
      
      {/* Reuse the component we just made */}
      <RewardForm redirectPath="/admin/super/rewards" />
    </div>
  );
}