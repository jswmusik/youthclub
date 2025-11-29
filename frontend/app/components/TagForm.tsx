'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../lib/api';
import Toast from './Toast';

interface TagFormProps {
  initialData?: any;
  redirectPath: string;
}

export default function TagForm({ initialData, redirectPath }: TagFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({
        ...prev,
        name: val,
        // Auto-slugify if creating new
        slug: !initialData ? val.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') : prev.slug
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData) {
        await api.patch(`/news_tags/${initialData.id}/`, formData);
        setToast({ message: 'Tag updated!', type: 'success', isVisible: true });
      } else {
        await api.post('/news_tags/', formData);
        setToast({ message: 'Tag created!', type: 'success', isVisible: true });
      }
      const currentSearchParams = searchParams.toString();
      const finalRedirectPath = currentSearchParams ? `${redirectPath}?${currentSearchParams}` : redirectPath;
      setTimeout(() => router.push(finalRedirectPath), 1000);
    } catch (err: any) {
      console.error(err);
      setToast({ message: 'Failed to save tag.', type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{initialData ? 'Edit Tag' : 'Create Tag'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Tag Name</label>
            <input 
              required 
              type="text" 
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" 
              placeholder="e.g. Summer Events"
              value={formData.name} 
              onChange={handleNameChange} 
            />
        </div>
        <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Slug</label>
            <input 
              required 
              type="text" 
              className="w-full border p-2 rounded bg-gray-100 text-gray-600" 
              placeholder="e.g. summer-events"
              value={formData.slug} 
              onChange={e => setFormData({...formData, slug: e.target.value})} 
            />
            <p className="text-xs text-gray-400 mt-1">Used in the URL. Auto-generated, but editable.</p>
        </div>
        <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => {
              const currentSearchParams = searchParams.toString();
              const finalRedirectPath = currentSearchParams ? `${redirectPath}?${currentSearchParams}` : redirectPath;
              router.push(finalRedirectPath);
            }} className="text-gray-500 hover:text-gray-700">Cancel</button>
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                {loading ? 'Saving...' : (initialData ? 'Save' : 'Create')}
            </button>
        </div>
      </form>
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}