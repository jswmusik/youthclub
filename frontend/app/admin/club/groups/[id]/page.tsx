'use client';

import { useParams, useSearchParams } from 'next/navigation';
import GroupDetailView from '../../../../components/GroupDetailView';
import Link from 'next/link';

export default function GroupPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;

  const buildBackUrl = () => {
    const urlParams = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const municipality = searchParams.get('municipality');
    const club = searchParams.get('club');
    const type = searchParams.get('type');
    
    if (page && page !== '1') urlParams.set('page', page);
    if (search) urlParams.set('search', search);
    if (municipality) urlParams.set('municipality', municipality);
    if (club) urlParams.set('club', club);
    if (type) urlParams.set('type', type);
    
    const queryString = urlParams.toString();
    return queryString ? `/admin/club/groups?${queryString}` : '/admin/club/groups';
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="mb-6">
        <Link href={buildBackUrl()} className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-1">
          ← Back to Groups
        </Link>
      </div>
      <GroupDetailView groupId={id} basePath="/admin/club/groups" />
    </div>
  );
}