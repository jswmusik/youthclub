'use client';

import GuardianForm from '@/app/components/GuardianForm';

export default function Page() {
  return (
    <div>
      <GuardianForm redirectPath="/admin/club/guardians" scope="CLUB" />
    </div>
  );
}

