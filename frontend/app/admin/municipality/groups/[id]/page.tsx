'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import GroupDetailView from '@/app/components/GroupDetailView';
import { Layers } from 'lucide-react';

function GroupPageContent() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <GroupDetailView groupId={id} basePath="/admin/municipality/groups" />
  );
}

export default function GroupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse mx-auto mb-4">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <p className="text-[var(--brand-light)]/60">Loading group details...</p>
        </div>
      </div>
    }>
      <GroupPageContent />
    </Suspense>
  );
}
