'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { inventoryApi } from '@/lib/inventory-api';
import ItemForm from '@/app/components/inventory/ItemForm';
import { Package } from 'lucide-react';

function EditItemContent() {
  const params = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      inventoryApi.getItem(params.id as string)
        .then(data => {
          setItem(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError('Could not load item.');
          setLoading(false);
        });
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
        <div className="sm:max-w-3xl sm:mx-auto sm:px-6 px-4">
          <div className="flex items-center justify-center gap-3 py-20">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-[var(--brand-light)]/50">Loading item...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
        <div className="sm:max-w-3xl sm:mx-auto sm:px-6 px-4">
          <div className="py-20 text-center text-red-400">{error || 'Item not found'}</div>
        </div>
      </div>
    );
  }

  return <ItemForm initialData={item} />;
}

export default function EditItemPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
        <div className="sm:max-w-3xl sm:mx-auto sm:px-6 px-4">
          <div className="flex items-center justify-center gap-3 py-20">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-[var(--brand-light)]/50">Loading item...</span>
          </div>
        </div>
      </div>
    }>
      <EditItemContent />
    </Suspense>
  );
}
