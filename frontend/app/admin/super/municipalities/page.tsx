'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';

interface CountryOption { id: number; name: string; }

function ManageMunicipalitiesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- STATE ---
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [countries, setCountries] = useState<CountryOption[]>([]);
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
  
  // Files
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);

  const initialFormState = {
    country: '',
    name: '',
    municipality_code: '',
    description: '',
    terms_and_conditions: '',
    email: '',
    phone: '',
    website_link: '',
    allow_self_registration: true,
    // Social Media inputs (we will pack these into JSON later)
    facebook: '',
    instagram: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // --- LOAD DATA ---
  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    fetchMunicipalities();
  }, [searchParams]);

  const fetchCountries = async () => {
    try {
      const countryRes = await api.get('/countries/');
      const countryData = Array.isArray(countryRes.data) ? countryRes.data : (countryRes.data.results || []);
      setCountries(countryData);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMunicipalities = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      const page = searchParams.get('page');
      if (page) params.set('page', page);
      
      // Add filters
      const country = searchParams.get('country');
      if (country) params.set('country', country);
      
      const search = searchParams.get('search');
      if (search) params.set('search', search);
      
      const muniRes = await api.get(`/municipalities/?${params.toString()}`);
      
      // Handle both paginated and non-paginated responses
      if (Array.isArray(muniRes.data)) {
        // Non-paginated response (array)
        setMunicipalities(muniRes.data);
        setTotalCount(muniRes.data.length);
      } else {
        // Paginated response (object with results and count)
        setMunicipalities(muniRes.data.results || []);
        setTotalCount(muniRes.data.count || (muniRes.data.results?.length || 0));
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
    setAvatarFile(null); setAvatarPreview(null);
    setHeroFile(null); setHeroPreview(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setIsEditing(true);
    setEditId(item.id);
    
    // Parse social media JSON safely
    let social = { facebook: '', instagram: '' };
    try {
      if (item.social_media) {
        if (typeof item.social_media === 'string') {
          social = { ...social, ...JSON.parse(item.social_media) };
        } else if (typeof item.social_media === 'object') {
          social = { ...social, ...item.social_media };
        }
      }
    } catch (e) {}

    setFormData({
      country: String(item.country?.id ?? item.country ?? ''),
      name: item.name,
      municipality_code: item.municipality_code || '',
      description: item.description || '',
      terms_and_conditions: item.terms_and_conditions || '',
      email: item.email || '',
      phone: item.phone || '',
      website_link: item.website_link || '',
      allow_self_registration: item.allow_self_registration ?? true,
      facebook: social.facebook || '',
      instagram: social.instagram || ''
    });

    setAvatarFile(null);
    setAvatarPreview(item.avatar ? getMediaUrl(item.avatar) : null);
    
    setHeroFile(null);
    setHeroPreview(item.hero_image ? getMediaUrl(item.hero_image) : null);
    
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure? This will delete all clubs linked to this municipality.")) return;
    try {
      await api.delete(`/municipalities/${id}/`);
      setToast({
        message: 'Municipality deleted successfully!',
        type: 'success',
        isVisible: true,
      });
      fetchMunicipalities();
    } catch (err) {
      setToast({
        message: 'Failed to delete municipality.',
        type: 'error',
        isVisible: true,
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'hero') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'avatar') {
          setAvatarFile(file);
          setAvatarPreview(reader.result as string);
        } else {
          setHeroFile(file);
          setHeroPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = new FormData();
      
      // Pack social media into JSON string
      const socialMediaJson = JSON.stringify({
        facebook: formData.facebook,
        instagram: formData.instagram
      });

      data.append('country', formData.country);
      data.append('name', formData.name);
      data.append('municipality_code', formData.municipality_code);
      data.append('description', formData.description);
      data.append('terms_and_conditions', formData.terms_and_conditions);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('website_link', formData.website_link);
      data.append('allow_self_registration', formData.allow_self_registration.toString());
      data.append('social_media', socialMediaJson);
      
      if (avatarFile) data.append('avatar', avatarFile);
      if (heroFile) data.append('hero_image', heroFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      
      if (isEditing && editId) {
        await api.patch(`/municipalities/${editId}/`, data, config);
        setToast({
          message: 'Municipality updated successfully!',
          type: 'success',
          isVisible: true,
        });
      } else {
        await api.post('/municipalities/', data, config);
        setToast({
          message: 'Municipality created successfully!',
          type: 'success',
          isVisible: true,
        });
      }

      setShowModal(false);
      fetchMunicipalities();
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
        <h1 className="text-2xl font-bold text-gray-800">Manage Municipalities</h1>
        <button onClick={handleOpenCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow">
          + Add Municipality
        </button>
      </div>

      {/* --- FILTER BAR --- */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name, code, email, or description..."
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('search') || ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value.trim()) {
                  updateUrl('search', value.trim());
                } else {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete('search');
                  params.set('page', '1');
                  router.push(`${pathname}?${params.toString()}`);
                }
              }}
            />
          </div>

          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Country</label>
            <select
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('country') || ''}
              onChange={(e) => updateUrl('country', e.target.value)}
            >
              <option value="">All Countries</option>
              {Array.isArray(countries) && countries.map(c => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => router.push(pathname)}
            className="px-4 py-2 text-sm text-gray-500 hover:text-red-500 font-medium pb-2.5"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* --- LIST --- */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : municipalities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No municipalities found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Municipality</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registration</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {municipalities.map((muni) => {
                // Find country name for display
                const countryName = countries.find(c => c.id === muni.country)?.name || muni.country;
                
                return (
                  <tr key={muni.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {muni.avatar ? (
                          <img 
                            src={getMediaUrl(muni.avatar) || ''}
                            alt={muni.name}
                            className="w-10 h-10 rounded-full object-cover mr-3 border"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-100 mr-3 flex items-center justify-center text-gray-400 text-xs font-bold">
                            M
                          </div>
                        )}
                        <div className="text-sm font-bold text-gray-900">{muni.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {countryName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {muni.municipality_code || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${muni.allow_self_registration ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {muni.allow_self_registration ? 'Allowed' : 'Restricted'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                      <Link href={`/admin/super/municipalities/${muni.id}`} className="text-blue-600 hover:text-blue-900 font-bold">View</Link>
                      <button onClick={() => handleOpenEdit(muni)} className="text-indigo-600 hover:text-indigo-900 font-bold">Edit</button>
                      <button onClick={() => handleDelete(muni.id)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                );
              })}
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Municipality' : 'New Municipality'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Name</label>
                  <input required type="text" className="w-full border p-2 rounded" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Country</label>
                  <select required className="w-full border p-2 rounded" 
                    value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})}>
                    <option value="">Select Country...</option>
                    {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">Municipality Code</label>
                  <input type="text" className="w-full border p-2 rounded" 
                    value={formData.municipality_code} onChange={e => setFormData({...formData, municipality_code: e.target.value})} />
                </div>
                
                <div className="flex items-center pt-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={formData.allow_self_registration}
                      onChange={e => setFormData({...formData, allow_self_registration: e.target.checked})}
                      className="text-blue-600 h-5 w-5" />
                    <span className="text-sm font-bold text-gray-700">Allow Self Registration</span>
                  </label>
                </div>
              </div>

              {/* IMAGES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase text-gray-500">Avatar</label>
                  <input type="file" accept="image/*" className="w-full border p-1 rounded text-sm" onChange={e => handleFileChange(e, 'avatar')} />
                  {avatarPreview && <img src={avatarPreview} className="h-16 mt-2 object-contain" alt="Avatar Preview" />}
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 uppercase text-gray-500">Hero Image</label>
                  <input type="file" accept="image/*" className="w-full border p-1 rounded text-sm" onChange={e => handleFileChange(e, 'hero')} />
                  {heroPreview && <img src={heroPreview} className="h-16 mt-2 object-cover w-full rounded" alt="Hero Preview" />}
                </div>
              </div>

              {/* CONTACT */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="email" placeholder="Email" className="border p-2 rounded" 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <input type="text" placeholder="Phone" className="border p-2 rounded" 
                  value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                <input type="url" placeholder="Website URL" className="border p-2 rounded" 
                  value={formData.website_link} onChange={e => setFormData({...formData, website_link: e.target.value})} />
              </div>

              {/* SOCIAL MEDIA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Facebook URL" className="border p-2 rounded" 
                  value={formData.facebook} onChange={e => setFormData({...formData, facebook: e.target.value})} />
                <input type="text" placeholder="Instagram URL" className="border p-2 rounded" 
                  value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">Description</label>
                <textarea rows={2} required className="w-full border p-2 rounded" 
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">Terms & Conditions</label>
                <textarea rows={3} required className="w-full border p-2 rounded" 
                  value={formData.terms_and_conditions} onChange={e => setFormData({...formData, terms_and_conditions: e.target.value})} />
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

export default function ManageMunicipalitiesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ManageMunicipalitiesPageContent />
    </Suspense>
  );
}