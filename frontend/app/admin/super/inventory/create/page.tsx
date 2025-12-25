'use client';

import { Suspense } from 'react';
import ItemForm from '@/app/components/inventory/ItemForm';
import { Package } from 'lucide-react';

function CreateItemPageContent() {
  return <ItemForm />;
}

export default function CreateItemPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
        <div className="sm:max-w-4xl sm:mx-auto sm:px-6 px-4">
          <div className="flex items-center justify-center gap-3 py-20">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-[var(--brand-light)]/50">Loading form...</span>
          </div>
        </div>
      </div>
    }>
      <CreateItemPageContent />
    </Suspense>
  );
}
