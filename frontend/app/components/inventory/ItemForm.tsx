'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { inventoryApi, ItemCategory, InventoryTag, ClubOption } from '@/lib/inventory-api';
import { useAuth } from '@/context/AuthContext';
import Toast from '@/app/components/Toast';

interface ItemFormProps {
  initialData?: any;
  clubId?: number; // If we are in club admin view
}

export default function ItemForm({ initialData, clubId }: ItemFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [tags, setTags] = useState<InventoryTag[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false });

  // Form State
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    quantity: 1, // Default to 1, but user can set 20 to batch create
    max_borrow_duration: initialData?.max_borrow_duration || 60,
    category: initialData?.category || '',
    tags: initialData?.tags || [],
    internal_note: initialData?.internal_note || '',
    status: initialData?.status || 'AVAILABLE',
    club: initialData?.club || '',
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    // Fetch Categories & Tags
    Promise.all([inventoryApi.getCategories(), inventoryApi.getTags()])
      .then(([cats, tgs]) => {
        // Handle paginated response (results) or direct array
        setCategories(Array.isArray(cats) ? cats : (cats.results || []));
        setTags(Array.isArray(tgs) ? tgs : (tgs.results || []));
      })
      .catch(err => {
        console.error("Failed to load categories/tags", err);
        setCategories([]);
        setTags([]);
      });

    // NEW: Fetch Clubs if user is Super Admin or Municipality Admin (and no clubId prop passed)
    const isSuperOrMuniAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MUNICIPALITY_ADMIN';
    if (isSuperOrMuniAdmin && !clubId) {
        inventoryApi.getSelectableClubs()
          .then(data => {
            // Handle paginated response (results) or direct array
            setClubs(Array.isArray(data) ? data : (data.results || []));
          })
          .catch(err => {
            console.error("Failed to load clubs", err);
            setClubs([]);
          });
    }
  }, [user, clubId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        image: imageFile,
        // Use formData.club if set, otherwise fall back to clubId or user's assigned club
        club: formData.club ? Number(formData.club) : (clubId || user?.assigned_club?.id), 
        // Ensure category is number
        category: formData.category ? Number(formData.category) : undefined,
      };

      if (initialData) {
        await inventoryApi.updateItem(initialData.id, payload);
        setToast({ 
          message: 'Item updated successfully!', 
          type: 'success', 
          isVisible: true 
        });
      } else {
        await inventoryApi.createItems(payload); // This handles batch creation
        setToast({ 
          message: `Item${formData.quantity > 1 ? 's' : ''} created successfully!`, 
          type: 'success', 
          isVisible: true 
        });
      }
      
      // Wait a bit to show the toast before navigating
      setTimeout(() => {
      router.back();
      router.refresh();
      }, 1000);
    } catch (error: any) {
      console.error('Error details:', error);
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to save item.';
      setToast({ 
        message: errorMessage, 
        type: 'error', 
        isVisible: true 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tagId: number) => {
    const currentTags = formData.tags as number[];
    if (currentTags.includes(tagId)) {
      setFormData({...formData, tags: currentTags.filter(t => t !== tagId)});
    } else {
      setFormData({...formData, tags: [...currentTags, tagId]});
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl bg-white p-6 rounded-lg shadow-sm">
      
      {/* NEW: Club Selector (Only for Super/Muni Admins) */}
      {((user?.role === 'SUPER_ADMIN' || user?.role === 'MUNICIPALITY_ADMIN') && !clubId) && (
          <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mb-6">
            <label className="block text-sm font-medium text-slate-700">Assign to Club</label>
            <select
                required
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                value={formData.club}
                onChange={e => setFormData({...formData, club: e.target.value})}
            >
                <option value="">Select a Club...</option>
                {(Array.isArray(clubs) ? clubs : []).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700">Item Title</label>
          <input 
            type="text" 
            required
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            placeholder="e.g. PlayStation 5 Controller"
          />
        </div>

        {!initialData && (
          <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
            <label className="block text-sm font-medium text-blue-900">Quantity (Batch Create)</label>
            <p className="text-xs text-blue-700 mb-2">Create multiple copies at once (e.g. 10 Rackets).</p>
            <input 
              type="number" 
              min="1" 
              max="50"
              className="block w-24 rounded-md border border-blue-300 px-3 py-2"
              value={formData.quantity}
              onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
            />
          </div>
        )}

        <div>
            <label className="block text-sm font-medium text-slate-700">Category</label>
            <select 
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
            >
                <option value="">Select Category...</option>
                {(Array.isArray(categories) ? categories : []).map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
            </select>
        </div>

        <div>
            <label className="block text-sm font-medium text-slate-700">Image</label>
            <input 
                type="file" 
                accept="image/*"
                onChange={e => setImageFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm text-slate-500"
            />
        </div>

        <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea 
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                rows={3}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
            />
        </div>
      </div>

      {/* Settings */}
      <div className="border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <label className="block text-sm font-medium text-slate-700">Max Borrow Time (Minutes)</label>
            <input 
                type="number" 
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                value={formData.max_borrow_duration}
                onChange={e => setFormData({...formData, max_borrow_duration: parseInt(e.target.value)})}
            />
            <p className="text-xs text-slate-500 mt-1">Default is 60 mins.</p>
        </div>

        <div>
            <label className="block text-sm font-medium text-slate-700">Internal Note</label>
            <input 
                type="text" 
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                value={formData.internal_note}
                onChange={e => setFormData({...formData, internal_note: e.target.value})}
                placeholder="e.g. Purchased 2024"
            />
        </div>
      </div>

      {/* Tags */}
      <div className="border-t pt-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
        <div className="flex flex-wrap gap-2">
            {(Array.isArray(tags) ? tags : []).map(tag => (
                <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                        (formData.tags as number[]).includes(tag.id)
                            ? 'bg-purple-100 border-purple-300 text-purple-700'
                            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    {tag.icon} {tag.name}
                </button>
            ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <button 
            type="button" 
            onClick={() => router.back()}
            className="px-4 py-2 text-slate-600 hover:text-slate-800"
        >
            Cancel
        </button>
        <button 
            type="submit" 
            disabled={loading}
            className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
        >
            {loading ? 'Saving...' : (initialData ? 'Update Item' : 'Create Items')}
        </button>
      </div>

      {/* Toast Notification */}
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast({ ...toast, isVisible: false })} 
      />
    </form>
  );
}

