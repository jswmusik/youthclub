'use client';

import { Suspense } from 'react';
import GroupRequestsManager from '@/app/components/GroupRequestsManager';
import { UserPlus } from 'lucide-react';

function GroupRequestsPageContent() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
      <div className="sm:max-w-7xl sm:mx-auto sm:px-6">
        <GroupRequestsManager />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse mx-auto mb-4">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <p className="text-[var(--brand-light)]/60">Loading group applications...</p>
        </div>
      </div>
    }>
      <GroupRequestsPageContent />
    </Suspense>
  );
}
