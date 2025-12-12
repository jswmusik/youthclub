'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import GroupDetailView from '../../../../components/GroupDetailView';

function DetailPageContent() {
  const { id } = useParams() as { id: string };
  return (
    <div className="p-8">
      <GroupDetailView groupId={id} basePath="/admin/super/groups" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <DetailPageContent />
    </Suspense>
  );
}