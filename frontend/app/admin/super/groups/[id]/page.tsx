'use client';

import { useParams } from 'next/navigation';
import GroupDetailView from '../../../../components/GroupDetailView';
import Link from 'next/link';

export default function GroupPage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="mb-6">
        <Link href="/admin/super/groups" className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-1">
          ← Back to Groups
        </Link>
      </div>
      <GroupDetailView groupId={id} basePath="/admin/super/groups" />
    </div>
  );
}