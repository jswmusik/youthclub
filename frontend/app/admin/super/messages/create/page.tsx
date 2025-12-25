'use client';

import { Suspense } from 'react';
import MessageForm from '../../../../components/MessageForm';
import { MessageSquare } from 'lucide-react';

function LoadingState() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
          <MessageSquare className="w-8 h-8 text-[var(--dark-900)]" />
        </div>
        <div className="absolute -inset-2 bg-[var(--brand-primary)]/20 rounded-3xl blur-xl animate-pulse"></div>
      </div>
      <div className="text-[var(--brand-light)]/60 animate-pulse">Loading...</div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <Suspense fallback={<LoadingState />}>
        <MessageForm redirectPath="/admin/super/messages" />
      </Suspense>
    </div>
  );
}

