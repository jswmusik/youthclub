'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';
import { useAuth } from '../../../../context/AuthContext';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';

interface Option { id: number; name: string; }

function ManageMuniAdminsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();

  // --- STATE ---
  const [users, setUsers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0); 
  const [isLoading, setIsLoading] = useState(true);
  const [clubs, setClubs] = useState<Option[]>([]);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
    message: '', type: 'success', isVisible: false,
  });

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  
  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const initialFormState = {
    email: '', password: '', first_name: '', last_name: '', nickname: '',
    legal_gender: 'MALE', phone_number: '', profession: '',
    assigned_club: '', hide_contact_info: false
  };

  const [formData, setFormData] = useState(initialFormState);
  // Default to Club Admin (most common action)
  const [adminType, setAdminType] = useState('CLUB_ADMIN');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // --- INITIAL DATA LOAD ---
  useEffect(() => {
    fetchClubs();
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [searchParams]);

  const fetchClubs = async () => {
    try {
      // API automatically filters clubs for this municipality
      const res = await api.get('/clubs/');
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setClubs(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      
      // If no role selected, fetch both valid roles for this view
      if (!params.get('role')) {
          // We handle this by fetching all and filtering on client side or making 2 requests.
          // Since backend scopes data, we can just ask for users and filter out Youth/Guardians visually or via API logic.
          // A cleaner way for the UI:
          const adminRoles = ['MUNICIPALITY_ADMIN', 'CLUB_ADMIN'];
          
          // We fetch all, the backend already excludes Super Admins and other munis
          const res = await api.get(`/users/?${params.toString()}`);
          
          let allUsers = res.data.results || [];
          // Filter to only show Admins (exclude Youth/Guardian if they appear)
          allUsers = allUsers.filter((u: any) => adminRoles.includes(u.role));
          
          setUsers(allUsers);
          setTotalCount(allUsers.length);
      } else {
          // Role specifically requested
          const res = await api.get(`/users/?${params.toString()}`);
          setUsers(res.data.results || []);
          setTotalCount(res.data.count);
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
    setEditUserId(null);
    setFormData(initialFormState);
    setAdminType('CLUB_ADMIN');
    setAvatarFile(null);
    setAvatarPreview(null);
    setShowModal(true);
  };

  const handleOpenEdit = (user: any) => {
    setIsEditing(true);
    setEditUserId(user.id);
    setAdminType(user.role);
    setFormData({
      email: user.email, password: '', 
      first_name: user.first_name || '', last_name: user.last_name || '',
      nickname: user.nickname || '', legal_gender: user.legal_gender || 'MALE',
      phone_number: user.phone_number || '', profession: user.profession || '',
      assigned_club: user.assigned_club || '',
      hide_contact_info: user.hide_contact_info || false
    });
    setAvatarFile(null);
    setAvatarPreview(user.avatar ? getMediaUrl(user.avatar) : null);
    setShowModal(true);
  };

  const handleDeleteClick = (user: any) => {
    // Prevent admins from deleting themselves
    if (currentUser && currentUser.id === user.id) {
      setToast({ 
        message: 'You cannot delete your own account.', 
        type: 'warning', 
        isVisible: true 
      });
      return;
    }

    setUserToDelete({ id: user.id, name: `${user.first_name} ${user.last_name}` });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/users/${userToDelete.id}/`);
      setToast({ message: 'User deleted.', type: 'success', isVisible: true });
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchAdmins();
    } catch (err) { 
      setToast({ message: 'Failed to delete.', type: 'error', isVisible: true });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'password' && !value) return; 
        data.append(key, value.toString());
      });
      data.append('role', adminType);
      
      // Backend automatically assigns municipality
      
      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEditing && editUserId) await api.patch(`/users/${editUserId}/`, data, config);
      else await api.post('/users/', data, config);

      setShowModal(false);
      setToast({ message: isEditing ? 'Updated successfully!' : 'Created successfully!', type: 'success', isVisible: true });
      fetchAdmins();
    } catch (err) { 
      setToast({ message: 'Operation failed.', type: 'error', isVisible: true });
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

  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = Math.ceil(totalCount / 10);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manage Staff</h1>
        <button onClick={handleOpenCreate} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow">
          + Create New Staff
        </button>
      </div>

      {/* --- FILTER BAR --- */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
            <input
              type="text"
              placeholder="Search name or email..."
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('search') || ''}
              onChange={(e) => updateUrl('search', e.target.value)}
            />
          </div>

          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
            <select className="w-full border rounded p-2 text-sm bg-gray-50" value={searchParams.get('role') || ''} onChange={(e) => updateUrl('role', e.target.value)}>
              <option value="">All Roles</option>
              <option value="MUNICIPALITY_ADMIN">Municipality Admin</option>
              <option value="CLUB_ADMIN">Club Admin</option>
            </select>
          </div>

          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Club</label>
            <select className="w-full border rounded p-2 text-sm bg-gray-50" value={searchParams.get('assigned_club') || ''} onChange={(e) => updateUrl('assigned_club', e.target.value)}>
              <option value="">All Clubs</option>
              {clubs.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
            </select>
          </div>

          <button onClick={() => router.push(pathname)} className="px-4 py-2 text-sm text-gray-500 hover:text-red-500 font-medium pb-2.5">
            Clear Filters
          </button>
        </div>
      </div>

      {/* --- LIST --- */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading staff...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No staff found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignment</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.avatar ? (
                        <img src={getMediaUrl(user.avatar) || ''} className="w-10 h-10 rounded-full object-cover mr-3" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold mr-3">
                           {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.role === 'MUNICIPALITY_ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.role === 'CLUB_ADMIN' && (
                       clubs.find(c => c.id === user.assigned_club)?.name || 'Unassigned'
                    )}
                    {user.role === 'MUNICIPALITY_ADMIN' && 'Municipality'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                    <button onClick={() => handleOpenEdit(user)} className="text-indigo-600 hover:text-indigo-900 font-bold">Edit</button>
                    <button onClick={() => handleDeleteClick(user)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- PAGINATION --- */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
        {/* (Standard Pagination Code reused from other pages) */}
        <div className="flex-1 flex justify-between sm:hidden">
             <button disabled={currentPage === 1} onClick={() => updateUrl('page', (currentPage - 1).toString())} className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Previous</button>
             <button disabled={currentPage >= totalPages} onClick={() => updateUrl('page', (currentPage + 1).toString())} className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Next</button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div><p className="text-sm text-gray-700">Page {currentPage} of {totalPages}</p></div>
            <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                    <button disabled={currentPage === 1} onClick={() => updateUrl('page', (currentPage - 1).toString())} className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50">Prev</button>
                    <button disabled={currentPage >= totalPages} onClick={() => updateUrl('page', (currentPage + 1).toString())} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50">Next</button>
                </nav>
            </div>
        </div>
      </div>

      {/* --- MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Staff' : 'Create New Staff'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* ROLE TYPE (Restricted) */}
              <div className="grid grid-cols-2 gap-4">
                {['MUNICIPALITY_ADMIN', 'CLUB_ADMIN'].map((role) => (
                  <button key={role} type="button" 
                    onClick={() => !isEditing && setAdminType(role)}
                    className={`py-3 px-2 rounded-lg text-sm font-bold border-2 transition
                      ${adminType === role ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'}
                      ${isEditing && adminType !== role ? 'opacity-50 cursor-not-allowed' : ''}
                    `}>
                    {role.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* FIELDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required type="text" placeholder="First Name" className="border p-2 rounded" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                <input required type="text" placeholder="Last Name" className="border p-2 rounded" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                <input type="text" placeholder="Nickname" className="border p-2 rounded" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} />
                <select className="border p-2 rounded" value={formData.legal_gender} onChange={e => setFormData({...formData, legal_gender: e.target.value})}>
                  <option value="MALE">Male</option> <option value="FEMALE">Female</option> <option value="OTHER">Other</option>
                </select>
                <input required type="email" placeholder="Email" className="border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <input type="password" placeholder={isEditing ? "New Password" : "Password"} className="border p-2 rounded" required={!isEditing} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                <input type="text" placeholder="Phone" className="border p-2 rounded" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
                {adminType === 'CLUB_ADMIN' && <input type="text" placeholder="Profession" className="border p-2 rounded" value={formData.profession} onChange={e => setFormData({...formData, profession: e.target.value})} />}
              </div>

              {/* AVATAR */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
                <input type="file" accept="image/*" className="w-full border p-2 rounded" onChange={handleAvatarChange} />
                {avatarPreview && <img src={avatarPreview} alt="Preview" className="w-16 h-16 mt-2 rounded-full object-cover border" />}
              </div>

              {/* ASSIGNMENT (Restricted: Only Club selection if applicable) */}
              {adminType === 'CLUB_ADMIN' && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <label className="block text-sm font-bold mb-1 text-gray-700">Assign Club</label>
                  <select className="w-full border p-2 rounded" value={formData.assigned_club} onChange={e => setFormData({...formData, assigned_club: e.target.value})} required>
                    <option value="">Select Club...</option>
                    {clubs.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="hideContact" checked={formData.hide_contact_info} onChange={e => setFormData({...formData, hide_contact_info: e.target.checked})} />
                <label htmlFor="hideContact" className="text-sm text-gray-700">Hide Contact Info</label>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-500">Cancel</button>
                <button type="submit" className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700">
                  {isEditing ? 'Save' : 'Create'}
                </button>
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
            setUserToDelete(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        itemName={userToDelete?.name}
        isLoading={isDeleting}
      />

      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast({ ...toast, isVisible: false })} />
    </div>
  );
}

export default function ManageMuniAdminsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <ManageMuniAdminsPageContent />
    </Suspense>
  );
}