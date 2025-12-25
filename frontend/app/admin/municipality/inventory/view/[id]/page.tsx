'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import ItemDetailView from '@/app/components/inventory/ItemDetailView';
import { Package } from 'lucide-react';

function ViewItemPageContent() {
  const params = useParams();
  
  return (
    <div className="py-4 sm:py-8 px-0">
      <ItemDetailView itemId={params.id as string} basePath="/admin/municipality/inventory" />
    </div>
  );
}

export default function ViewItemPage() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <Suspense fallback={
        <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div className="text-[var(--brand-light)]/60 animate-pulse">Loading item details...</div>
        </div>
      }>
        <ViewItemPageContent />
      </Suspense>
    </div>
  );
}
