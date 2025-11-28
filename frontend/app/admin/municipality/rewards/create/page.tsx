'use client';

import RewardForm from '../../../../components/RewardForm';

export default function CreateRewardPage() {
  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Municipality Reward</h1>
        <p className="text-gray-500">
          This reward will be owned by your municipality.
        </p>
      </div>
      
      <RewardForm redirectPath="/admin/municipality/rewards" />
    </div>
  );
}