'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';

interface YouthOption {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  grade: number | null;
}

function ManageMunicipalityGuardiansPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [guardians, setGuardians] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [avatarErrors, setAvatarErrors] = useState<Set<number>>(new Set());

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  const [youthList, setYouthList] = useState<YouthOption[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [youthSearchTerm, setYouthSearchTerm] = useState('');
  const [showYouthDropdown, setShowYouthDropdown] = useState(false);
  
  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const initialFormState = {
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    legal_gender: 'MALE',
    verification_status: 'UNVERIFIED',
    youth_members: [] as number[],
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchDropdowns();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchGuardians();
  }, [searchParams]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !isEditing && !showModal) {
      const userId = parseInt(editId, 10);
      const existing = guardians.find((g) => g.id === userId);
      if (existing) {
        handleOpenEdit(existing);
      } else if (!isNaN(userId)) {
        api
          .get(`/users/${userId}/`)
          .then((res) => handleOpenEdit(res.data))
          .catch((err) => console.error('Failed to load guardian for edit', err));
      }
    }
  }, [searchParams, guardians, isEditing, showModal]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/users/guardian_stats/');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const youthRes = await api.get('/users/list_youth/');
      setYouthList(Array.isArray(youthRes.data) ? youthRes.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGuardians = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('role', 'GUARDIAN');
      const search = searchParams.get('search');
      if (search) params.set('search', search);
      const gender = searchParams.get('legal_gender');
      if (gender) params.set('legal_gender', gender);
      const status = searchParams.get('verification_status');
      if (status) params.set('verification_status', status);
      const page = searchParams.get('page');
      if (page) params.set('page', page);

      const res = await api.get(`/users/?${params.toString()}`);
      if (res.data?.results) {
        setGuardians(res.data.results);
        setTotalCount(res.data.count ?? res.data.results.length);
      } else {
        const data = Array.isArray(res.data) ? res.data : [];
        setGuardians(data);
        setTotalCount(data.length);
      }
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
    setYouthSearchTerm('');
    setShowYouthDropdown(false);
    setShowModal(true);
  };

  const handleOpenEdit = (guardian: any) => {
    setIsEditing(true);
    setEditUserId(guardian.id);
    setFormData({
      email: guardian.email || '',
      password: '',
      first_name: guardian.first_name || '',
      last_name: guardian.last_name || '',
      phone_number: guardian.phone_number || '',
      legal_gender: guardian.legal_gender || 'MALE',
      verification_status: guardian.verification_status || 'UNVERIFIED',
      youth_members: guardian.youth_members || [],
    });
    setAvatarFile(null);
    setAvatarPreview(guardian.avatar ? getMediaUrl(guardian.avatar) : null);
    setYouthSearchTerm('');
    setShowYouthDropdown(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'password' && !value) return;
        if (key === 'youth_members') return;
        data.append(key, value?.toString() || '');
      });
      formData.youth_members.forEach((id) => data.append('youth_members', id.toString()));
      data.append('role', 'GUARDIAN');
      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEditing && editUserId) {
        await api.patch(`/users/${editUserId}/`, data, config);
        setToast({ message: 'Guardian updated successfully!', type: 'success', isVisible: true });
      } else {
        await api.post('/users/', data, config);
        setToast({ message: 'Guardian created successfully!', type: 'success', isVisible: true });
      }

      setShowModal(false);
      fetchGuardians();
      fetchStats();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Operation failed. Please try again.', type: 'error', isVisible: true });
    }
  };

  const handleDeleteClick = (guardian: any) => {
    setUserToDelete({ id: guardian.id, name: `${guardian.first_name} ${guardian.last_name}` });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/users/${userToDelete.id}/`);
      setToast({ message: 'Guardian deleted successfully!', type: 'success', isVisible: true });
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchGuardians();
      fetchStats();
    } catch (err) {
      setToast({ message: 'Failed to delete guardian.', type: 'error', isVisible: true });
    } finally {
      setIsDeleting(false);
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

  const toggleYouth = (id: number) => {
    setFormData((prev) => {
      const exists = prev.youth_members.includes(id);
      if (exists) {
        return { ...prev, youth_members: prev.youth_members.filter((y) => y !== id) };
      }
      return { ...prev, youth_members: [...prev.youth_members, id] };
    });
    setYouthSearchTerm('');
    setShowYouthDropdown(false);
  };

  const removeYouth = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      youth_members: prev.youth_members.filter((y) => y !== id),
    }));
  };

  const filteredYouth = youthList.filter((y) => {
    const target = `${y.first_name} ${y.last_name} ${y.email}`.toLowerCase();
    return target.includes(youthSearchTerm.toLowerCase()) && !formData.youth_members.includes(y.id);
  });

  const getSelectedYouth = () =>
    formData.youth_members.map((id) => youthList.find((y) => y.id === id)).filter(Boolean) as YouthOption[];

  const getInitials = (first = '', last = '') => {
    const a = first.charAt(0)?.toUpperCase() || '';
    const b = last.charAt(0)?.toUpperCase() || '';
    return a + b || '?';
  };

  const getAvatarColor = () => 'bg-purple-100 text-purple-700';

  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / 10) : 1;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <p className="text-sm text-purple-500 uppercase font-semibold">Municipality Admin</p>
          <h1 className="text-2xl font-bold text-gray-900">Manage Guardians</h1>
        </div>
        <button onClick={handleOpenCreate} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 shadow">
          + Add Guardian
        </button>
      </div>

      {stats && (
        <div className="mb-6">
          <button
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="flex items-center justify-between w-full bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:bg-gray-50 transition-colors mb-3"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700">Analytics</span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${analyticsExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-500 ease-in-out ${
              analyticsExpanded ? 'max-h-[600px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-4 pointer-events-none'
            } overflow-hidden`}
          >
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md p-4 text-white">
              <h3 className="text-xs font-semibold uppercase text-white/80">Total Guardians</h3>
              <p className="text-3xl font-bold mt-1">{stats.total_guardians}</p>
              <p className="text-xs text-white/80">Active in your municipality</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 border border-purple-50">
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Verified</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.verification?.verified ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 border border-purple-50">
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Pending</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.verification?.pending ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 border border-purple-50">
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Active (7 days)</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.activity?.active_7_days ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
            <input
              type="text"
              placeholder="Name or email..."
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('search') || ''}
              onChange={(e) => updateUrl('search', e.target.value)}
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
            <select
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('legal_gender') || ''}
              onChange={(e) => updateUrl('legal_gender', e.target.value)}
            >
              <option value="">All</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
            <select
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('verification_status') || ''}
              onChange={(e) => updateUrl('verification_status', e.target.value)}
            >
              <option value="">All</option>
              <option value="UNVERIFIED">Unverified</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
            </select>
          </div>
          <button
            onClick={() => router.push(pathname)}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:text-red-600 hover:bg-red-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading guardians...</div>
        ) : guardians.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No guardians found for your municipality.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guardian</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Linked Youth</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {guardians.map((guardian) => (
                <tr key={guardian.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {guardian.avatar && !avatarErrors.has(guardian.id) ? (
                        <img
                          src={getMediaUrl(guardian.avatar) || ''}
                          alt="Avatar"
                          className="w-10 h-10 rounded-full object-cover mr-3"
                          onError={() =>
                            setAvatarErrors((prev) => {
                              const next = new Set(prev);
                              next.add(guardian.id);
                              return next;
                            })
                          }
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-full ${getAvatarColor()} flex items-center justify-center font-semibold text-sm mr-3`}>
                          {getInitials(guardian.first_name, guardian.last_name)}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{guardian.first_name} {guardian.last_name}</div>
                        <div className="text-xs text-gray-500">{guardian.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-bold rounded-full ${
                        guardian.verification_status === 'VERIFIED'
                          ? 'bg-green-100 text-green-800'
                          : guardian.verification_status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {guardian.verification_status || 'UNVERIFIED'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <span className="font-semibold">{guardian.youth_members ? guardian.youth_members.length : 0}</span> linked
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-4">
                    <Link href={`/admin/municipality/guardians/${guardian.id}`} className="text-purple-600 font-bold">
                      View
                    </Link>
                    <button onClick={() => handleOpenEdit(guardian)} className="text-indigo-600 font-bold">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteClick(guardian)} className="text-red-600">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
        <div className="text-sm text-gray-600">Total guardians: {totalCount}</div>
        <div className="flex items-center gap-2">
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Guardian' : 'Create Guardian'}</h2>
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
                  placeholder="Phone Number"
                  className="border p-2 rounded"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
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
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <label className="block text-sm font-bold text-purple-800 mb-2">Verification Status</label>
                <div className="flex gap-4">
                  {['UNVERIFIED', 'PENDING', 'VERIFIED'].map((status) => (
                    <label key={status} className="flex items-center space-x-2 text-sm font-medium">
                      <input
                        type="radio"
                        name="verification_status"
                        value={status}
                        checked={formData.verification_status === status}
                        onChange={(e) => setFormData({ ...formData, verification_status: e.target.value })}
                      />
                      <span>{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Assign Youth Members</label>
                {formData.youth_members.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    {getSelectedYouth().map((youth) => (
                      <span
                        key={youth.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-full font-medium"
                      >
                        {youth.first_name} {youth.last_name} {youth.grade ? `(Gr ${youth.grade})` : ''}
                        <button
                          type="button"
                          onClick={() => removeYouth(youth.id)}
                          className="hover:bg-blue-700 rounded-full p-0.5"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Search youth members..."
                    value={youthSearchTerm}
                    onChange={(e) => {
                      setYouthSearchTerm(e.target.value);
                      setShowYouthDropdown(true);
                    }}
                    onFocus={() => setShowYouthDropdown(true)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <svg
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>

                  {showYouthDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowYouthDropdown(false)}></div>
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredYouth.length > 0 ? (
                          filteredYouth.map((y) => (
                            <button
                              key={y.id}
                              type="button"
                              onClick={() => toggleYouth(y.id)}
                              className="w-full text-left px-4 py-2.5 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-gray-900">{y.first_name} {y.last_name}</div>
                              <div className="text-xs text-gray-500">{y.email} {y.grade ? `• Gr ${y.grade}` : ''}</div>
                            </button>
                          ))
                        ) : youthSearchTerm ? (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No youth found for "{youthSearchTerm}"
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            {formData.youth_members.length === 0 ? 'No youth available.' : 'All youth already selected.'}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
                <input type="file" accept="image/*" className="w-full border p-2 rounded" onChange={handleAvatarChange} />
                {avatarPreview && <img src={avatarPreview} alt="Preview" className="w-16 h-16 mt-2 rounded-full object-cover border" />}
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-500">
                  Cancel
                </button>
                <button type="submit" className="bg-purple-600 text-white px-6 py-2 rounded-lg">
                  {isEditing ? 'Save Changes' : 'Create Guardian'}
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

export default function ManageMunicipalityGuardiansPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ManageMunicipalityGuardiansPageContent />
    </Suspense>
  );
}
