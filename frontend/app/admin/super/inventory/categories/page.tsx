'use client';

import { useState, useEffect } from 'react';
import { inventoryApi, ItemCategory } from '@/lib/inventory-api';

export default function CategoryManagerPage() {
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');

  useEffect(() => {
    loadCats();
  }, []);

  const loadCats = () => {
    inventoryApi.getCategories()
      .then(data => {
        // Handle paginated response (results) or direct array
        setCategories(Array.isArray(data) ? data : (data.results || []));
      })
      .catch(err => {
        console.error("Failed to load categories", err);
        setCategories([]);
      });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await inventoryApi.createCategory({ name: newName, icon: newIcon });
    setNewName(''); setNewIcon('');
    loadCats();
  };

  const handleDelete = async (id: number) => {
    if(confirm('Delete this category?')) {
        await inventoryApi.deleteCategory(id);
        loadCats();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Global Item Categories</h1>
        <p className="text-slate-500">Define broad categories like 'Gaming', 'Sports'.</p>
      </div>

      {/* Create Form */}
      <form onSubmit={handleCreate} className="flex gap-4 items-end bg-white p-4 rounded shadow-sm">
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Category Name</label>
            <input 
                className="border p-2 rounded w-64" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                placeholder="e.g. Board Games"
                required 
            />
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Icon (Emoji)</label>
            <input 
                className="border p-2 rounded w-24" 
                value={newIcon} 
                onChange={e => setNewIcon(e.target.value)} 
                placeholder="🎲" 
            />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add</button>
      </form>

      {/* List */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Icon</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-right">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
                {(Array.isArray(categories) ? categories : []).map(cat => (
                    <tr key={cat.id}>
                        <td className="px-6 py-4 text-2xl">{cat.icon}</td>
                        <td className="px-6 py-4 font-medium">{cat.name}</td>
                        <td className="px-6 py-4 text-right">
                            <button onClick={() => handleDelete(cat.id)} className="text-red-600 hover:underline">Delete</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}

