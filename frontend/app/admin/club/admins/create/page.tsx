'use client';

import AdminForm from '@/app/components/AdminForm';

export default function Page() {
  return <AdminForm redirectPath="/admin/club/admins" scope="CLUB" />;
}

