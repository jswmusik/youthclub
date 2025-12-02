'use client';

import ItemForm from '@/app/components/inventory/ItemForm';

export default function CreateItemPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add New Item</h1>
        <p className="text-slate-500">Create a single item or a batch of identical items.</p>
      </div>

      <ItemForm />
    </div>
  );
}

