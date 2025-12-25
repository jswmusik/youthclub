'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import UserVisitsManager from '@/app/components/visits/UserVisitsManager';
import { MapPin } from 'lucide-react';

function VisitsPageContent() {
  const { id } = useParams() as { id: string };
  return (
    <div className="py-4 sm:py-6 md:py-8 px-0">
      <UserVisitsManager 
        userId={id} 
        basePath="/admin/municipality/youth"
        canFilterClubs={true}
      />
    </div>
  );
}

export default function YouthVisitsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)]/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <MapPin className="w-6 h-6 text-[var(--brand-primary)]" />
          </div>
          <p className="text-[var(--brand-light)]/60">Loading visits...</p>
        </div>
      </div>
    }>
      <VisitsPageContent />
    </Suspense>
  );
}
