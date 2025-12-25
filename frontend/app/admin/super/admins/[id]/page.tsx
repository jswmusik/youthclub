'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import AdminDetailView from '@/app/components/AdminDetailView';
import { User } from 'lucide-react';

function DetailPageContent() {
  const { id } = useParams() as { id: string };
  return (
    <div className="py-4 sm:py-8 px-0">
      <AdminDetailView userId={id} basePath="/admin/super/admins" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <User className="w-6 h-6 text-white" />
        </div>
        <div className="text-[var(--brand-light)]/60 animate-pulse">Loading...</div>
      </div>
    }>
      <DetailPageContent />
    </Suspense>
  );
}

