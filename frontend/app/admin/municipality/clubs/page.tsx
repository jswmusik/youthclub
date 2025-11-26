'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import api from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';

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

function ManageMuniClubsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // --- STATE ---
  const [clubs, setClubs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '', type: 'success', isVisible: false,
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

  // Form Data (No municipality field needed, backend handles it)
  const initialFormState = {
    name: '', email: '', phone: '',
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
    fetchClubs();
  }, [searchParams]);

  const fetchClubs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      const page = searchParams.get('page');
      if (page) params.set('page', page);
      const search = searchParams.get('search');
      if (search) params.set('search', search);
      
      // API automatically filters for this user's municipality
      const clubRes = await api.get(`/clubs/?${params.toString()}`);
      
      if (Array.isArray(clubRes.data)) {
        setClubs(clubRes.data);
        setTotalCount(clubRes.data.length);
      } else {
        setClubs(clubRes.data.results || []);
        setTotalCount(clubRes.data.count || 0);
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
      name: item.name,
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
      setToast({ message: 'Club deleted successfully!', type: 'success', isVisible: true });
      setShowDeleteModal(false);
      setClubToDelete(null);
      fetchClubs(); 
    } 
    catch (err) { 
      setToast({ message: 'Failed to delete club.', type: 'error', isVisible: true });
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

  // --- HOURS VALIDATION (Copy from Super Admin) ---
  const checkOverlap = (newItem: any) => {
    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const start = toMins(newItem.open_time);
    const end = toMins(newItem.close_time);
    if (end <= start) return "Close time must be after Open time.";

    for (const h of openingHours) {
      if (h.weekday !== newItem.weekday) continue;
      const cycleOverlap = h.week_cycle === 'ALL' || newItem.week_cycle === 'ALL' || h.week_cycle === newItem.week_cycle;
      if (!cycleOverlap) continue;
      const s2 = toMins(h.open_time);
      const e2 = toMins(h.close_time);
      if (start < e2 && end > s2) {
        return `Overlap detected with existing hour: ${h.open_time}-${h.close_time}`;
      }
    }
    return null;
  };

  const addHour = () => {
    setHourError('');
    const error = checkOverlap(newHour);
    if (error) { setHourError(error); return; }
    setOpeningHours([...openingHours, { ...newHour }]);
    setNewHour({ ...newHour, title: '', min_value: '', max_value: '' }); 
  };

  const removeHour = (index: number) => {
    const updated = [...openingHours];
    updated.splice(index, 1);
    setOpeningHours(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name?.trim();
    if (!trimmedName) { alert('Club Name is required'); return; }

    try {
      const data = new FormData();
      data.append('name', trimmedName);
      
      const assignedMunicipality =
        typeof user?.assigned_municipality === 'object'
          ? user?.assigned_municipality?.id
          : user?.assigned_municipality;

      if (assignedMunicipality) {
        data.append('municipality', assignedMunicipality.toString());
      }
      
      // Append other fields
      const fields = ['email', 'phone', 'description', 'terms_and_conditions', 'club_policies', 'address', 'club_categories', 'latitude', 'longitude'];
      fields.forEach(field => {
        // @ts-ignore
        if (formData[field]?.trim()) data.append(field, formData[field].trim());
      });

      // Clean Hours
      const cleanedHours = openingHours.map(hour => {
        const cleaned: any = {
            weekday: hour.weekday, week_cycle: hour.week_cycle || 'ALL',
            open_time: hour.open_time, close_time: hour.close_time,
            title: hour.title || '', gender_restriction: hour.gender_restriction || 'ALL',
            restriction_mode: hour.restriction_mode || 'NONE',
        };
        if (cleaned.restriction_mode !== 'NONE') {
          cleaned.min_value = hour.min_value ? parseInt(hour.min_value) : null;
          cleaned.max_value = hour.max_value ? parseInt(hour.max_value) : null;
        }
        return cleaned;
      });
      
      data.append('regular_hours_data', JSON.stringify(cleanedHours));
      if (avatarFile) data.append('avatar', avatarFile);
      if (heroFile) data.append('hero_image', heroFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEditing && editId) {
        await api.patch(`/clubs/${editId}/`, data, config);
        setToast({ message: 'Club updated!', type: 'success', isVisible: true });
      } else {
        await api.post('/clubs/', data, config);
        setToast({ message: 'Club created!', type: 'success', isVisible: true });
      }

      setShowModal(false);
      fetchClubs();
    } catch (err: any) {
      const backendMessage = err?.response?.data
        ? typeof err.response.data === 'string'
          ? err.response.data
          : JSON.stringify(err.response.data)
        : 'Operation failed.';
      setToast({ message: backendMessage, type: 'error', isVisible: true });
      console.error(err);
    }
  };

  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / 10) : 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manage My Clubs</h1>
        <button onClick={handleOpenCreate} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow">+ Add Club</button>
      </div>

      {/* --- FILTER BAR --- */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
            <input type="text" placeholder="Search clubs..." className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('search') || ''}
              onChange={(e) => updateUrl('search', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        {isLoading ? <div className="p-8 text-center">Loading...</div> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Club</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{club.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{club.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-4">
                    <Link
                      href={`/admin/municipality/clubs/${club.id}`}
                      className="text-purple-600 hover:text-purple-800 font-bold"
                    >
                      View
                    </Link>
                    <button onClick={() => handleOpenEdit(club)} className="text-indigo-600 font-bold">Edit</button>
                    <button onClick={() => handleDeleteClick(club)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL (Simplified for Municipality Admin - No Municipality Dropdown) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Club' : 'New Club'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Col */}
                <div className="space-y-4">
                  <div><label className="text-sm font-bold">Club Name</label><input required type="text" className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                  {/* Note: No Municipality Dropdown Here! */}
                  <div className="grid grid-cols-2 gap-2">
                    <input required type="email" placeholder="Email" className="border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    <input required type="text" placeholder="Phone" className="border p-2 rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div><label className="text-sm font-bold">Description</label><textarea required rows={3} className="w-full border p-2 rounded" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                  <div><label className="text-sm font-bold">Address</label><input type="text" className="w-full border p-2 rounded" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-sm font-bold">Latitude</label><input type="number" step="any" className="w-full border p-2 rounded" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} /></div>
                    <div><label className="text-sm font-bold">Longitude</label><input type="number" step="any" className="w-full border p-2 rounded" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} /></div>
                  </div>
                  <div><label className="text-sm font-bold">Categories</label><input type="text" className="w-full border p-2 rounded" value={formData.club_categories} onChange={e => setFormData({...formData, club_categories: e.target.value})} /></div>
                </div>
                
                {/* Right Col */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded">
                    <div><label className="text-xs font-bold uppercase">Avatar</label><input type="file" className="w-full text-xs" onChange={e => handleFileChange(e, 'avatar')} />{avatarPreview && <img src={avatarPreview} className="h-10 mt-1" />}</div>
                    <div><label className="text-xs font-bold uppercase">Hero</label><input type="file" className="w-full text-xs" onChange={e => handleFileChange(e, 'hero')} />{heroPreview && <img src={heroPreview} className="h-10 mt-1 rounded" />}</div>
                  </div>
                  <div><label className="text-sm font-bold">Terms & Conditions</label><textarea required rows={2} className="w-full border p-2 rounded text-sm" value={formData.terms_and_conditions} onChange={e => setFormData({...formData, terms_and_conditions: e.target.value})} /></div>
                  <div><label className="text-sm font-bold">Club Policies</label><textarea required rows={2} className="w-full border p-2 rounded text-sm" value={formData.club_policies} onChange={e => setFormData({...formData, club_policies: e.target.value})} /></div>
                </div>
              </div>

              {/* HOURS BUILDER (Identical to Super Admin) */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-bold text-gray-700 mb-4">Opening Hours</h3>
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
                      </div>
                    )}
                    <select className="border p-1 rounded text-sm w-36 bg-white" value={newHour.gender_restriction} onChange={e => setNewHour({...newHour, gender_restriction: e.target.value})}>
                      {GENDER_RESTRICTIONS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <input type="text" placeholder="Title" className="border p-1 rounded text-sm flex-1" value={newHour.title} onChange={e => setNewHour({...newHour, title: e.target.value})} />
                    <button type="button" onClick={addHour} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 ml-auto">+ Add</button>
                  </div>
                  {hourError && <p className="text-red-600 text-xs font-bold">{hourError}</p>}
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {openingHours.map((hour, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white border p-2 rounded shadow-sm text-sm">
                       <div>
                         <span className="font-bold">{WEEKDAYS.find(d => d.id === hour.weekday)?.name}</span> 
                         <span className="mx-2 text-gray-400">|</span>
                         <span>{hour.open_time} - {hour.close_time}</span>
                       </div>
                       <button type="button" onClick={() => removeHour(idx)} className="text-red-500 font-bold">×</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-500">Cancel</button>
                <button type="submit" className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700">{isEditing ? 'Save' : 'Create'}</button>
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

      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast({ ...toast, isVisible: false })} />
    </div>
  );
}

export default function ManageMuniClubsPage() {
  return <Suspense fallback={<div>Loading...</div>}><ManageMuniClubsPageContent /></Suspense>;
}