'use client';

import AdminForm from '@/app/components/AdminForm';

export default function Page() {
  return <AdminForm redirectPath="/admin/super/admins" scope="SUPER" />;
}

