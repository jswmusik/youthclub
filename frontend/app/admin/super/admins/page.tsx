'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import api from '../../../../lib/api';
import { getMediaUrl } from '../../../utils';
import Toast from '../../../components/Toast';
import { useAuth } from '../../../../context/AuthContext';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';

interface Option { id: number; name: string; }

// Define the shape of our stats data
interface AdminStats {
  total_admins: number;
  roles: { super: number; municipality: number; club: number };
  gender: { male: number; female: number; other: number };
  activity: { active_7_days: number; new_30_days: number };
}

function ManageAdminsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();

  // --- STATE ---
  const [users, setUsers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0); 
  const [isLoading, setIsLoading] = useState(true);
  
  // Stats State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [avatarErrors, setAvatarErrors] = useState<Set<number>>(new Set());
  
  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [municipalities, setMunicipalities] = useState<Option[]>([]);
  const [clubs, setClubs] = useState<Option[]>([]);
  
  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const initialFormState = {
    email: '', password: '', first_name: '', last_name: '', nickname: '',
    legal_gender: 'MALE', phone_number: '', profession: '',
    assigned_municipality: '', assigned_club: '', hide_contact_info: false
  };

  const [formData, setFormData] = useState(initialFormState);
  const [adminType, setAdminType] = useState('MUNICIPALITY_ADMIN');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // --- INITIAL DATA LOAD ---
  useEffect(() => {
    fetchDropdowns();
    fetchStats(); // Fetch analytics on load
  }, []);

  // --- FETCH LIST WHEN URL CHANGES ---
  useEffect(() => {
    fetchAdmins();
  }, [searchParams]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/users/stats/');
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  };

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const adminRoles = ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN'];
      const roleFilter = searchParams.get('role');
      
      // If a specific admin role is selected, fetch only that role
      if (roleFilter && adminRoles.includes(roleFilter)) {
        const params = new URLSearchParams();
        params.set('role', roleFilter);
        
        // Copy other allowed filters
        const municipality = searchParams.get('assigned_municipality');
        if (municipality) params.set('assigned_municipality', municipality);
        
        const club = searchParams.get('assigned_club');
        if (club) params.set('assigned_club', club);
        
        const gender = searchParams.get('legal_gender');
        if (gender) params.set('legal_gender', gender);
        
        const search = searchParams.get('search');
        if (search) params.set('search', search);
        
        const page = searchParams.get('page');
        if (page) params.set('page', page);
        
        const res = await api.get(`/users/?${params.toString()}`);
        setUsers(res.data.results || []);
        setTotalCount(res.data.count);
      } else {
        // When showing all admins (no role filter), fetch all admin roles and combine
        // We need to fetch each role separately and combine results
        const municipality = searchParams.get('assigned_municipality');
        const club = searchParams.get('assigned_club');
        const gender = searchParams.get('legal_gender');
        const search = searchParams.get('search');
        const page = Number(searchParams.get('page')) || 1;
        const pageSize = 10;
        
        // Fetch all admin roles in parallel
        const promises = adminRoles.map(role => {
          const params = new URLSearchParams();
          params.set('role', role);
          if (municipality) params.set('assigned_municipality', municipality);
          if (club) params.set('assigned_club', club);
          if (gender) params.set('legal_gender', gender);
          if (search) params.set('search', search);
          // Fetch all pages for each role (we'll paginate on frontend)
          params.set('page_size', '1000'); // Large number to get all
          return api.get(`/users/?${params.toString()}`);
        });
        
        const results = await Promise.all(promises);
        
        // Combine all admin users
        let allAdmins: any[] = [];
        results.forEach(res => {
          if (res.data.results) {
            allAdmins = allAdmins.concat(res.data.results);
          }
        });
        
        // Apply frontend pagination
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedAdmins = allAdmins.slice(startIndex, endIndex);
        
        setUsers(paginatedAdmins);
        setTotalCount(allAdmins.length);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const muniRes = await api.get('/municipalities/');
      setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : (muniRes.data?.results || []));
      const clubRes = await api.get('/clubs/');
      setClubs(Array.isArray(clubRes.data) ? clubRes.data : (clubRes.data?.results || []));
    } catch (err) {
      console.error(err);
    }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // If updating role, ensure it's a valid admin role
    if (key === 'role') {
      const adminRoles = ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN'];
      if (value && adminRoles.includes(value)) {
        params.set(key, value);
      } else {
        params.delete(key); // Remove invalid role filter
      }
    } else {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    
    if (key !== 'page') params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  // --- ACTIONS ---

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditUserId(null);
    setFormData(initialFormState);
    setAdminType('MUNICIPALITY_ADMIN');
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
      assigned_municipality: user.assigned_municipality || '', assigned_club: user.assigned_club || '',
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
        isVisible: true,
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
      setToast({
        message: 'Admin deleted successfully!',
        type: 'success',
        isVisible: true,
      });
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchAdmins();
      fetchStats(); // Update stats after delete
    } catch (err) { 
      setToast({
        message: 'Failed to delete admin.',
        type: 'error',
        isVisible: true,
      });
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
      if (avatarFile) data.append('avatar', avatarFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEditing && editUserId) {
        await api.patch(`/users/${editUserId}/`, data, config);
        setToast({
          message: 'Admin updated successfully!',
          type: 'success',
          isVisible: true,
        });
      } else {
        await api.post('/users/', data, config);
        setToast({
          message: 'Admin created successfully!',
          type: 'success',
          isVisible: true,
        });
      }

      setShowModal(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      fetchAdmins();
      fetchStats(); // Update stats after create/edit
    } catch (err) { 
      setToast({
        message: 'Operation failed. Please try again.',
        type: 'error',
        isVisible: true,
      });
      console.error(err);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (jpg, png, svg, or gif)');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Helper function to get initials from name
  const getInitials = (firstName: string = '', lastName: string = '') => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || '?';
  };

  // Helper function to get avatar color (consistent for all roles)
  const getAvatarColor = () => {
    return 'bg-blue-200 text-blue-800';
  };

  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = Math.ceil(totalCount / 10);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manage Administrators</h1>
        <button onClick={handleOpenCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow">
          + Create New Admin
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
              {/* Card 1: Total */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-4 text-white transform hover:scale-105 transition-all duration-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="bg-white/20 rounded-lg p-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">Total Admins</h3>
                <p className="text-3xl font-bold mb-0.5">{stats.total_admins}</p>
                <p className="text-blue-100 text-xs">Active administrators</p>
              </div>

              {/* Card 2: Roles */}
              <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-600 text-xs font-bold uppercase tracking-wider">Role Distribution</h3>
                  <div className="bg-purple-100 rounded-lg p-1.5">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-1.5 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      <span className="text-xs text-gray-700 font-medium">Super</span>
                    </div>
                    <span className="text-base font-bold text-red-600">{stats.roles.super}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span className="text-xs text-gray-700 font-medium">Municipality</span>
                    </div>
                    <span className="text-base font-bold text-purple-600">{stats.roles.municipality}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-700 font-medium">Club</span>
                    </div>
                    <span className="text-base font-bold text-green-600">{stats.roles.club}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Gender */}
              <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-600 text-xs font-bold uppercase tracking-wider">Gender Split</h3>
                  <div className="bg-pink-100 rounded-lg p-1.5">
                    <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-1.5 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-gray-700 font-medium">Male</span>
                    </div>
                    <span className="text-base font-bold text-blue-600">{stats.gender.male}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-pink-50 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                      <span className="text-xs text-gray-700 font-medium">Female</span>
                    </div>
                    <span className="text-base font-bold text-pink-600">{stats.gender.female}</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      <span className="text-xs text-gray-700 font-medium">Other</span>
                    </div>
                    <span className="text-base font-bold text-gray-600">{stats.gender.other}</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Activity */}
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md p-4 text-white transform hover:scale-105 transition-all duration-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="bg-white/20 rounded-lg p-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-orange-100 text-xs font-semibold uppercase tracking-wider mb-3">Engagement</h3>
                <div className="space-y-2">
                  <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-orange-100 text-xs font-medium">Active (7d)</span>
                      <span className="text-xl font-bold">{stats.activity.active_7_days}</span>
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-1 mt-1.5">
                      <div 
                        className="bg-white rounded-full h-1 transition-all duration-500"
                        style={{ width: `${Math.min((stats.activity.active_7_days / stats.total_admins) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-orange-100 text-xs font-medium">New (30d)</span>
                      <span className="text-xl font-bold">{stats.activity.new_30_days}</span>
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-1 mt-1.5">
                      <div 
                        className="bg-white rounded-full h-1 transition-all duration-500"
                        style={{ width: `${Math.min((stats.activity.new_30_days / stats.total_admins) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      )}

      {/* --- FILTER BAR --- */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name or email..."
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
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
            <select className="w-full border rounded p-2 text-sm bg-gray-50" value={searchParams.get('role') || ''} onChange={(e) => updateUrl('role', e.target.value)}>
              <option value="">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="MUNICIPALITY_ADMIN">Municipality Admin</option>
              <option value="CLUB_ADMIN">Club Admin</option>
            </select>
          </div>

          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Municipality</label>
            <select className="w-full border rounded p-2 text-sm bg-gray-50" value={searchParams.get('assigned_municipality') || ''} onChange={(e) => updateUrl('assigned_municipality', e.target.value)}>
              <option value="">All Municipalities</option>
              {Array.isArray(municipalities) && municipalities.map(m => <option key={m.id} value={m.id.toString()}>{m.name}</option>)}
            </select>
          </div>

          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Club</label>
            <select className="w-full border rounded p-2 text-sm bg-gray-50" value={searchParams.get('assigned_club') || ''} onChange={(e) => updateUrl('assigned_club', e.target.value)}>
              <option value="">All Clubs</option>
              {Array.isArray(clubs) && clubs.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
            </select>
          </div>

          <div className="w-32">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
            <select className="w-full border rounded p-2 text-sm bg-gray-50" value={searchParams.get('legal_gender') || ''} onChange={(e) => updateUrl('legal_gender', e.target.value)}>
              <option value="">Any</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
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
          <div className="p-8 text-center text-gray-500">Loading admins...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No results found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Context</th>
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
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-800' : 
                        user.role === 'MUNICIPALITY_ADMIN' ? 'bg-purple-100 text-purple-800' : 
                        'bg-green-100 text-green-800'}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.role === 'MUNICIPALITY_ADMIN' && (
                       Array.isArray(municipalities) ? municipalities.find(m => m.id === user.assigned_municipality)?.name || 'Unassigned' : 'Unassigned'
                    )}
                    {user.role === 'CLUB_ADMIN' && (
                       Array.isArray(clubs) ? clubs.find(c => c.id === user.assigned_club)?.name || 'Unassigned' : 'Unassigned'
                    )}
                    {user.role === 'SUPER_ADMIN' && 'Global'}
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

      {/* --- PAGINATION CONTROLS (KEPT EXISTING) --- */}
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
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditing ? 'Edit Admin' : 'Create Admin'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* ADMIN TYPE */}
              <div className="grid grid-cols-3 gap-4">
                {['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN'].map((role) => (
                  <button key={role} type="button" 
                    onClick={() => !isEditing && setAdminType(role)}
                    className={`py-3 px-2 rounded-lg text-sm font-bold border-2 transition
                      ${adminType === role ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}
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
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/svg+xml,image/gif" className="w-full border p-2 rounded" onChange={handleAvatarChange} />
                <p className="text-xs text-gray-500 mt-1">Accepted formats: JPG, PNG, SVG, GIF</p>
                {avatarPreview && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Preview:</p>
                    <img src={avatarPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border border-gray-300" />
                  </div>
                )}
              </div>

              {/* ASSIGNMENT */}
              {(adminType === 'MUNICIPALITY_ADMIN' || adminType === 'CLUB_ADMIN') && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  {adminType === 'MUNICIPALITY_ADMIN' && (
                    <select className="w-full border p-2 rounded" value={formData.assigned_municipality} onChange={e => setFormData({...formData, assigned_municipality: e.target.value})} required>
                      <option value="">Select Municipality...</option>
                      {Array.isArray(municipalities) && municipalities.map(m => <option key={m.id} value={m.id.toString()}>{m.name}</option>)}
                    </select>
                  )}
                  {adminType === 'CLUB_ADMIN' && (
                    <select className="w-full border p-2 rounded" value={formData.assigned_club} onChange={e => setFormData({...formData, assigned_club: e.target.value})} required>
                      <option value="">Select Club...</option>
                      {Array.isArray(clubs) && clubs.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                    </select>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="hideContact" checked={formData.hide_contact_info} onChange={e => setFormData({...formData, hide_contact_info: e.target.checked})} />
                <label htmlFor="hideContact" className="text-sm text-gray-700">Hide Contact Info</label>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
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

export default function ManageAdminsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <ManageAdminsPageContent />
    </Suspense>
  );
}
