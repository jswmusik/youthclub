'use client';

import RewardForm from '../../../../components/RewardForm';

export default function CreateRewardPage() {
  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Club Reward</h1>
        <p className="text-gray-500">
          This reward will be targeted specifically to members of your club.
        </p>
      </div>
      
      <RewardForm redirectPath="/admin/club/rewards" />
    </div>
  );
}