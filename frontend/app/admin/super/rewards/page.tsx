'use client';

import { Suspense } from 'react';
import RewardManager from '../../../components/RewardManager';

function RewardManagerPageContent() {
  return (
    <div className="p-8">
      <RewardManager basePath="/admin/super/rewards" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <RewardManagerPageContent />
    </Suspense>
  );
}