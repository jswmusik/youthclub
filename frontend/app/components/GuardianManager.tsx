'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';

interface GuardianManagerProps {
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function GuardianManager({ basePath, scope }: GuardianManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- STATE ---
  const [users, setUsers] = useState<any[]>([]);
  const [allUsersForAnalytics, setAllUsersForAnalytics] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [avatarErrors, setAvatarErrors] = useState<Set<number>>(new Set());
  
  // Dropdowns
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  
  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });
  
  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- LOAD DATA ---
  useEffect(() => {
    fetchDropdowns();
    fetchAllUsersForAnalytics();
  }, []);

  useEffect(() => {
    fetchGuardians();
  }, [searchParams]);

  const fetchDropdowns = async () => {
    try {
      if (scope === 'SUPER') {
        const muniRes = await api.get('/municipalities/');
        setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllUsersForAnalytics = async () => {
    try {
      // Fetch all guardians for analytics calculation
      // Fetch page by page until we have all results
      let allUsers: any[] = [];
      let page = 1;
      let totalCount = 0;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('role', 'GUARDIAN');
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/users/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) {
          console.warn(`No response data for page ${page}`);
          break;
        }
        
        let pageUsers: any[] = [];
        
        if (Array.isArray(responseData)) {
          // Direct array response
          pageUsers = responseData.filter((user: any) => user.role === 'GUARDIAN');
          allUsers = [...allUsers, ...pageUsers];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          // Paginated response
          pageUsers = responseData.results.filter((user: any) => user.role === 'GUARDIAN');
          allUsers = [...allUsers, ...pageUsers];
          
          // Get total count from first page
          if (page === 1) {
            totalCount = responseData.count || 0;
          }
          
          // Check if we should continue
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allUsers.length >= totalCount;
          const gotEmptyPage = pageUsers.length === 0;
          
          // Stop if: no next page, we have all results, or got empty page
          if (!hasNext || hasAllResults || gotEmptyPage) {
            break;
          }
          
          // Continue to next page
          page++;
        } else {
          console.warn(`Unexpected response format on page ${page}:`, responseData);
          break;
        }
      }
      
      setAllUsersForAnalytics(allUsers);
    } catch (err) {
      console.error('Error fetching users for analytics:', err);
      setAllUsersForAnalytics([]);
    }
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
      
      const municipality = searchParams.get('municipality');
      if (municipality) params.set('municipality', municipality);
      
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
    finally { 
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

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const status = searchParams.get('verification_status');
    const gender = searchParams.get('legal_gender');
    const municipality = searchParams.get('municipality');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (status) params.set('verification_status', status);
    if (gender) params.set('legal_gender', gender);
    if (municipality) params.set('municipality', municipality);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
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
      fetchAllUsersForAnalytics(); 
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

  // Calculate analytics from allUsersForAnalytics
  const analytics = {
    total_guardians: allUsersForAnalytics.length,
    new_last_7_days: allUsersForAnalytics.filter((u: any) => {
      if (!u.date_joined) return false;
      const joinDate = new Date(u.date_joined);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return joinDate >= sevenDaysAgo;
    }).length,
    gender: {
      male: allUsersForAnalytics.filter((u: any) => u.legal_gender === 'MALE').length,
      female: allUsersForAnalytics.filter((u: any) => u.legal_gender === 'FEMALE').length,
      other: allUsersForAnalytics.filter((u: any) => u.legal_gender === 'OTHER').length,
    },
    verification: {
      verified: allUsersForAnalytics.filter((u: any) => u.verification_status === 'VERIFIED').length,
      unverified_pending: allUsersForAnalytics.filter((u: any) => 
        u.verification_status === 'UNVERIFIED' || u.verification_status === 'PENDING'
      ).length,
    },
  };

  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = Math.ceil(totalCount / 10);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading guardians...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manage Guardians</h1>
        <Link 
          href={`${basePath}/create`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow"
        >
          + Create New Guardian
        </Link>
      </div>

      {/* Analytics Dashboard */}
      {!isLoading && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Toggle Button */}
          <button
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
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
            className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${
              analyticsExpanded 
                ? 'max-h-[500px] opacity-100' 
                : 'max-h-0 opacity-0'
            } overflow-hidden`}
          >
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Guardians */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Guardians</h3>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_guardians}</p>
              </div>

              {/* Card 2: New Last 7 Days */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">New (7 Days)</h3>
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.new_last_7_days}</p>
              </div>

              {/* Card 3: Gender Breakdown */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-purple-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Gender</h3>
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Male:</span>
                    <span className="font-bold text-gray-900">{analytics.gender.male}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Female:</span>
                    <span className="font-bold text-gray-900">{analytics.gender.female}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Other:</span>
                    <span className="font-bold text-gray-900">{analytics.gender.other}</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Verification Status */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-orange-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Verification</h3>
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Verified:</span>
                    <span className="font-bold text-green-600">{analytics.verification.verified}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Unverified/Pending:</span>
                    <span className="font-bold text-yellow-600">{analytics.verification.unverified_pending}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
        {/* Toggle Button */}
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">Filters</span>
          </div>
          <svg 
            className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Filter Fields - Collapsible */}
        <div 
          className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${
            filtersExpanded 
              ? 'max-h-[1000px] opacity-100' 
              : 'max-h-0 opacity-0'
          } overflow-hidden`}
        >
          <div className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
                <input 
                  type="text" 
                  placeholder="Search by name or email..." 
                  className="w-full border rounded p-2 text-sm bg-gray-50"
                  value={searchParams.get('search') || ''} 
                  onChange={e => updateUrl('search', e.target.value)}
                />
              </div>

              {/* Gender */}
              <div className="w-32">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={searchParams.get('legal_gender') || ''} 
                  onChange={e => updateUrl('legal_gender', e.target.value)}
                >
                  <option value="">Any</option>
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
                  onChange={e => updateUrl('verification_status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="PENDING">Pending</option>
                  <option value="UNVERIFIED">Unverified</option>
                </select>
              </div>

              {/* Municipality - Only for SUPER scope */}
              {scope === 'SUPER' && (
                <div className="w-48">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Municipality</label>
                  <select 
                    className="w-full border rounded p-2 text-sm bg-gray-50" 
                    value={searchParams.get('municipality') || ''} 
                    onChange={e => updateUrl('municipality', e.target.value)}
                  >
                    <option value="">All Municipalities</option>
                    {municipalities.map(m => (
                      <option key={m.id} value={m.id.toString()}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Clear Filters */}
              <button
                onClick={() => router.push(pathname)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-red-500 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- LIST --- */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Guardian</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Connected Youth</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <Link 
                      href={buildUrlWithParams(`${basePath}/${user.id}`)} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-900 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </Link>
                    <Link 
                      href={buildUrlWithParams(`${basePath}/edit/${user.id}`)} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-900 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Link>
                    <button 
                      onClick={() => handleDeleteClick(user)} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-md hover:bg-red-100 hover:text-red-900 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
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

