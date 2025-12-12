'use client';

import { Suspense } from 'react';
import GroupManager from '../../../components/GroupManager';

function GroupManagerPageContent() {
  return (
    <div className="p-8">
      <GroupManager basePath="/admin/super/groups" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <GroupManagerPageContent />
    </Suspense>
  );
}