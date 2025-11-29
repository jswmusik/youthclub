'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';

interface AdminManagerProps {
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

interface Option { id: number; name: string; }

export default function AdminManager({ basePath, scope }: AdminManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [allAdmins, setAllAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Dropdowns
  const [municipalities, setMunicipalities] = useState<Option[]>([]);
  const [clubs, setClubs] = useState<Option[]>([]);
  
  // Analytics
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  // Delete
  const [adminToDelete, setAdminToDelete] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [searchParams]);

  const fetchDropdowns = async () => {
    try {
      // Fetch municipalities for SUPER scope (for filtering) and for displaying assignment names
      if (scope === 'SUPER') {
        const muniRes = await api.get('/municipalities/');
        setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
      } else if (scope === 'MUNICIPALITY') {
        // For MUNICIPALITY scope, fetch municipalities to display assignment names
        // Backend will filter to only show the current user's municipality
        const muniRes = await api.get('/municipalities/');
        setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
      }
      const clubRes = await api.get('/clubs/?page_size=1000');
      setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const rolesToFetch = ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN'];
      const search = searchParams.get('search') || '';
      const roleFilter = searchParams.get('role') || '';
      const municipalityFilter = searchParams.get('assigned_municipality') || '';
      const clubFilter = searchParams.get('assigned_club') || '';
      
      if (scope === 'SUPER') {
        // For Super Admins: Fetch admin roles in parallel and combine
        // If role filter is set, only fetch that role, otherwise fetch all
        const rolesToFetchFiltered = roleFilter && rolesToFetch.includes(roleFilter) 
          ? [roleFilter] 
          : rolesToFetch;
        
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (municipalityFilter) params.set('assigned_municipality', municipalityFilter);
        if (clubFilter) params.set('assigned_club', clubFilter);
        params.set('page_size', '1000');
        
        // Fetch each admin role separately and combine
        const promises = rolesToFetchFiltered.map(role => {
          const roleParams = new URLSearchParams(params);
          roleParams.set('role', role);
          return api.get(`/users/?${roleParams.toString()}`);
        });
        
        const results = await Promise.all(promises);
        
        // Combine all admin users
        let combinedAdmins: any[] = [];
        results.forEach(res => {
          const data = Array.isArray(res.data) ? res.data : res.data.results || [];
          combinedAdmins = combinedAdmins.concat(data);
        });
        
        setAllAdmins(combinedAdmins);
        setTotalCount(combinedAdmins.length);
      } else {
        // For Municipality/Club scope: Fetch admin roles explicitly
        const allowedRoles = scope === 'MUNICIPALITY' 
          ? ['MUNICIPALITY_ADMIN', 'CLUB_ADMIN']
          : ['CLUB_ADMIN'];
        
        // If role filter is set and valid, only fetch that role
        const rolesToFetch = roleFilter && allowedRoles.includes(roleFilter)
          ? [roleFilter]
          : allowedRoles;
        
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (municipalityFilter) params.set('assigned_municipality', municipalityFilter);
        if (clubFilter) params.set('assigned_club', clubFilter);
        params.set('page_size', '1000');
        
        // Fetch each admin role separately and combine
        const promises = rolesToFetch.map(role => {
          const roleParams = new URLSearchParams(params);
          roleParams.set('role', role);
          return api.get(`/users/?${roleParams.toString()}`);
        });
        
        const results = await Promise.all(promises);
        
        // Combine all admin users
        let combinedAdmins: any[] = [];
        results.forEach(res => {
          const data = Array.isArray(res.data) ? res.data : res.data.results || [];
          combinedAdmins = combinedAdmins.concat(data);
        });
        
        setAllAdmins(combinedAdmins);
        setTotalCount(combinedAdmins.length);
      }
    } catch (err) {
      console.error(err);
      setAllAdmins([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const municipality = searchParams.get('assigned_municipality');
    const club = searchParams.get('assigned_club');
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    if (municipality) params.set('assigned_municipality', municipality);
    if (club) params.set('assigned_club', club);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const handleDelete = async () => {
    if (!adminToDelete) return;
    try {
      await api.delete(`/users/${adminToDelete.id}/`);
      setToast({ message: 'Admin deleted.', type: 'success', isVisible: true });
      fetchAdmins();
    } catch (err) {
      setToast({ message: 'Failed to delete.', type: 'error', isVisible: true });
    } finally {
      setAdminToDelete(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-red-100 text-red-800';
      case 'MUNICIPALITY_ADMIN': return 'bg-purple-100 text-purple-800';
      case 'CLUB_ADMIN': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (first?: string | null, last?: string | null) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || '?';
  };

  // Calculate analytics from allAdmins
  const analytics = {
    total_admins: allAdmins.length,
    super_admins: allAdmins.filter((u: any) => u.role === 'SUPER_ADMIN').length,
    municipality_admins: allAdmins.filter((u: any) => u.role === 'MUNICIPALITY_ADMIN').length,
    club_admins: allAdmins.filter((u: any) => u.role === 'CLUB_ADMIN').length,
  };

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAdmins = allAdmins.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Administrators</h1>
        <Link href={`${basePath}/create`} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow">
          + New Admin
        </Link>
      </div>

      {/* Analytics Dashboard */}
      {!loading && (
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
            <div className={`p-4 grid grid-cols-1 md:grid-cols-2 ${
              scope === 'SUPER' ? 'lg:grid-cols-4' : 
              scope === 'MUNICIPALITY' ? 'lg:grid-cols-3' : 
              'lg:grid-cols-2'
            } gap-4`}>
              {/* Card 1: Total Admins */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Admins</h3>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_admins}</p>
              </div>

              {/* Card 2: Super Admins - Only show for SUPER scope */}
              {scope === 'SUPER' && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-red-300 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Super Admins</h3>
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{analytics.super_admins}</p>
                </div>
              )}

              {/* Card 3: Municipality Admins - Hide for CLUB scope */}
              {scope !== 'CLUB' && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-purple-300 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Municipality Admins</h3>
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{analytics.municipality_admins}</p>
                </div>
              )}

              {/* Card 4: Club Admins */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Club Admins</h3>
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.club_admins}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
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

          {(scope === 'SUPER' || scope === 'MUNICIPALITY') && (
            <div className="w-48">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
              <select 
                className="w-full border rounded p-2 text-sm bg-gray-50" 
                value={searchParams.get('role') || ''} 
                onChange={(e) => updateUrl('role', e.target.value)}
              >
                <option value="">All Roles</option>
                {scope === 'SUPER' && <option value="SUPER_ADMIN">Super Admin</option>}
                <option value="MUNICIPALITY_ADMIN">Municipality Admin</option>
                <option value="CLUB_ADMIN">Club Admin</option>
              </select>
            </div>
          )}

          {scope === 'SUPER' && (
            <div className="w-48">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Municipality</label>
              <select 
                className="w-full border rounded p-2 text-sm bg-gray-50" 
                value={searchParams.get('assigned_municipality') || ''} 
                onChange={(e) => {
                  const value = e.target.value;
                  const params = new URLSearchParams(searchParams.toString());
                  if (value) {
                    params.set('assigned_municipality', value);
                  } else {
                    params.delete('assigned_municipality');
                  }
                  // Clear club when municipality changes
                  params.delete('assigned_club');
                  params.set('page', '1');
                  router.push(`${pathname}?${params.toString()}`);
                }}
              >
                <option value="">All Municipalities</option>
                {municipalities.map(m => (
                  <option key={m.id} value={m.id.toString()}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Club</label>
            <select 
              className="w-full border rounded p-2 text-sm bg-gray-50" 
              value={searchParams.get('assigned_club') || ''} 
              onChange={(e) => updateUrl('assigned_club', e.target.value)}
            >
              <option value="">All Clubs</option>
              {clubs.map(c => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => router.push(pathname)} 
            className="px-4 py-2 text-sm text-gray-500 hover:text-red-500 font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-8 text-center">Loading...</div> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Assignment</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedAdmins.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img src={getMediaUrl(user.avatar) || ''} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-sm">
                          {getInitials(user.first_name, user.last_name)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-gray-900">{user.first_name} {user.last_name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getRoleBadge(user.role)}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {(() => {
                      // For CLUB_ADMIN, prioritize showing the club they're assigned to
                      if (user.role === 'CLUB_ADMIN' && user.assigned_club) {
                        const clubId = typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club;
                        const club = clubs.find(c => c.id === clubId);
                        return club?.name || 'Club Assigned';
                      }
                      // For MUNICIPALITY_ADMIN, show the municipality they're assigned to
                      if (user.role === 'MUNICIPALITY_ADMIN' && user.assigned_municipality) {
                        const muniId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
                        const municipality = municipalities.find(m => m.id === muniId);
                        return municipality?.name || 'Municipality Assigned';
                      }
                      // For SUPER_ADMIN or fallback, show based on what's available
                      if (user.assigned_municipality) {
                        const muniId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
                        const municipality = municipalities.find(m => m.id === muniId);
                        return municipality?.name || 'Municipality Assigned';
                      }
                      if (user.assigned_club) {
                        const clubId = typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club;
                        const club = clubs.find(c => c.id === clubId);
                        return club?.name || 'Club Assigned';
                      }
                      return 'Global';
                    })()}
                  </td>
                  <td className="px-6 py-4">
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
                        onClick={() => setAdminToDelete(user)} 
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
              {paginatedAdmins.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No admins found.</td></tr>
              )}
            </tbody>
          </table>
        )}
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

      <DeleteConfirmationModal 
        isVisible={!!adminToDelete}
        onClose={() => setAdminToDelete(null)}
        onConfirm={handleDelete}
        itemName={`${adminToDelete?.first_name} ${adminToDelete?.last_name}`}
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}