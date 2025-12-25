'use client';

import YouthForm from '@/app/components/YouthForm';

export default function Page() {
  return (
    <div>
      <YouthForm redirectPath="/admin/municipality/youth" scope="MUNICIPALITY" />
    </div>
  );
}

