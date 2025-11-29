'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import Toast from './Toast';

interface CountryFormProps {
  initialData?: any;
  redirectPath: string;
}

export default function CountryForm({ initialData, redirectPath }: CountryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Form State
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    country_code: initialData?.country_code || '',
    description: initialData?.description || '',
    currency_code: initialData?.currency_code || '',
    default_language: initialData?.default_language || '',
    timezone: initialData?.timezone || ''
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData?.avatar ? getMediaUrl(initialData.avatar) : null
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAvatarFile(e.target.files[0]);
      setAvatarPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('country_code', formData.country_code);
      data.append('description', formData.description);
      data.append('currency_code', formData.currency_code);
      data.append('default_language', formData.default_language);
      data.append('timezone', formData.timezone);
      
      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/countries/${initialData.id}/`, data, config);
        setToast({ message: 'Country updated successfully!', type: 'success', isVisible: true });
      } else {
        await api.post('/countries/', data, config);
        setToast({ message: 'Country created successfully!', type: 'success', isVisible: true });
      }

      setTimeout(() => router.push(redirectPath), 1000);

    } catch (err: any) {
      console.error(err);
      setToast({ message: 'Operation failed. Please try again.', type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {initialData ? 'Edit Country' : 'Add New Country'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Name</label>
            <input 
              required 
              type="text" 
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="e.g. Sweden"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Country Code (ISO)</label>
            <input 
              required 
              type="text" 
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase" 
              placeholder="e.g. SE"
              maxLength={5}
              value={formData.country_code}
              onChange={e => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1 text-gray-700">Description</label>
          <textarea 
            required 
            rows={3} 
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="General description of the country settings..."
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Currency</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase" 
              placeholder="e.g. SEK"
              value={formData.currency_code}
              onChange={e => setFormData({ ...formData, currency_code: e.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Language</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="e.g. sv"
              value={formData.default_language}
              onChange={e => setFormData({ ...formData, default_language: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Timezone</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="e.g. Europe/Stockholm"
              value={formData.timezone}
              onChange={e => setFormData({ ...formData, timezone: e.target.value })}
            />
          </div>
        </div>

        {/* Avatar / Flag */}
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <label className="block text-sm font-bold mb-2 text-gray-700">Flag / Avatar</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="w-full border p-2 rounded text-sm"
            />
          </div>
          {avatarPreview && (
            <div className="w-24 h-24 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center shadow-sm">
              <img src={avatarPreview} alt="Preview" className="w-full h-full object-contain" />
            </div>
          )}
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
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Create')}
          </button>
        </div>

      </form>
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}