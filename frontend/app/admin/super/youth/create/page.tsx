'use client';

import YouthForm from '@/app/components/YouthForm';

export default function Page() {
  return (
    <div className="p-8">
      <YouthForm redirectPath="/admin/super/youth" scope="SUPER" />
    </div>
  );
}

