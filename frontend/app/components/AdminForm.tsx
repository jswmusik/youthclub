'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import Toast from './Toast';
import { getMediaUrl } from '../../app/utils';
import { useAuth } from '../../context/AuthContext';

interface Option { id: number; name: string; }

interface AdminFormProps {
  initialData?: any;
  redirectPath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function AdminForm({ initialData, redirectPath, scope }: AdminFormProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Dropdowns
  const [municipalities, setMunicipalities] = useState<Option[]>([]);
  const [clubs, setClubs] = useState<Option[]>([]);

  // Files
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar ? getMediaUrl(initialData.avatar) : null);

  // Determine allowed roles based on scope
  const allowedRoles = [];
  if (scope === 'SUPER') allowedRoles.push('SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN');
  if (scope === 'MUNICIPALITY') allowedRoles.push('MUNICIPALITY_ADMIN', 'CLUB_ADMIN');
  if (scope === 'CLUB') allowedRoles.push('CLUB_ADMIN');

  // Determine default role based on scope
  const getDefaultRole = () => {
    if (scope === 'CLUB') return 'CLUB_ADMIN';
    if (scope === 'MUNICIPALITY') return 'MUNICIPALITY_ADMIN';
    return 'MUNICIPALITY_ADMIN'; // Default for SUPER
  };

  // Form Data
  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    password: '',
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    nickname: initialData?.nickname || '',
    legal_gender: initialData?.legal_gender || 'MALE',
    phone_number: initialData?.phone_number || '',
    profession: initialData?.profession || '',
    assigned_municipality: initialData?.assigned_municipality || '',
    assigned_club: initialData?.assigned_club || '',
    hide_contact_info: initialData?.hide_contact_info || false,
    role: initialData?.role || getDefaultRole()
  });

  useEffect(() => {
    fetchDropdowns();
    // Ensure role is always CLUB_ADMIN for CLUB scope
    if (scope === 'CLUB' && !initialData) {
      setFormData(prev => prev.role !== 'CLUB_ADMIN' ? {...prev, role: 'CLUB_ADMIN'} : prev);
    }
  }, [scope, initialData]);

  const fetchDropdowns = async () => {
    try {
      if (scope === 'SUPER' || scope === 'MUNICIPALITY') {
        const muniRes = await api.get('/municipalities/');
        setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
      }
      // Fetch clubs if needed (Muni admins get their scope's clubs automatically via API)
      const clubRes = await api.get('/clubs/');
      setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'password' && !value) return; // Skip empty password on edit
        data.append(key, value.toString());
      });

      // Handle specific assignments based on scope
      if (scope === 'MUNICIPALITY' && currentUser?.assigned_municipality) {
         // If Municipality Admin creates a user, force assignment to their municipality
         // Note: If creating a Club Admin, backend might need municipality set or inferred from club.
         // Usually Club implies Municipality, but setting it explicitly is safer.
         const muniId = typeof currentUser.assigned_municipality === 'object' 
            ? currentUser.assigned_municipality.id 
            : currentUser.assigned_municipality;
         data.append('assigned_municipality', muniId.toString());
      }
      
      if (scope === 'CLUB' && currentUser?.assigned_club) {
         const clubId = typeof currentUser.assigned_club === 'object' 
            ? currentUser.assigned_club.id 
            : currentUser.assigned_club;
         data.append('assigned_club', clubId.toString());
         data.append('role', 'CLUB_ADMIN'); // Force role
      }

      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (initialData) {
        await api.patch(`/users/${initialData.id}/`, data, config);
        setToast({ message: 'Admin updated successfully!', type: 'success', isVisible: true });
      } else {
        await api.post('/users/', data, config);
        setToast({ message: 'Admin created successfully!', type: 'success', isVisible: true });
      }

      setTimeout(() => router.push(redirectPath), 1000);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Operation failed. Check your inputs.', type: 'error', isVisible: true });
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{initialData ? 'Edit Admin' : 'Create New Admin'}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Role Selection (If applicable) */}
        {allowedRoles.length > 1 && (
          <div className="grid grid-cols-3 gap-4">
            {allowedRoles.map(role => (
              <button
                key={role}
                type="button"
                onClick={() => setFormData({...formData, role})}
                className={`py-3 px-2 rounded-lg text-sm font-bold border-2 transition
                  ${formData.role === role ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}
                `}
              >
                {role.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label className="block text-sm font-bold mb-1">First Name</label><input required type="text" className="w-full border p-2 rounded" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} /></div>
          <div><label className="block text-sm font-bold mb-1">Last Name</label><input required type="text" className="w-full border p-2 rounded" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} /></div>
          {(formData.role === 'CLUB_ADMIN' || scope === 'CLUB') && (
            <div><label className="block text-sm font-bold mb-1">Nickname</label><input type="text" className="w-full border p-2 rounded" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} /></div>
          )}
          <div><label className="block text-sm font-bold mb-1">Email</label><input required type="email" className="w-full border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
          <div><label className="block text-sm font-bold mb-1">Password</label><input type="password" placeholder={initialData ? "Leave blank to keep" : "Password"} className="w-full border p-2 rounded" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
          <div><label className="block text-sm font-bold mb-1">Phone</label><input type="text" className="w-full border p-2 rounded" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} /></div>
          <div>
            <label className="block text-sm font-bold mb-1">Gender</label>
            <select className="w-full border p-2 rounded" value={formData.legal_gender} onChange={e => setFormData({...formData, legal_gender: e.target.value})}>
                <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Assignments */}
        <div className="bg-gray-50 p-4 rounded-lg border">
            {/* Show Municipality Dropdown only if creating Municipality Admin and scope allows selection */}
            {formData.role === 'MUNICIPALITY_ADMIN' && scope === 'SUPER' && (
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-1">Assign Municipality</label>
                    <select className="w-full border p-2 rounded" value={formData.assigned_municipality} onChange={e => setFormData({...formData, assigned_municipality: e.target.value})}>
                        <option value="">Select...</option>
                        {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
            )}

            {/* Show Club Dropdown if creating Club Admin */}
            {(formData.role === 'CLUB_ADMIN' || scope === 'CLUB') && (
                <div>
                    <label className="block text-sm font-bold mb-1">Assign Club</label>
                    <select className="w-full border p-2 rounded" value={formData.assigned_club} onChange={e => setFormData({...formData, assigned_club: e.target.value})}>
                        <option value="">Select...</option>
                        {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            )}
            
            {/* If creating Club Admin, add Profession field */}
            {(formData.role === 'CLUB_ADMIN' || scope === 'CLUB') && (
                <div className="mt-4">
                    <label className="block text-sm font-bold mb-1">Profession / Title</label>
                    <input type="text" className="w-full border p-2 rounded" value={formData.profession} onChange={e => setFormData({...formData, profession: e.target.value})} />
                </div>
            )}
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4">
            <div className="flex-1">
                <label className="block text-sm font-bold mb-1">Avatar</label>
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="text-sm" />
            </div>
            {avatarPreview && <img src={avatarPreview} className="w-16 h-16 rounded-full object-cover border" alt="Preview" />}
        </div>

        <div className="flex justify-end gap-4 border-t pt-4">
            <button type="button" onClick={() => router.push(redirectPath)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Saving...' : 'Save Admin'}
            </button>
        </div>
      </form>
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}