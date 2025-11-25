'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';

function ManageInterestsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- STATE ---
  const [interests, setInterests] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
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
    icon: '', // For Emoji
  };

  const [formData, setFormData] = useState(initialFormState);

  // --- LOAD DATA ---
  useEffect(() => {
    fetchInterests();
  }, [searchParams]);

  const fetchInterests = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      const page = searchParams.get('page');
      if (page) params.set('page', page);
      
      const res = await api.get(`/interests/?${params.toString()}`);
      
      // Handle both paginated and non-paginated responses
      if (Array.isArray(res.data)) {
        // Non-paginated response (array)
        setInterests(res.data);
        setTotalCount(res.data.length);
      } else {
        // Paginated response (object with results and count)
        setInterests(res.data.results || []);
        setTotalCount(res.data.count || (res.data.results?.length || 0));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
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

  const handleOpenEdit = (interest: any) => {
    setIsEditing(true);
    setEditId(interest.id);
    
    setFormData({
      name: interest.name,
      icon: interest.icon || '',
    });
    setAvatarFile(null);
    setAvatarPreview(interest.avatar ? getMediaUrl(interest.avatar) : null);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure? This will remove this interest from all users who selected it.")) return;
    try {
      // FIXED URL
      await api.delete(`/interests/${id}/`);
      setToast({
        message: 'Interest deleted successfully!',
        type: 'success',
        isVisible: true,
      });
      fetchInterests();
    } catch (err) {
      setToast({
        message: 'Failed to delete interest.',
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
      data.append('icon', formData.icon);
      
      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      
      // FIXED URLs
      if (isEditing && editId) {
        await api.patch(`/interests/${editId}/`, data, config);
        setToast({
          message: 'Interest updated successfully!',
          type: 'success',
          isVisible: true,
        });
      } else {
        await api.post('/interests/', data, config);
        setToast({
          message: 'Interest created successfully!',
          type: 'success',
          isVisible: true,
        });
      }

      setShowModal(false);
      fetchInterests();
    } catch (err) {
      setToast({
        message: 'Operation failed. Please try again.',
        type: 'error',
        isVisible: true,
      });
      console.error(err);
    }
  };

  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / 10) : 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manage Interests</h1>
        <button onClick={handleOpenCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow">
          + Add Interest
        </button>
      </div>

      {/* --- LIST --- */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : interests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No interests found. Add one to get started.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interest</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Icon (Emoji)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {interests.map((interest) => (
                <tr key={interest.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {/* Show Avatar if exists */}
                      {interest.avatar ? (
                        <img 
                          src={getMediaUrl(interest.avatar) || ''}
                          alt={interest.name}
                          className="w-10 h-10 rounded-lg object-cover mr-3 border bg-gray-50"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 mr-3 flex items-center justify-center text-gray-400 text-xs">
                          No img
                        </div>
                      )}
                      <div className="text-sm font-bold text-gray-900">{interest.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-2xl">
                    {interest.icon}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                    <button onClick={() => handleOpenEdit(interest)} className="text-indigo-600 hover:text-indigo-900 font-bold">Edit</button>
                    <button onClick={() => handleDelete(interest.id)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- PAGINATION CONTROLS --- */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
          <div className="flex flex-1 justify-between sm:hidden">
            <button 
              disabled={currentPage === 1}
              onClick={() => updateUrl('page', (currentPage - 1).toString())}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={currentPage >= totalPages}
              onClick={() => updateUrl('page', (currentPage + 1).toString())}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                {' '}(Total: {totalCount})
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  disabled={currentPage === 1}
                  onClick={() => updateUrl('page', (currentPage - 1).toString())}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  ← Prev
                </button>
                
                {/* Simple Pagination Numbers */}
                {[...Array(totalPages)].map((_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => updateUrl('page', p.toString())}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold 
                        ${p === currentPage 
                          ? 'bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' 
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => updateUrl('page', (currentPage + 1).toString())}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  Next →
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Interest' : 'New Interest'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">Name</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. Football" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">Icon (Emoji)</label>
                <input 
                  type="text" 
                  placeholder="e.g. ⚽" 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.icon} 
                  onChange={e => setFormData({...formData, icon: e.target.value})} 
                />
                <p className="text-xs text-gray-500 mt-1">Type an emoji (Win + . or Cmd + Ctrl + Space)</p>
              </div>

              {/* AVATAR UPLOAD */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700">Cover Image / Icon (SVG/PNG)</label>
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

export default function ManageInterestsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ManageInterestsPageContent />
    </Suspense>
  );
}