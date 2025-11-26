'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';

interface YouthOption { id: number; first_name: string; last_name: string; email: string; grade: number; }

function ManageGuardiansPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- STATE ---
  const [users, setUsers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [avatarErrors, setAvatarErrors] = useState<Set<number>>(new Set());
  
  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  // Dropdowns
  const [youthList, setYouthList] = useState<YouthOption[]>([]);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Youth search
  const [youthSearchTerm, setYouthSearchTerm] = useState('');
  const [showYouthDropdown, setShowYouthDropdown] = useState(false);
  
  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const initialFormState = {
    email: '', password: '', first_name: '', last_name: '', 
    phone_number: '', legal_gender: 'MALE',
    verification_status: 'UNVERIFIED',
    youth_members: [] as number[], // Array of Youth IDs
  };

  const [formData, setFormData] = useState(initialFormState);

  // --- LOAD DATA ---
  useEffect(() => {
    fetchDropdowns();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchGuardians();
  }, [searchParams]);

  // Handle edit parameter from URL (e.g., from view page)
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !isEditing && !showModal) {
      const userId = parseInt(editId);
      // Try to find user in current list first
      const userToEdit = users.find(u => u.id === userId);
      if (userToEdit) {
        handleOpenEdit(userToEdit);
      } else if (users.length > 0) {
        // User not in current page, fetch it directly
        api.get(`/users/${userId}/`).then(res => {
          handleOpenEdit(res.data);
        }).catch(err => {
          console.error('Failed to load user for editing:', err);
        });
      }
    }
  }, [searchParams, users.length, isEditing, showModal]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/users/guardian_stats/');
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchDropdowns = async () => {
    try {
      const youthRes = await api.get('/users/list_youth/');
      setYouthList(youthRes.data);
    } catch (err) { console.error(err); }
  };

  const fetchGuardians = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      // Always force role to GUARDIAN - this page only shows guardians
      params.set('role', 'GUARDIAN');
      
      // Add filters from URL
      const search = searchParams.get('search');
      if (search) params.set('search', search);
      
      const gender = searchParams.get('legal_gender');
      if (gender) params.set('legal_gender', gender);
      
      const status = searchParams.get('verification_status');
      if (status) params.set('verification_status', status);
      
      const page = searchParams.get('page');
      if (page) params.set('page', page);
      
      const res = await api.get(`/users/?${params.toString()}`);
      
      // Handle paginated response
      if (res.data.results) {
        const guardiansOnly = res.data.results.filter((user: any) => user.role === 'GUARDIAN');
        setUsers(guardiansOnly);
        setTotalCount(res.data.count || guardiansOnly.length);
      } else {
        // Non-paginated response
        const guardiansOnly = (Array.isArray(res.data) ? res.data : []).filter((user: any) => user.role === 'GUARDIAN');
        setUsers(guardiansOnly);
        setTotalCount(guardiansOnly.length);
      }
    } catch (err) { 
      console.error('Error fetching guardians:', err); 
    } 
    finally { setIsLoading(false); }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  // --- HANDLERS ---
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

  const handleOpenEdit = (user: any) => {
    setIsEditing(true);
    setEditUserId(user.id);
    
    // The serializer now returns 'youth_members' as a list of IDs
    const youthIds = user.youth_members || [];
    
    setFormData({
      email: user.email, password: '', 
      first_name: user.first_name || '', last_name: user.last_name || '',
      phone_number: user.phone_number || '',
      legal_gender: user.legal_gender || 'MALE',
      verification_status: user.verification_status || 'UNVERIFIED',
      youth_members: youthIds
    });
    setAvatarFile(null);
    setAvatarPreview(user.avatar ? getMediaUrl(user.avatar) : null);
    setYouthSearchTerm('');
    setShowYouthDropdown(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = new FormData();
      
      // Basic fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'password' && !value) return;
        if (key === 'youth_members') return;
        data.append(key, value.toString());
      });
      
      // Handle Youth Array
      formData.youth_members.forEach(id => data.append('youth_members', id.toString()));
      
      data.append('role', 'GUARDIAN');
      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEditing && editUserId) {
        await api.patch(`/users/${editUserId}/`, data, config);
        setToast({
          message: 'Guardian updated successfully!',
          type: 'success',
          isVisible: true,
        });
      } else {
        await api.post('/users/', data, config);
        setToast({
          message: 'Guardian created successfully!',
          type: 'success',
          isVisible: true,
        });
      }

      setShowModal(false);
      fetchGuardians();
      fetchStats();
    } catch (err) { 
      setToast({
        message: 'Operation failed. Please try again.',
        type: 'error',
        isVisible: true,
      });
      console.error(err); 
    }
  };

  const handleDeleteClick = (user: any) => {
    setUserToDelete({ id: user.id, name: `${user.first_name} ${user.last_name}` });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try { 
      await api.delete(`/users/${userToDelete.id}/`);
      setToast({
        message: 'Guardian deleted successfully!',
        type: 'success',
        isVisible: true,
      });
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchGuardians(); 
      fetchStats(); 
    } 
    catch (err) { 
      setToast({
        message: 'Failed to delete guardian.',
        type: 'error',
        isVisible: true,
      });
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
    setFormData(prev => {
      const exists = prev.youth_members.includes(id);
      if (exists) return { ...prev, youth_members: prev.youth_members.filter(i => i !== id) };
      return { ...prev, youth_members: [...prev.youth_members, id] };
    });
    setYouthSearchTerm('');
    setShowYouthDropdown(false);
  };

  const removeYouth = (id: number) => {
    setFormData(prev => ({
      ...prev,
      youth_members: prev.youth_members.filter(i => i !== id)
    }));
  };

  // Filter youth based on search term
  const filteredYouth = youthList.filter(y => {
    const searchLower = youthSearchTerm.toLowerCase();
    const fullName = `${y.first_name} ${y.last_name}`.toLowerCase();
    const email = y.email.toLowerCase();
    return (fullName.includes(searchLower) || email.includes(searchLower)) && 
           !formData.youth_members.includes(y.id);
  });

  // Get selected youth details
  const getSelectedYouth = () => {
    return formData.youth_members.map(id => youthList.find(y => y.id === id)).filter(Boolean) as YouthOption[];
  };

  // Helper function to get initials from name
  const getInitials = (firstName: string = '', lastName: string = '') => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || '?';
  };

  // Helper function to get avatar color (consistent for all guardians)
  const getAvatarColor = () => {
    return 'bg-blue-200 text-blue-800';
  };

  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = Math.ceil(totalCount / 10);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manage Guardians</h1>
        <button onClick={handleOpenCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow">
          + Create New Guardian
        </button>
      </div>

      {/* --- ANALYTICS HUD --- */}
      {stats && (
        <div className="mb-6">
          {/* Toggle Button */}
          <button
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="flex items-center justify-between w-full bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:bg-gray-50 transition-colors mb-3"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700">Analytics Dashboard</span>
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

          {/* Analytics Cards - Collapsible */}
          <div 
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-500 ease-in-out ${
              analyticsExpanded 
                ? 'max-h-[600px] opacity-100 translate-y-0' 
                : 'max-h-0 opacity-0 -translate-y-4 pointer-events-none'
            } overflow-hidden`}
          >
            {/* Card 1: Total Guardians */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-4 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 rounded-lg p-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">Total Guardians</h3>
              <p className="text-3xl font-bold mb-0.5">{stats.total_guardians}</p>
              <p className="text-blue-100 text-xs">Active guardians</p>
            </div>

            {/* Card 2: Verified */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md p-4 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 rounded-lg p-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-green-100 text-xs font-semibold uppercase tracking-wider mb-1">Verified</h3>
              <p className="text-3xl font-bold mb-0.5">{stats.verification.verified}</p>
              <p className="text-green-100 text-xs">Identity verified</p>
            </div>

            {/* Card 3: Pending */}
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-md p-4 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 rounded-lg p-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-yellow-100 text-xs font-semibold uppercase tracking-wider mb-1">Pending</h3>
              <p className="text-3xl font-bold mb-0.5">{stats.verification.pending}</p>
              <p className="text-yellow-100 text-xs">Awaiting verification</p>
            </div>

            {/* Card 4: Active (7 Days) */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md p-4 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 rounded-lg p-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <h3 className="text-purple-100 text-xs font-semibold uppercase tracking-wider mb-1">Active (7 Days)</h3>
              <p className="text-3xl font-bold mb-0.5">{stats.activity.active_7_days}</p>
              <p className="text-purple-100 text-xs">Recently active</p>
            </div>
          </div>
        </div>
      )}

      {/* --- FILTER BAR --- */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search Field */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
            <input
              type="text"
              placeholder="First name, last name, or email..."
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('search') || ''}
              onChange={(e) => updateUrl('search', e.target.value)}
            />
          </div>

          {/* Gender */}
          <div className="w-40">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
            <select
              className="w-full border rounded p-2 text-sm bg-gray-50"
              value={searchParams.get('legal_gender') || ''}
              onChange={(e) => updateUrl('legal_gender', e.target.value)}
            >
              <option value="">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Status */}
          <div className="w-40">
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

          {/* Clear Filters Button */}
          <button
            onClick={() => router.push(pathname)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-300 rounded transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* --- LIST --- */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guardian</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Connected Youth</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {user.avatar && !avatarErrors.has(user.id) ? (
                      <img 
                        src={getMediaUrl(user.avatar) || ''}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover mr-3"
                        onError={() => {
                          setAvatarErrors(prev => new Set(prev).add(user.id));
                        }}
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full ${getAvatarColor()} flex items-center justify-center font-semibold text-sm mr-3`}>
                        {getInitials(user.first_name, user.last_name)}
                      </div>
                    )}
                    <div>
                        <div className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                       user.verification_status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                       user.verification_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                       'bg-gray-100 text-gray-600'
                   }`}>
                       {user.verification_status || 'UNVERIFIED'}
                   </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="font-bold">{user.youth_members ? user.youth_members.length : 0}</span> linked
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                  <Link href={`/admin/super/guardians/${user.id}`} className="text-blue-600 hover:text-blue-900 font-bold">View</Link>
                  <button onClick={() => handleOpenEdit(user)} className="text-indigo-600 hover:text-indigo-900 font-bold">Edit</button>
                  <button onClick={() => handleDeleteClick(user)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- PAGINATION CONTROLS --- */}
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

      {/* --- MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Guardian' : 'Create Guardian'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required type="text" placeholder="First Name" className="border p-2 rounded" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                <input required type="text" placeholder="Last Name" className="border p-2 rounded" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                
                <input required type="email" placeholder="Email" className="border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <input type="password" placeholder={isEditing ? "New Password" : "Password"} className="border p-2 rounded" required={!isEditing} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                
                <input type="text" placeholder="Phone" className="border p-2 rounded" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
                
                <select className="border p-2 rounded" value={formData.legal_gender} onChange={e => setFormData({...formData, legal_gender: e.target.value})}>
                    <option value="MALE">Male</option> <option value="FEMALE">Female</option> <option value="OTHER">Other</option>
                </select>
              </div>

              {/* VERIFICATION */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <label className="block text-sm font-bold text-blue-800 mb-2">Verification Status</label>
                  <div className="flex gap-4">
                      {['UNVERIFIED', 'PENDING', 'VERIFIED'].map(status => (
                          <label key={status} className="flex items-center space-x-2 cursor-pointer">
                              <input 
                                  type="radio" 
                                  name="verification_status"
                                  value={status}
                                  checked={formData.verification_status === status}
                                  onChange={e => setFormData({...formData, verification_status: e.target.value})}
                                  className="text-blue-600"
                              />
                              <span className="text-sm font-medium">{status}</span>
                          </label>
                      ))}
                  </div>
              </div>

              {/* YOUTH ASSIGNMENT */}
              <div>
                  <label className="block text-sm font-bold mb-2">Assign Youth Members</label>
                  
                  {/* Selected Youth Display */}
                  {formData.youth_members.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      {getSelectedYouth().map(y => (
                        <span 
                          key={y.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-full font-medium"
                        >
                          {y.first_name} {y.last_name} {y.grade && `(Gr ${y.grade})`}
                          <button
                            type="button"
                            onClick={() => removeYouth(y.id)}
                            className="hover:bg-green-700 rounded-full p-0.5 transition-colors"
                            aria-label={`Remove ${y.first_name} ${y.last_name}`}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Searchable Dropdown */}
                  <div className="relative mb-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search youth members by name or email..."
                        value={youthSearchTerm}
                        onChange={(e) => {
                          setYouthSearchTerm(e.target.value);
                          setShowYouthDropdown(true);
                        }}
                        onFocus={() => setShowYouthDropdown(true)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <svg 
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    {/* Dropdown List */}
                    {showYouthDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setShowYouthDropdown(false)}
                        ></div>
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredYouth.length > 0 ? (
                            filteredYouth.map(y => (
                              <button
                                key={y.id}
                                type="button"
                                onClick={() => toggleYouth(y.id)}
                                className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition-colors border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-gray-900">{y.first_name} {y.last_name}</div>
                                <div className="text-xs text-gray-500">{y.email} {y.grade && `• Grade ${y.grade}`}</div>
                              </button>
                            ))
                          ) : youthSearchTerm ? (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              No youth members found matching "{youthSearchTerm}"
                            </div>
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              {formData.youth_members.length === 0 
                                ? 'No youth members found. Create a youth member first.'
                                : 'All youth members are already selected.'}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
              </div>

               {/* AVATAR */}
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
                <input type="file" accept="image/*" className="w-full border p-2 rounded" onChange={handleAvatarChange} />
                {avatarPreview && <img src={avatarPreview} alt="Preview" className="w-16 h-16 mt-2 rounded-full object-cover border" />}
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-500">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">
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

export default function ManageGuardiansPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ManageGuardiansPageContent />
    </Suspense>
  );
}