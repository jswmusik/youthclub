'use client';
import { useParams } from 'next/navigation';
import GroupDetailView from '../../../../components/GroupDetailView';
export default function Page() { 
  const { id } = useParams() as { id: string };
  return <div className="p-8"><GroupDetailView groupId={id} basePath="/admin/municipality/groups" /></div>; 
}