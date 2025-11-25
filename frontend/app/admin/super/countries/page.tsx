'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';

function ManageCountriesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- STATE ---
  const [countries, setCountries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // Form Files
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const initialFormState = {
    name: '',
    country_code: '',
    description: '',
    currency_code: '',
    default_language: '',
    timezone: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // --- LOAD DATA ---
  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/countries/');
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setCountries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- ACTIONS ---
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData(initialFormState);
    setAvatarFile(null);
    setAvatarPreview(null);
    setShowModal(true);
  };

  const handleOpenEdit = (country: any) => {
    setIsEditing(true);
    setEditId(country.id);
    
    setFormData({
      name: country.name,
      country_code: country.country_code,
      description: country.description || '',
      currency_code: country.currency_code || '',
      default_language: country.default_language || '',
      timezone: country.timezone || ''
    });
    setAvatarFile(null);
    setAvatarPreview(country.avatar ? getMediaUrl(country.avatar) : null);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure? This may affect all municipalities and clubs linked to this country.")) return;
    try {
      await api.delete(`/countries/${id}/`);
      setToast({
        message: 'Country deleted successfully!',
        type: 'success',
        isVisible: true,
      });
      fetchCountries();
    } catch (err) {
      setToast({
        message: 'Failed to delete country.',
        type: 'error',
        isVisible: true,
      });
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      
      if (isEditing && editId) {
        await api.patch(`/countries/${editId}/`, data, config);
        setToast({
          message: 'Country updated successfully!',
          type: 'success',
          isVisible: true,
        });
      } else {
        await api.post('/countries/', data, config);
        setToast({
          message: 'Country created successfully!',
          type: 'success',
          isVisible: true,
        });
      }

      setShowModal(false);
      fetchCountries();
    } catch (err) {
      setToast({
        message: 'Operation failed. Please try again.',
        type: 'error',
        isVisible: true,
      });
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manage Countries</h1>
        <button onClick={handleOpenCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow">
          + Add Country
        </button>
      </div>

      {/* --- LIST --- */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : countries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No countries found. Add one to get started.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lang</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {countries.map((country) => (
                <tr key={country.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {country.avatar ? (
                        <img 
                          src={getMediaUrl(country.avatar) || ''}
                          alt={country.name}
                          className="w-10 h-10 rounded-full object-cover mr-3 border bg-gray-50"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 mr-3 flex items-center justify-center text-gray-400 text-xs font-bold">
                          {country.country_code}
                        </div>
                      )}
                      <div className="text-sm font-bold text-gray-900">{country.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {country.country_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {country.currency_code || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {country.default_language || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                    <button onClick={() => handleOpenEdit(country)} className="text-indigo-600 hover:text-indigo-900 font-bold">Edit</button>
                    <button onClick={() => handleDelete(country.id)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Country' : 'New Country'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Name</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. Sweden" 
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Country Code (ISO)</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. SE" 
                    maxLength={5}
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase" 
                    value={formData.country_code} 
                    onChange={e => setFormData({...formData, country_code: e.target.value.toUpperCase()})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">Description</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="General description of the country settings..." 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Currency</label>
                  <input 
                    type="text" 
                    placeholder="e.g. SEK" 
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase" 
                    value={formData.currency_code} 
                    onChange={e => setFormData({...formData, currency_code: e.target.value.toUpperCase()})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Language</label>
                  <input 
                    type="text" 
                    placeholder="e.g. sv" 
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.default_language} 
                    onChange={e => setFormData({...formData, default_language: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Timezone</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Europe/Stockholm" 
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.timezone} 
                    onChange={e => setFormData({...formData, timezone: e.target.value})} 
                  />
                </div>
              </div>

              {/* AVATAR UPLOAD */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">Flag / Avatar</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="w-full border p-2 rounded text-sm" 
                  onChange={handleAvatarChange} 
                />
                {avatarPreview && (
                  <div className="mt-3 flex justify-center bg-gray-50 p-4 rounded border border-dashed">
                    <img src={avatarPreview} alt="Preview" className="h-20 object-contain" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">
                  {isEditing ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

export default function ManageCountriesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ManageCountriesPageContent />
    </Suspense>
  );
}

