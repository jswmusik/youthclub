'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { inventoryApi } from '@/lib/inventory-api';
import ItemForm from '@/app/components/inventory/ItemForm';

export default function EditItemPage() {
  const params = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
        inventoryApi.getItem(params.id as string)
            .then(data => {
                setItem(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                alert("Could not load item.");
            });
    }
  }, [params.id]);

  if (loading) return <div>Loading item details...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Item</h1>
        <p className="text-slate-500">Update item details or status.</p>
      </div>

      {item && <ItemForm initialData={item} />}
    </div>
  );
}

