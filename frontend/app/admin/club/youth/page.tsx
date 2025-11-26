'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';

interface Option { id: number; name: string; }
interface GuardianOption { id: number; first_name: string; last_name: string; email: string; }

function ManageClubYouthPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [users, setUsers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [avatarErrors, setAvatarErrors] = useState<Set<number>>(new Set());

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  const [interests, setInterests] = useState<Option[]>([]);
  const [guardiansList, setGuardiansList] = useState<GuardianOption[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [guardianSearchTerm, setGuardianSearchTerm] = useState('');
  const [showGuardianDropdown, setShowGuardianDropdown] = useState(false);
  const [interestSearchTerm, setInterestSearchTerm] = useState('');
  const [showInterestDropdown, setShowInterestDropdown] = useState(false);

  const initialFormState = {
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    nickname: '',
    legal_gender: 'MALE',
    preferred_gender: '',
    phone_number: '',
    date_of_birth: '',
    grade: '',
    verification_status: 'UNVERIFIED',
    interests: [] as number[],
    guardians: [] as number[],
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchDropdowns();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchYouth();
  }, [searchParams]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/users/youth_stats/');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const interestRes = await api.get('/interests/');
      setInterests(Array.isArray(interestRes.data) ? interestRes.data : (interestRes.data?.results || []));

      const guardianRes = await api.get('/users/list_guardians/');
      setGuardiansList(guardianRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchYouth = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('role', 'YOUTH_MEMBER');

      const page = searchParams.get('page');
      if (page) params.set('page', page);

      const search = searchParams.get('search');
      if (search) params.set('search', search);

      const ageFrom = searchParams.get('age_from');
      if (ageFrom) params.set('age_from', ageFrom);

      const ageTo = searchParams.get('age_to');
      if (ageTo) params.set('age_to', ageTo);

      const gradeFrom = searchParams.get('grade_from');
      if (gradeFrom) params.set('grade_from', gradeFrom);

      const gradeTo = searchParams.get('grade_to');
      if (gradeTo) params.set('grade_to', gradeTo);

      const status = searchParams.get('verification_status');
      if (status) params.set('verification_status', status);

      const gender = searchParams.get('legal_gender');
      if (gender) params.set('legal_gender', gender);

      const res = await api.get(`/users/?${params.toString()}`);
      const results = res.data.results || [];
      setUsers(results);
      setTotalCount(res.data.count ?? results.length);
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
    setGuardianSearchTerm('');
    setInterestSearchTerm('');
    setShowGuardianDropdown(false);
    setShowInterestDropdown(false);
    setShowModal(true);
  };

  const handleOpenEdit = (youth: any) => {
    setIsEditing(true);
    setEditUserId(youth.id);
    setFormData({
      email: youth.email,
      password: '',
      first_name: youth.first_name || '',
      last_name: youth.last_name || '',
      nickname: youth.nickname || '',
      legal_gender: youth.legal_gender || 'MALE',
      preferred_gender: youth.preferred_gender || '',
      phone_number: youth.phone_number || '',
      date_of_birth: youth.date_of_birth || '',
      grade: youth.grade?.toString() || '',
      verification_status: youth.verification_status || 'UNVERIFIED',
      interests:
        youth.interests?.map((i: any) => (typeof i === 'object' ? i.id : i)) || [],
      guardians: youth.guardians || [],
    });
    setAvatarFile(null);
    setAvatarPreview(youth.avatar ? getMediaUrl(youth.avatar) : null);
    setGuardianSearchTerm('');
    setInterestSearchTerm('');
    setShowGuardianDropdown(false);
    setShowInterestDropdown(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'password' && !value) return;
        if (key === 'interests' || key === 'guardians') return;
        data.append(key, value?.toString() || '');
      });

      formData.interests.forEach((id) => data.append('interests', id.toString()));
      formData.guardians.forEach((id) => data.append('guardians', id.toString()));
      data.append('role', 'YOUTH_MEMBER');
      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEditing && editUserId) {
        await api.patch(`/users/${editUserId}/`, data, config);
        setToast({ message: 'Youth updated successfully!', type: 'success', isVisible: true });
      } else {
        await api.post('/users/', data, config);
        setToast({ message: 'Youth created successfully!', type: 'success', isVisible: true });
      }

      setShowModal(false);
      fetchYouth();
      fetchStats();
    } catch (err) {
      setToast({ message: 'Operation failed. Please try again.', type: 'error', isVisible: true });
      console.error(err);
    }
  };

  const handleDeleteClick = (youth: any) => {
    setUserToDelete({ id: youth.id, name: `${youth.first_name} ${youth.last_name}` });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/users/${userToDelete.id}/`);
      setToast({ message: 'Youth deleted successfully!', type: 'success', isVisible: true });
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchYouth();
      fetchStats();
    } catch (err) {
      setToast({ message: 'Failed to delete youth.', type: 'error', isVisible: true });
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

  const toggleInterest = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((i) => i !== id)
        : [...prev.interests, id],
    }));
    setInterestSearchTerm('');
    setShowInterestDropdown(false);
  };

  const removeInterest = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.filter((i) => i !== id),
    }));
  };

  const toggleGuardian = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      guardians: prev.guardians.includes(id)
        ? prev.guardians.filter((i) => i !== id)
        : [...prev.guardians, id],
    }));
    setGuardianSearchTerm('');
    setShowGuardianDropdown(false);
  };

  const removeGuardian = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      guardians: prev.guardians.filter((i) => i !== id),
    }));
  };

  const filteredInterests = interests.filter(
    (interest) =>
      interest.name.toLowerCase().includes(interestSearchTerm.toLowerCase()) &&
      !formData.interests.includes(interest.id)
  );

  const filteredGuardians = guardiansList.filter((guardian) => {
    const target = `${guardian.first_name} ${guardian.last_name} ${guardian.email}`.toLowerCase();
    return (
      target.includes(guardianSearchTerm.toLowerCase()) &&
      !formData.guardians.includes(guardian.id)
    );
  });

  const getSelectedInterests = () =>
    formData.interests.map((id) => interests.find((interest) => interest.id === id)).filter(Boolean) as Option[];

  const getSelectedGuardians = () =>
    formData.guardians.map((id) => guardiansList.find((guardian) => guardian.id === id)).filter(Boolean) as GuardianOption[];

  const getInitials = (first = '', last = '') => {
    const a = first.charAt(0)?.toUpperCase() || '';
    const b = last.charAt(0)?.toUpperCase() || '';
    return a + b || '?';
  };

  const getAvatarColor = () => 'bg-green-100 text-green-700';
  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / 10) : 1;
  const verifiedCount = stats?.verification?.VERIFIED ?? stats?.verification?.verified ?? stats?.verified ?? 0;
  const active7Days = stats?.activity?.active_7_days ?? 0;
  const gradesTracked = Object.keys(stats?.grades || {}).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-sm text-green-500 uppercase font-semibold">Club Admin</p>
          <h1 className="text-2xl font-bold text-gray-900">Manage Youth Members</h1>
        </div>
        <button onClick={handleOpenCreate} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow">
          + Add Youth
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19V9m0 0l-3 3m3-3l3 3m5 7V5a2 2 0 00-2-2h-3.5a2 2 0 00-1.6.8l-1.8 2.4H6a2 2 0 00-2 2v11a2 2 0 002 2h12a2 2 0 002-2z" />
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
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md p-4 text-white">
              <h3 className="text-xs font-semibold uppercase text-white/80">Total Youth</h3>
              <p className="text-3xl font-bold mt-1">{stats.total_youth ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 border border-green-50">
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Active (7 days)</h3>
              <p className="text-2xl font-bold text-gray-800">{active7Days}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 border border-green-50">
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Verified</h3>
              <p className="text-xl font-bold text-green-600">{verifiedCount}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 border border-green-50">
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Grades Tracked</h3>
              <p className="text-xl font-bold text-green-600">{gradesTracked}</p>
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
              placeholder="Search name or email..."
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('search') || ''}
              onChange={(e) => updateUrl('search', e.target.value)}
            />
          </div>

          <div className="w-20">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Age From</label>
            <input
              type="number"
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('age_from') || ''}
              onChange={(e) => updateUrl('age_from', e.target.value)}
            />
          </div>

          <div className="w-20">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Age To</label>
            <input
              type="number"
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('age_to') || ''}
              onChange={(e) => updateUrl('age_to', e.target.value)}
            />
          </div>

          <div className="w-24">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Grade From</label>
            <input
              type="number"
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('grade_from') || ''}
              onChange={(e) => updateUrl('grade_from', e.target.value)}
            />
          </div>

          <div className="w-24">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Grade To</label>
            <input
              type="number"
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('grade_to') || ''}
              onChange={(e) => updateUrl('grade_to', e.target.value)}
            />
          </div>

          <div className="w-44">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
            <select
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('verification_status') || ''}
              onChange={(e) => updateUrl('verification_status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="UNVERIFIED">Unverified</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
            </select>
          </div>

          <div className="w-32">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
            <select
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('legal_gender') || ''}
              onChange={(e) => updateUrl('legal_gender', e.target.value)}
            >
              <option value="">Any</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <button onClick={() => router.push(pathname)} className="px-4 py-2 text-sm text-gray-600 hover:text-red-500">
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading youth...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No youth members found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verification</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade / DOB</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((youth) => (
                <tr key={youth.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {youth.avatar && !avatarErrors.has(youth.id) ? (
                        <img
                          src={getMediaUrl(youth.avatar) || ''}
                          alt="Avatar"
                          className="w-10 h-10 rounded-full object-cover mr-3"
                          onError={() =>
                            setAvatarErrors((prev) => {
                              const next = new Set(prev);
                              next.add(youth.id);
                              return next;
                            })
                          }
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-full ${getAvatarColor()} flex items-center justify-center font-semibold text-sm mr-3`}>
                          {getInitials(youth.first_name, youth.last_name)}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {youth.first_name} {youth.last_name}
                        </div>
                        <div className="text-xs text-gray-500">{youth.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getVerificationBadge(youth.verification_status)}`}>
                      {youth.verification_status || 'UNVERIFIED'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    Grade: <span className="font-semibold">{youth.grade || '-'}</span>
                    <br />
                    <span className="text-xs">{youth.date_of_birth || '-'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-4">
                    <Link href={`/admin/club/youth/${youth.id}`} className="text-green-600 font-bold">
                      View
                    </Link>
                    <button onClick={() => handleOpenEdit(youth)} className="text-indigo-600 font-bold">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteClick(youth)} className="text-red-600">
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
        <div className="text-sm text-gray-600">Total youth: {totalCount}</div>
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

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Youth' : 'Create Youth'}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input required type="text" placeholder="First Name" className="border p-2 rounded" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                        <input required type="text" placeholder="Last Name" className="border p-2 rounded" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                        <input type="text" placeholder="Nickname" className="border p-2 rounded" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} />
                        <input required type="email" placeholder="Email" className="border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        <input type="password" placeholder="Password" className="border p-2 rounded" required={!isEditing} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                        <input type="text" placeholder="Phone" className="border p-2 rounded" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Date of Birth</label>
                            <input type="date" className="w-full border p-2 rounded" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Grade</label>
                            <input type="number" placeholder="e.g. 7" className="w-full border p-2 rounded" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
                        </div>
                        <select className="border p-2 rounded" value={formData.legal_gender} onChange={e => setFormData({...formData, legal_gender: e.target.value})}>
                            <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
                        </select>
                        <input type="text" placeholder="Preferred Gender" className="border p-2 rounded" value={formData.preferred_gender} onChange={e => setFormData({...formData, preferred_gender: e.target.value})} />
                    </div>

                    {/* STATUS */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                        <label className="block text-sm font-bold text-green-800 mb-2">Verification</label>
                        <div className="flex gap-4">
                            {['UNVERIFIED', 'PENDING', 'VERIFIED'].map(status => (
                                <label key={status} className="flex items-center space-x-2">
                                    <input type="radio" name="verification_status" value={status} checked={formData.verification_status === status} onChange={e => setFormData({...formData, verification_status: e.target.value})} />
                                    <span className="text-sm font-medium">{status}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* GUARDIANS & INTERESTS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold mb-2">Assign Guardians</label>
                        {formData.guardians.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            {getSelectedGuardians().map((guardian) => (
                              <span key={guardian.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-full font-medium">
                                {guardian.first_name} {guardian.last_name}
                                <button type="button" onClick={() => removeGuardian(guardian.id)} className="hover:bg-blue-700 rounded-full p-0.5 transition-colors">
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
                            placeholder="Search guardians..."
                            value={guardianSearchTerm}
                            onChange={(e) => {
                              setGuardianSearchTerm(e.target.value);
                              setShowGuardianDropdown(true);
                            }}
                            onFocus={() => setShowGuardianDropdown(true)}
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          {showGuardianDropdown && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowGuardianDropdown(false)}></div>
                              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredGuardians.length > 0 ? (
                                  filteredGuardians.map((guardian) => (
                                    <button
                                      key={guardian.id}
                                      type="button"
                                      onClick={() => toggleGuardian(guardian.id)}
                                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                                    >
                                      <div className="font-medium text-gray-900">{guardian.first_name} {guardian.last_name}</div>
                                      <div className="text-xs text-gray-500">{guardian.email}</div>
                                    </button>
                                  ))
                                ) : guardianSearchTerm ? (
                                  <div className="px-4 py-3 text-sm text-gray-500 text-center">No guardians found</div>
                                ) : (
                                  <div className="px-4 py-3 text-sm text-gray-500 text-center">All guardians already selected</div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold mb-2">Interests</label>
                        {formData.interests.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                            {getSelectedInterests().map((interest) => (
                              <span key={interest.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-full font-medium">
                                {interest.name}
                                <button type="button" onClick={() => removeInterest(interest.id)} className="hover:bg-purple-700 rounded-full p-0.5 transition-colors">
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
                            placeholder="Search interests..."
                            value={interestSearchTerm}
                            onChange={(e) => {
                              setInterestSearchTerm(e.target.value);
                              setShowInterestDropdown(true);
                            }}
                            onFocus={() => setShowInterestDropdown(true)}
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                          {showInterestDropdown && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowInterestDropdown(false)}></div>
                              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredInterests.length > 0 ? (
                                  filteredInterests.map((interest) => (
                                    <button
                                      key={interest.id}
                                      type="button"
                                      onClick={() => toggleInterest(interest.id)}
                                      className="w-full text-left px-4 py-2.5 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0"
                                    >
                                      <div className="font-medium text-gray-900">{interest.name}</div>
                                    </button>
                                  ))
                                ) : interestSearchTerm ? (
                                  <div className="px-4 py-3 text-sm text-gray-500 text-center">No interests found</div>
                                ) : (
                                  <div className="px-4 py-3 text-sm text-gray-500 text-center">All interests already selected</div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div><label className="block text-sm font-bold mb-2">Avatar</label><input type="file" className="w-full border p-2 rounded" onChange={handleAvatarChange} /></div>

                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <button type="button" onClick={()=>setShowModal(false)} className="text-gray-500">Cancel</button>
                        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded">{isEditing ? 'Save' : 'Create'}</button>
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

export default function ManageClubYouthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ManageClubYouthPageContent />
    </Suspense>
  );
}