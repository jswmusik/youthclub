'use client';

import { Suspense } from 'react';
import GroupForm from '@/app/components/GroupForm';
import { Layers } from 'lucide-react';

function GroupFormContent() {
  return (
    <GroupForm redirectPath="/admin/club/groups" />
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
        <div className="sm:max-w-3xl sm:mx-auto sm:px-6 px-4">
          <div className="flex items-center justify-center gap-3 py-20">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <span className="text-[var(--brand-light)]/50">Loading form...</span>
          </div>
        </div>
      </div>
    }>
      <GroupFormContent />
    </Suspense>
  );
}
