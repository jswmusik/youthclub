'use client';

import { useParams } from 'next/navigation';
import ItemDetailView from '@/app/components/inventory/ItemDetailView';

export default function ViewItemPage() {
  const params = useParams();
  
  return (
    <ItemDetailView itemId={params.id as string} basePath="/admin/municipality/inventory" />
  );
}

