'use client';

import { Suspense } from 'react';
import GroupRequestsManager from '../../../../components/GroupRequestsManager';

function GroupRequestsPageContent() {
  return (
    <div className="p-8">
      <GroupRequestsManager />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <GroupRequestsPageContent />
    </Suspense>
  );
}