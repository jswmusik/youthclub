'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { inventoryApi, Item } from '@/lib/inventory-api';
import ItemTable from '@/app/components/inventory/ItemTable';
import { useAuth } from '@/context/AuthContext';

export default function InventoryDashboardPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Debounce search could be added here, but for now simple effect
  useEffect(() => {
    if (user?.assigned_club) {
      loadItems();
    }
  }, [user, search]);

  const loadItems = async () => {
    try {
      // Pass the club ID and search term
      const data = await inventoryApi.getItems(user?.assigned_club?.id, search);
      // Handle paginated response (results) or direct array
      setItems(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error("Failed to load inventory", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.assigned_club) return <div className="p-8">Loading club data...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-500">Manage items available for borrowing.</p>
        </div>
        <div className="flex gap-2">
            <Link 
                href="/admin/club/inventory/history"
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
            >
                View History
            </Link>
            <Link 
                href="/admin/club/inventory/create"
                className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 flex items-center gap-2"
            >
                <span>+</span> Add Item
            </Link>
        </div>
      </div>

      {/* Filters / Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <input 
            type="text" 
            placeholder="Search items by name or tag..." 
            className="w-full sm:w-1/2 px-4 py-2 border border-slate-300 rounded-md"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading inventory...</div>
      ) : (
        <ItemTable items={items} basePath="/admin/club/inventory" onDelete={loadItems} />
      )}
    </div>
  );
}

