'use client';

import GuardianForm from '@/app/components/GuardianForm';

export default function Page() {
  return (
    <div className="p-8">
      <GuardianForm redirectPath="/admin/municipality/guardians" scope="MUNICIPALITY" />
    </div>
  );
}

