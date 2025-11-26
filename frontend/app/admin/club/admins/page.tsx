'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';
import { useAuth } from '../../../../context/AuthContext';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';

interface AdminStats {
  total_admins?: number;
  verification?: { verified?: number; pending?: number; unverified?: number };
  activity?: { active_7_days?: number };
}

function ManageClubAdminsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [avatarErrors, setAvatarErrors] = useState<Set<number>>(new Set());

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  
  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const initialFormState = {
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    nickname: '',
    legal_gender: 'MALE',
    phone_number: '',
    profession: '',
    hide_contact_info: false,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [searchParams]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/users/stats/');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('role', 'CLUB_ADMIN');

      const page = searchParams.get('page');
      const search = searchParams.get('search');
      const status = searchParams.get('verification_status');
      const gender = searchParams.get('legal_gender');

      if (page) params.set('page', page);
      if (search) params.set('search', search);
      if (status) params.set('verification_status', status);
      if (gender) params.set('legal_gender', gender);

      const res = await api.get(`/users/?${params.toString()}`);
      const list = res.data.results || [];
      setUsers(list);
      setTotalCount(res.data.count ?? list.length);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditUserId(null);
    setFormData(initialFormState);
    setAvatarFile(null);
    setAvatarPreview(null);
    setShowModal(true);
  };

  const handleOpenEdit = (admin: any) => {
    setIsEditing(true);
    setEditUserId(admin.id);
    setFormData({
      email: admin.email,
      password: '',
      first_name: admin.first_name || '',
      last_name: admin.last_name || '',
      nickname: admin.nickname || '',
      legal_gender: admin.legal_gender || 'MALE',
      phone_number: admin.phone_number || '',
      profession: admin.profession || '',
      hide_contact_info: !!admin.hide_contact_info,
    });
    setAvatarFile(null);
    setAvatarPreview(admin.avatar ? getMediaUrl(admin.avatar) : null);
    setShowModal(true);
  };

  const handleDeleteClick = (admin: any) => {
    // Prevent admins from deleting themselves
    if (currentUser && currentUser.id === admin.id) {
      setToast({ 
        message: 'You cannot delete your own account.', 
        type: 'warning', 
        isVisible: true 
      });
      return;
    }

    setUserToDelete({ id: admin.id, name: `${admin.first_name} ${admin.last_name}` });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/users/${userToDelete.id}/`);
      setToast({ message: 'Admin deleted successfully!', type: 'success', isVisible: true });
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchAdmins();
      fetchStats();
    } catch (err) {
      setToast({ message: 'Failed to delete admin.', type: 'error', isVisible: true });
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
        data.append(key, typeof value === 'boolean' ? String(value) : value.toString());
      });
      data.append('role', 'CLUB_ADMIN');
      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEditing && editUserId) {
        await api.patch(`/users/${editUserId}/`, data, config);
        setToast({ message: 'Admin updated!', type: 'success', isVisible: true });
      } else {
        await api.post('/users/', data, config);
        setToast({ message: 'Admin created!', type: 'success', isVisible: true });
      }

      setShowModal(false);
      fetchAdmins();
      fetchStats();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Operation failed. Please try again.', type: 'error', isVisible: true });
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const getInitials = (first = '', last = '') => {
    const a = first.charAt(0).toUpperCase() || '';
    const b = last.charAt(0).toUpperCase() || '';
    return a + b || '?';
  };

  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / 10) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4 items-center">
        <div>
          <p className="text-sm text-emerald-500 uppercase font-semibold">Club Admin</p>
          <h1 className="text-3xl font-bold text-gray-900">Manage Admins</h1>
          <p className="text-gray-500 text-sm">Create, edit, and track the admins within your club.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-semibold shadow hover:bg-emerald-700 transition"
        >
          + Add Admin
        </button>
      </div>

      {stats && (
        <div className="rounded-xl border border-emerald-100 bg-white shadow-sm">
          <button
            onClick={() => setAnalyticsExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-sm font-semibold text-gray-700">Analytics Overview</span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${analyticsExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-4 pb-4 transition-all duration-500 ${
              analyticsExpanded ? 'max-h-[500px] pt-2 opacity-100' : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'
            } overflow-hidden`}
          >
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl p-4 shadow-md">
              <p className="text-xs uppercase tracking-wide text-white/80">Total Admins</p>
              <p className="text-3xl font-bold mt-1">{stats.total_admins ?? users.length}</p>
            </div>
            <div className="bg-white border border-emerald-50 rounded-xl p-4 shadow-sm">
              <p className="text-xs uppercase text-gray-500 mb-1">Verified</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.verification?.verified ?? 0}</p>
            </div>
            <div className="bg-white border border-emerald-50 rounded-xl p-4 shadow-sm">
              <p className="text-xs uppercase text-gray-500 mb-1">Pending</p>
              <p className="text-2xl font-bold text-amber-500">{stats.verification?.pending ?? 0}</p>
            </div>
            <div className="bg-white border border-emerald-50 rounded-xl p-4 shadow-sm">
              <p className="text-xs uppercase text-gray-500 mb-1">Active (7d)</p>
              <p className="text-2xl font-bold text-gray-800">{stats.activity?.active_7_days ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Search</label>
            <input
              type="text"
              placeholder="Search name or email..."
              value={searchParams.get('search') || ''}
              onChange={(e) => updateUrl('search', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="w-48">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Verification Status</label>
            <select
              value={searchParams.get('verification_status') || ''}
              onChange={(e) => updateUrl('verification_status', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 bg-gray-50"
            >
              <option value="">All</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING">Pending</option>
              <option value="UNVERIFIED">Unverified</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Gender</label>
            <select
              value={searchParams.get('legal_gender') || ''}
              onChange={(e) => updateUrl('legal_gender', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 bg-gray-50"
            >
              <option value="">Any</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <button
            onClick={() => router.push(pathname)}
            className="px-4 py-2 text-sm text-gray-500 hover:text-red-500"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading admins...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No admins found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Job Title</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((admin) => (
                <tr key={admin.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {admin.avatar && !avatarErrors.has(admin.id) ? (
                        <img
                          src={getMediaUrl(admin.avatar) || ''}
                          alt="avatar"
                          className="w-10 h-10 rounded-full object-cover mr-3 border border-emerald-100"
                          onError={() =>
                            setAvatarErrors((prev) => {
                              const next = new Set(prev);
                              next.add(admin.id);
                              return next;
                            })
                          }
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold mr-3">
                          {getInitials(admin.first_name, admin.last_name)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">
                          {admin.first_name} {admin.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                      Club Admin
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{admin.profession || '—'}</td>
                  <td className="px-6 py-4 text-right space-x-4">
                    <button onClick={() => handleOpenEdit(admin)} className="text-emerald-600 font-semibold">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteClick(admin)} className="text-red-600 font-semibold">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between border border-gray-100 bg-white px-4 py-3 rounded-xl shadow-sm">
        <div className="text-sm text-gray-600">Total admins: {totalCount}</div>
        <div className="flex items-center gap-3">
          <button
            disabled={currentPage === 1}
            onClick={() => updateUrl('page', (currentPage - 1).toString())}
            className="px-3 py-1 rounded border text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => updateUrl('page', (currentPage + 1).toString())}
            className="px-3 py-1 rounded border text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">{isEditing ? 'Edit Admin' : 'Create Admin'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  required
                  type="text"
                  placeholder="First Name"
                  className="border p-2 rounded"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
                <input
                  required
                  type="text"
                  placeholder="Last Name"
                  className="border p-2 rounded"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Nickname"
                  className="border p-2 rounded"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                />
                <select
                  className="border p-2 rounded"
                  value={formData.legal_gender}
                  onChange={(e) => setFormData({ ...formData, legal_gender: e.target.value })}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                <input
                  required
                  type="email"
                  placeholder="Email"
                  className="border p-2 rounded"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <input
                  type="password"
                  placeholder={isEditing ? 'New Password (optional)' : 'Password'}
                  className="border p-2 rounded"
                  required={!isEditing}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Phone"
                  className="border p-2 rounded"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Profession / Job Title"
                  className="border p-2 rounded"
                  value={formData.profession}
                  onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
                <input type="file" accept="image/*" className="w-full border p-2 rounded" onChange={handleAvatarChange} />
                {avatarPreview && (
                  <img src={avatarPreview} alt="preview" className="w-16 h-16 rounded-full object-cover mt-2 border" />
                )}
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.hide_contact_info}
                  onChange={(e) => setFormData({ ...formData, hide_contact_info: e.target.checked })}
                />
                Hide contact information
              </label>

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-700"
                >
                  {isEditing ? 'Save Changes' : 'Create Admin'}
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

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

export default function ManageClubAdminsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
      <ManageClubAdminsPageContent />
    </Suspense>
  );
}

