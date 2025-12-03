'use client';

import { useParams } from 'next/navigation';
import ItemHistoryView from '@/app/components/inventory/ItemHistoryView';

export default function ItemHistoryPage() {
  const params = useParams();
  
  return (
    <ItemHistoryView itemId={params.id as string} basePath="/admin/super/inventory" />
  );
}

