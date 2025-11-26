'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';

interface Option { id: number; name: string; }

const WEEKDAYS = [
  { id: 1, name: 'Monday' }, { id: 2, name: 'Tuesday' }, { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' }, { id: 5, name: 'Friday' }, { id: 6, name: 'Saturday' }, { id: 7, name: 'Sunday' },
];

const CYCLES = [
  { id: 'ALL', name: 'Every Week' },
  { id: 'ODD', name: 'Odd Weeks' },
  { id: 'EVEN', name: 'Even Weeks' },
];

const GENDER_RESTRICTIONS = [
  { id: 'ALL', name: 'All Genders' },
  { id: 'BOYS', name: 'Boys Only' },
  { id: 'GIRLS', name: 'Girls Only' },
  { id: 'OTHER', name: 'Other' },
];

function ManageClubsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- STATE ---
  const [clubs, setClubs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [municipalities, setMunicipalities] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  // Modal & Files
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  
  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clubToDelete, setClubToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Opening Hours
  const [openingHours, setOpeningHours] = useState<any[]>([]);
  const [hourError, setHourError] = useState('');

  // Form Data
  const initialFormState = {
    name: '', municipality: '', email: '', phone: '',
    description: '', terms_and_conditions: '', club_policies: '',
    address: '', club_categories: '', latitude: '', longitude: '',
  };
  const [formData, setFormData] = useState(initialFormState);

  // New Hour Form
  const initialHourState = {
    weekday: 1, week_cycle: 'ALL',
    open_time: '14:00', close_time: '20:00',
    title: '', gender_restriction: 'ALL',
    restriction_mode: 'NONE', // NONE, AGE, GRADE
    min_value: '', max_value: ''
  };
  const [newHour, setNewHour] = useState(initialHourState);

  useEffect(() => {
    fetchMunicipalities();
  }, []);

  useEffect(() => {
    fetchClubs();
  }, [searchParams]);

  const fetchMunicipalities = async () => {
    try {
      const muniRes = await api.get('/municipalities/');
      setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : (muniRes.data.results || []));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClubs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      const page = searchParams.get('page');
      if (page) params.set('page', page);
      
      // Add filters
      const municipality = searchParams.get('municipality');
      if (municipality) params.set('municipality', municipality);
      
      const search = searchParams.get('search');
      if (search) params.set('search', search);
      
      const clubRes = await api.get(`/clubs/?${params.toString()}`);
      
      // Handle both paginated and non-paginated responses
      if (Array.isArray(clubRes.data)) {
        // Non-paginated response (array)
        setClubs(clubRes.data);
        setTotalCount(clubRes.data.length);
      } else {
        // Paginated response (object with results and count)
        setClubs(clubRes.data.results || []);
        setTotalCount(clubRes.data.count || (clubRes.data.results?.length || 0));
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

  const handleOpenCreate = () => {
    setIsEditing(false); setEditId(null);
    setFormData(initialFormState);
    setOpeningHours([]); setNewHour(initialHourState);
    setAvatarFile(null); setAvatarPreview(null);
    setHeroFile(null); setHeroPreview(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setIsEditing(true); setEditId(item.id);
    setFormData({
      name: item.name, municipality: item.municipality,
      email: item.email || '', phone: item.phone || '',
      description: item.description || '', terms_and_conditions: item.terms_and_conditions || '',
      club_policies: item.club_policies || '', address: item.address || '',
      club_categories: item.club_categories || '',
      latitude: item.latitude?.toString() || '', longitude: item.longitude?.toString() || '',
    });
    setOpeningHours(item.regular_hours || []);
    setAvatarFile(null); setAvatarPreview(item.avatar ? getMediaUrl(item.avatar) : null);
    setHeroFile(null); setHeroPreview(item.hero_image ? getMediaUrl(item.hero_image) : null);
    setNewHour(initialHourState);
    setShowModal(true);
  };

  const handleDeleteClick = (club: any) => {
    setClubToDelete({ id: club.id, name: club.name });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clubToDelete) return;

    setIsDeleting(true);
    try { 
      await api.delete(`/clubs/${clubToDelete.id}/`);
      setToast({
        message: 'Club deleted successfully!',
        type: 'success',
        isVisible: true,
      });
      setShowDeleteModal(false);
      setClubToDelete(null);
      fetchClubs(); 
    } 
    catch (err) { 
      setToast({
        message: 'Failed to delete club.',
        type: 'error',
        isVisible: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'hero') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'avatar') { setAvatarFile(file); setAvatarPreview(reader.result as string); } 
        else { setHeroFile(file); setHeroPreview(reader.result as string); }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- HOUR VALIDATION ---
  const checkOverlap = (newItem: any) => {
    // Convert time string "14:00" to minutes
    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const start = toMins(newItem.open_time);
    const end = toMins(newItem.close_time);

    // Validation: End must be after Start
    if (end <= start) return "Close time must be after Open time.";

    // Check against existing
    for (const h of openingHours) {
      if (h.weekday !== newItem.weekday) continue;
      
      // Cycle Check: Overlap if either is ALL or they match
      const cycleOverlap = h.week_cycle === 'ALL' || newItem.week_cycle === 'ALL' || h.week_cycle === newItem.week_cycle;
      if (!cycleOverlap) continue;

      const s2 = toMins(h.open_time);
      const e2 = toMins(h.close_time);

      // Overlap formula: (StartA < EndB) and (EndA > StartB)
      // Note: We use < and > to allow touching (e.g. 15:00 end and 15:00 start is ok)
      if (start < e2 && end > s2) {
        return `Overlap detected with existing hour: ${h.open_time}-${h.close_time} (${h.week_cycle === 'ALL' ? 'Every Week' : h.week_cycle})`;
      }
    }
    return null;
  };

  const addHour = () => {
    setHourError('');
    const error = checkOverlap(newHour);
    if (error) {
      setHourError(error);
      return;
    }
    setOpeningHours([...openingHours, { ...newHour }]);
    // Keep the day selected for faster entry, reset times/title
    setNewHour({ ...newHour, title: '', min_value: '', max_value: '' }); 
  };

  const removeHour = (index: number) => {
    const updated = [...openingHours];
    updated.splice(index, 1);
    setOpeningHours(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields (trim whitespace and check for actual content)
    const trimmedName = formData.name?.trim();
    const municipalityValue = formData.municipality?.toString().trim();
    const trimmedEmail = formData.email?.trim();
    const trimmedPhone = formData.phone?.trim();
    const trimmedDescription = formData.description?.trim();
    const trimmedTerms = formData.terms_and_conditions?.trim();
    const trimmedPolicies = formData.club_policies?.trim();
    
    // Check if municipality is a valid number
    const isValidMunicipality = municipalityValue && !isNaN(Number(municipalityValue)) && Number(municipalityValue) > 0;
    
    if (!trimmedName || !isValidMunicipality || !trimmedEmail || !trimmedPhone || 
        !trimmedDescription || !trimmedTerms || !trimmedPolicies) {
      const missingFields = [];
      if (!trimmedName) missingFields.push('Name');
      if (!isValidMunicipality) missingFields.push('Municipality');
      if (!trimmedEmail) missingFields.push('Email');
      if (!trimmedPhone) missingFields.push('Phone');
      if (!trimmedDescription) missingFields.push('Description');
      if (!trimmedTerms) missingFields.push('Terms & Conditions');
      if (!trimmedPolicies) missingFields.push('Club Policies');
      
      alert(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    try {
      const data = new FormData();
      // Append all form fields with trimmed values (validation already ensured required fields are filled)
      data.append('name', trimmedName);
      data.append('municipality', municipalityValue);
      data.append('email', trimmedEmail);
      data.append('phone', trimmedPhone);
      data.append('description', trimmedDescription);
      data.append('terms_and_conditions', trimmedTerms);
      data.append('club_policies', trimmedPolicies);
      // Append optional fields
      if (formData.address?.trim()) data.append('address', formData.address.trim());
      if (formData.club_categories?.trim()) data.append('club_categories', formData.club_categories.trim());
      if (formData.latitude?.trim()) data.append('latitude', formData.latitude.trim());
      if (formData.longitude?.trim()) data.append('longitude', formData.longitude.trim());
      
      // Clean up opening hours data before sending
      const cleanedHours = openingHours.map(hour => {
        const cleaned: any = {
          weekday: hour.weekday,
          week_cycle: hour.week_cycle || 'ALL',
          open_time: hour.open_time,
          close_time: hour.close_time,
          title: hour.title || '',
          gender_restriction: hour.gender_restriction || 'ALL',
          restriction_mode: hour.restriction_mode || 'NONE',
        };
        
        // Only include min_value/max_value if restriction_mode is not 'NONE'
        if (cleaned.restriction_mode !== 'NONE') {
          cleaned.min_value = hour.min_value ? parseInt(hour.min_value) : null;
          cleaned.max_value = hour.max_value ? parseInt(hour.max_value) : null;
        } else {
          cleaned.min_value = null;
          cleaned.max_value = null;
        }
        
        return cleaned;
      });
      
      data.append('regular_hours_data', JSON.stringify(cleanedHours));
      if (avatarFile) data.append('avatar', avatarFile);
      if (heroFile) data.append('hero_image', heroFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEditing && editId) {
        await api.patch(`/clubs/${editId}/`, data, config);
        setToast({
          message: 'Club updated successfully!',
          type: 'success',
          isVisible: true,
        });
      } else {
        await api.post('/clubs/', data, config);
        setToast({
          message: 'Club created successfully!',
          type: 'success',
          isVisible: true,
        });
      }

      setShowModal(false);
      fetchClubs();
    } catch (err: any) { 
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || JSON.stringify(err?.response?.data) || 'Operation failed.';
      setToast({
        message: `Error: ${errorMessage}`,
        type: 'error',
        isVisible: true,
      });
      console.error('Full error:', err);
      console.error('Error response data:', err?.response?.data);
    }
  };

  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / 10) : 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manage Clubs</h1>
        <button onClick={handleOpenCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow">+ Add Club</button>
      </div>

      {/* --- FILTER BAR --- */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by club name, email, or description..."
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
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Municipality</label>
            <select
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('municipality') || ''}
              onChange={(e) => updateUrl('municipality', e.target.value)}
            >
              <option value="">All Municipalities</option>
              {Array.isArray(municipalities) && municipalities.map(m => (
                <option key={m.id} value={m.id.toString()}>{m.name}</option>
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

      {/* LIST */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        {isLoading ? <div className="p-8 text-center">Loading...</div> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Club</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Municipality</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clubs.map((club) => (
                <tr key={club.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {club.avatar ? <img src={getMediaUrl(club.avatar) || ''} className="w-10 h-10 rounded-full object-cover mr-3" /> : <div className="w-10 h-10 bg-gray-200 rounded-full mr-3 flex items-center justify-center text-xs">C</div>}
                      <div className="text-sm font-bold">{club.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{club.municipality_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{club.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-4">
                    <Link href={`/admin/super/clubs/${club.id}`} className="text-blue-600 hover:text-blue-900 font-bold">View</Link>
                    <button onClick={() => handleOpenEdit(club)} className="text-indigo-600 hover:text-indigo-900 font-bold">Edit</button>
                    <button onClick={() => handleDeleteClick(club)} className="text-red-600 hover:text-red-900">Delete</button>
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

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Club' : 'New Club'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Col: Basic */}
                <div className="space-y-4">
                  <div><label className="text-sm font-bold">Club Name</label><input required type="text" className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                  <div><label className="text-sm font-bold">Municipality</label><select required className="w-full border p-2 rounded" value={formData.municipality} onChange={e => setFormData({...formData, municipality: e.target.value})}>
                    <option value="">Select municipality</option>
                    {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select></div>
                  <div className="grid grid-cols-2 gap-2">
                    <input required type="email" placeholder="Email" className="border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    <input required type="text" placeholder="Phone" className="border p-2 rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div><label className="text-sm font-bold">Description</label><textarea required rows={3} className="w-full border p-2 rounded" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                  <div><label className="text-sm font-bold">Address</label><input type="text" className="w-full border p-2 rounded" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-sm font-bold">Latitude</label><input type="number" step="any" placeholder="e.g. 59.3293" className="w-full border p-2 rounded" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} /></div>
                    <div><label className="text-sm font-bold">Longitude</label><input type="number" step="any" placeholder="e.g. 18.0686" className="w-full border p-2 rounded" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} /></div>
                  </div>
                  <div><label className="text-sm font-bold">Categories</label><input type="text" placeholder="e.g. Sports, Art" className="w-full border p-2 rounded" value={formData.club_categories} onChange={e => setFormData({...formData, club_categories: e.target.value})} /></div>
                </div>
                
                {/* Right Col: Media & Legal */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded">
                    <div><label className="text-xs font-bold uppercase">Avatar</label><input type="file" className="w-full text-xs" onChange={e => handleFileChange(e, 'avatar')} />{avatarPreview && <img src={avatarPreview} className="h-10 mt-1" />}</div>
                    <div><label className="text-xs font-bold uppercase">Hero</label><input type="file" className="w-full text-xs" onChange={e => handleFileChange(e, 'hero')} />{heroPreview && <img src={heroPreview} className="h-10 mt-1 rounded" />}</div>
                  </div>
                  <div><label className="text-sm font-bold">Terms & Conditions</label><textarea required rows={2} placeholder="Terms & Conditions" className="w-full border p-2 rounded text-sm" value={formData.terms_and_conditions} onChange={e => setFormData({...formData, terms_and_conditions: e.target.value})} /></div>
                  <div><label className="text-sm font-bold">Club Policies</label><textarea required rows={2} placeholder="Club Policies" className="w-full border p-2 rounded text-sm" value={formData.club_policies} onChange={e => setFormData({...formData, club_policies: e.target.value})} /></div>
                </div>
              </div>

              {/* HOURS BUILDER */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-bold text-gray-700 mb-4">Opening Hours</h3>
                
                {/* Add Form */}
                <div className="bg-gray-50 p-3 rounded mb-4 border space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <select className="border p-1 rounded text-sm w-32" value={newHour.weekday} onChange={e => setNewHour({...newHour, weekday: parseInt(e.target.value)})}>
                      {WEEKDAYS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <select className="border p-1 rounded text-sm w-32" value={newHour.week_cycle} onChange={e => setNewHour({...newHour, week_cycle: e.target.value})}>
                      {CYCLES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input type="time" className="border p-1 rounded text-sm" value={newHour.open_time} onChange={e => setNewHour({...newHour, open_time: e.target.value})} />
                    <span>-</span>
                    <input type="time" className="border p-1 rounded text-sm" value={newHour.close_time} onChange={e => setNewHour({...newHour, close_time: e.target.value})} />
                  </div>

                  {/* RESTRICTIONS ROW */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <select className="border p-1 rounded text-sm w-32 bg-white" value={newHour.restriction_mode} onChange={e => setNewHour({...newHour, restriction_mode: e.target.value})}>
                      <option value="NONE">No Restriction</option>
                      <option value="AGE">Age Range</option>
                      <option value="GRADE">Grade Range</option>
                    </select>

                    {newHour.restriction_mode !== 'NONE' && (
                      <div className="flex items-center gap-1">
                        <input type="number" placeholder="From" className="border p-1 rounded text-sm w-16" value={newHour.min_value} onChange={e => setNewHour({...newHour, min_value: e.target.value})} />
                        <span className="text-gray-500">-</span>
                        <input type="number" placeholder="To" className="border p-1 rounded text-sm w-16" value={newHour.max_value} onChange={e => setNewHour({...newHour, max_value: e.target.value})} />
                        <span className="text-xs text-gray-500 font-bold uppercase ml-1">{newHour.restriction_mode}</span>
                      </div>
                    )}

                    <select className="border p-1 rounded text-sm w-36 bg-white" value={newHour.gender_restriction} onChange={e => setNewHour({...newHour, gender_restriction: e.target.value})}>
                      {GENDER_RESTRICTIONS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>

                    <input type="text" placeholder="Title (Optional)" className="border p-1 rounded text-sm flex-1" value={newHour.title} onChange={e => setNewHour({...newHour, title: e.target.value})} />
                    
                    <button type="button" onClick={addHour} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 ml-auto">+ Add Hour</button>
                  </div>
                  
                  {hourError && <p className="text-red-600 text-xs font-bold">{hourError}</p>}
                </div>

                {/* HOURS LIST */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {openingHours.map((hour, idx) => {
                    const dayName = WEEKDAYS.find(d => d.id === hour.weekday)?.name;
                    const cycleName = CYCLES.find(c => c.id === hour.week_cycle)?.name;
                    const genderName = GENDER_RESTRICTIONS.find(g => g.id === hour.gender_restriction)?.name || 'All Genders';
                    return (
                      <div key={idx} className="flex justify-between items-center bg-white border p-2 rounded shadow-sm text-sm">
                        <div className="flex gap-2">
                          <span className="font-bold w-24">{dayName}</span>
                          <span className="text-gray-500 text-xs uppercase w-20 pt-0.5">{cycleName}</span>
                          <span>{hour.open_time.substring(0,5)} - {hour.close_time.substring(0,5)}</span>
                        </div>
                        
                        <div className="flex gap-4 items-center">
                          {hour.restriction_mode !== 'NONE' && (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold">
                              {hour.restriction_mode === 'AGE' ? 'Age' : 'Grade'} {hour.min_value}-{hour.max_value}
                            </span>
                          )}
                          {hour.gender_restriction !== 'ALL' && (
                            <span className="bg-pink-100 text-pink-800 px-2 py-0.5 rounded text-xs font-bold">
                              {genderName}
                            </span>
                          )}
                          {hour.title && <span className="text-gray-500 italic">{hour.title}</span>}
                          <button type="button" onClick={() => removeHour(idx)} className="text-red-500 font-bold px-2">×</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-500">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">{isEditing ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isVisible={showDeleteModal}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteModal(false);
            setClubToDelete(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        itemName={clubToDelete?.name}
        isLoading={isDeleting}
      />

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

export default function ManageClubsPage() {
  return <Suspense fallback={<div>Loading...</div>}><ManageClubsPageContent /></Suspense>;
}
