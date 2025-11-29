'use client';

import { Suspense } from 'react';
import AdminManager from '@/app/components/AdminManager';

export default function Page() {
  return (
    <div className="p-8">
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <AdminManager basePath="/admin/municipality/admins" scope="MUNICIPALITY" />
      </Suspense>
    </div>
  );
}
