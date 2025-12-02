'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { inventoryApi, Item, ClubOption } from '@/lib/inventory-api';
import ItemTable from '@/app/components/inventory/ItemTable';

export default function MuniInventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [filterClub, setFilterClub] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load filter options
    inventoryApi.getSelectableClubs().then(setClubs);
  }, []);

  useEffect(() => {
    loadItems();
  }, [filterClub, search]);

  const loadItems = async () => {
    setLoading(true);
    try {
      // If filterClub is empty, API returns items from ALL clubs in municipality
      const data = await inventoryApi.getItems(filterClub, search); 
      // Handle paginated response (results) or direct array
      setItems(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error("Failed to load inventory", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Municipality Inventory</h1>
          <p className="text-slate-500">Manage items across all your clubs.</p>
        </div>
        <Link 
            href="/admin/municipality/inventory/create"
            className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800"
        >
            + Add Item
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <select 
            className="border-slate-300 rounded-md"
            value={filterClub}
            onChange={(e) => setFilterClub(e.target.value)}
        >
            <option value="">All Clubs</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input 
            type="text" 
            placeholder="Search..." 
            className="border-slate-300 rounded-md flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? <div>Loading...</div> : <ItemTable items={items} basePath="/admin/municipality/inventory" onDelete={loadItems} />}
    </div>
  );
}

