'use client';

import { useState, useEffect } from 'react';
import { inventoryApi, InventoryTag } from '@/lib/inventory-api';

export default function TagsManagerPage() {
  const [tags, setTags] = useState<InventoryTag[]>([]);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = () => {
    inventoryApi.getTags()
      .then(data => {
        // Handle paginated response (results) or direct array
        setTags(Array.isArray(data) ? data : (data.results || []));
      })
      .catch(err => {
        console.error("Failed to load tags", err);
        setTags([]);
      });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Tags created here will have club=null (Global)
    await inventoryApi.createTag({ name: newName, icon: newIcon });
    setNewName(''); setNewIcon('');
    loadTags();
  };

  const handleDelete = async (id: number) => {
    if(confirm('Delete this tag?')) {
        await inventoryApi.deleteTag(id);
        loadTags();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Global Item Tags</h1>
        <p className="text-slate-500">Define tags that can be used across all clubs. Tags created here are global.</p>
      </div>

      {/* Create Form */}
      <form onSubmit={handleCreate} className="flex gap-4 items-end bg-white p-4 rounded shadow-sm">
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Tag Name</label>
            <input 
                className="border p-2 rounded w-64" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                placeholder="e.g. Popular"
                required 
            />
        </div>
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Icon (Emoji)</label>
            <input 
                className="border p-2 rounded w-24" 
                value={newIcon} 
                onChange={e => setNewIcon(e.target.value)} 
                placeholder="⭐" 
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
                {(Array.isArray(tags) ? tags : []).map(tag => (
                    <tr key={tag.id}>
                        <td className="px-6 py-4 text-2xl">{tag.icon}</td>
                        <td className="px-6 py-4 font-medium">{tag.name}</td>
                        <td className="px-6 py-4 text-right">
                            <button onClick={() => handleDelete(tag.id)} className="text-red-600 hover:underline">Delete</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}

