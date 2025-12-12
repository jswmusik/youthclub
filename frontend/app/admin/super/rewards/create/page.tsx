'use client';

import RewardForm from '../../../../components/RewardForm';

export default function Page() {
  return (
    <div className="p-8">
      <RewardForm redirectPath="/admin/super/rewards" />
    </div>
  );
}