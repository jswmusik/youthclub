'use client';

import { Suspense } from 'react';
import AdminManager from '@/app/components/AdminManager';

function AdminManagerPageContent() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <AdminManager basePath="/admin/super/admins" scope="SUPER" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <AdminManagerPageContent />
    </Suspense>
  );
}
