'use client';

import { Suspense } from 'react';
import AdminManager from '@/app/components/AdminManager';

function AdminManagerPageContent() {
  return (
    <div className="py-4 sm:py-6 md:py-8 px-0">
      <AdminManager basePath="/admin/municipality/admins" scope="MUNICIPALITY" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--brand-light)]/60">Loading...</p>
        </div>
      </div>
    }>
      <AdminManagerPageContent />
    </Suspense>
  );
}
