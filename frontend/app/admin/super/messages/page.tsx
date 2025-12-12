'use client';

import { Suspense } from 'react';
import MessageManager from '../../../components/MessageManager';

function MessageManagerPageContent() {
  return <MessageManager basePath="/admin/super/messages" />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="animate-pulse text-gray-400">Loading...</div></div>}>
      <div className="p-4 sm:p-6 md:p-8">
        <MessageManagerPageContent />
      </div>
    </Suspense>
  );
}
