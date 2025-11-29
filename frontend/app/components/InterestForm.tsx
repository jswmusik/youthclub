'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';

interface InterestFormProps {
  initialData?: any;
  redirectPath: string;
}

export default function InterestForm({ initialData, redirectPath }: InterestFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Form State
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    icon: initialData?.icon || '',
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData?.avatar ? getMediaUrl(initialData.avatar) : null
  );

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        icon: initialData.icon || '',
      });
      setAvatarFile(null);
      setAvatarPreview(initialData.avatar ? getMediaUrl(initialData.avatar) : null);
    } else {
      // Reset form when creating new
      setFormData({
        name: '',
        icon: '',
      });
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }, [initialData]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Revoke previous object URL if it exists
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(file);
      // Use FileReader like in page.tsx for consistency
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('icon', formData.icon);
      
      if (avatarFile) {
        data.append('avatar', avatarFile);
      }

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/interests/${initialData.id}/`, data, config);
        setToast({ message: 'Interest updated successfully!', type: 'success', isVisible: true });
      } else {
        await api.post('/interests/', data, config);
        setToast({ message: 'Interest created successfully!', type: 'success', isVisible: true });
      }

      // Short delay to show toast before redirect
      setTimeout(() => router.push(redirectPath), 1000);

    } catch (err: any) {
      console.error(err);
      // Handle "Unique" error specifically
      const msg = err.response?.data?.name ? 'An interest with this name already exists.' : 'Operation failed.';
      setToast({ message: msg, type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {initialData ? 'Edit Interest' : 'Create New Interest'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-700">Interest Name</label>
          <input 
            required 
            type="text" 
            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="e.g. Football"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-2 text-gray-700">Icon (Emoji)</label>
          <div className="flex gap-4 items-center">
            <input 
              type="text" 
              className="w-20 border p-3 rounded-lg text-center text-2xl" 
              placeholder="⚽"
              value={formData.icon}
              onChange={e => setFormData({ ...formData, icon: e.target.value })}
            />
            <p className="text-sm text-gray-500">
              Type an emoji (Win + . or Cmd + Ctrl + Space)
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2 text-gray-700">Cover Image / SVG Icon</label>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <input 
                type="file" 
                accept="image/*" 
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                onChange={handleFileChange}
              />
              <p className="text-xs text-gray-400 mt-2">Optional. Used for detailed views or cards.</p>
            </div>
            {avatarPreview && (
              <div className="w-24 h-24 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4 border-t pt-6">
          <button 
            type="button" 
            onClick={() => router.push(redirectPath)} 
            className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading} 
            className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-lg transition"
          >
            {loading ? 'Saving...' : 'Save Interest'}
          </button>
        </div>

      </form>
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}