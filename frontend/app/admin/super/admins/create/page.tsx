'use client';

import AdminForm from '@/app/components/AdminForm';

export default function Page() {
  return (
    <div className="p-8">
      <AdminForm redirectPath="/admin/super/admins" scope="SUPER" />
    </div>
  );
}

