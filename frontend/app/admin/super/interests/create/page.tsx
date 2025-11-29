'use client';

import InterestForm from '@/app/components/InterestForm';

export default function Page() {
  return (
    <div className="p-8">
      <InterestForm redirectPath="/admin/super/interests" />
    </div>
  );
}

