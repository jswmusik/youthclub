'use client';

import { Suspense } from 'react';
import MessageManager from '../../../components/MessageManager';

function MessageManagerPageContent() {
  return (
    <div className="p-8">
      <MessageManager basePath="/admin/super/messages" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8"><div className="p-12 text-center text-gray-500">Loading...</div></div>}>
      <MessageManagerPageContent />
    </Suspense>
  );
}
