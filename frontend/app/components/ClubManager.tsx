'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';

interface ClubManagerProps {
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY';
}

export default function ClubManager({ basePath, scope }: ClubManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [clubs, setClubs] = useState<any[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  
  // Analytics - fetch all clubs for calculations
  const [allClubsForAnalytics, setAllClubsForAnalytics] = useState<any[]>([]);
  const [allUsersForAnalytics, setAllUsersForAnalytics] = useState<any[]>([]);
  
  // Delete
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  useEffect(() => {
    // Load municipalities for filter (Super Admin only)
    if (scope === 'SUPER') {
        api.get('/municipalities/').then(res => {
            setMunicipalities(Array.isArray(res.data) ? res.data : res.data.results || []);
        });
    }
    fetchAllClubsForAnalytics();
    fetchAllUsersForAnalytics();
  }, [scope]);

  useEffect(() => {
    fetchClubs();
  }, [searchParams]);

  const fetchAllClubsForAnalytics = async () => {
    try {
      // Fetch all clubs for analytics calculation
      let allClubs: any[] = [];
      let page = 1;
      let totalCount = 0;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/clubs/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) {
          break;
        }
        
        let pageClubs: any[] = [];
        
        if (Array.isArray(responseData)) {
          pageClubs = responseData;
          allClubs = [...allClubs, ...pageClubs];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageClubs = responseData.results;
          allClubs = [...allClubs, ...pageClubs];
          
          if (page === 1) {
            totalCount = responseData.count || 0;
          }
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allClubs.length >= totalCount;
          const gotEmptyPage = pageClubs.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) {
            break;
          }
          
          page++;
        } else {
          break;
        }
      }
      
      setAllClubsForAnalytics(allClubs);
    } catch (err) {
      console.error('Error fetching clubs for analytics:', err);
      setAllClubsForAnalytics([]);
    }
  };

  const fetchAllUsersForAnalytics = async () => {
    try {
      // Fetch all youth members to calculate average members per club
      let allUsers: any[] = [];
      let page = 1;
      let totalCount = 0;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('role', 'YOUTH_MEMBER');
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/users/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) {
          break;
        }
        
        let pageUsers: any[] = [];
        
        if (Array.isArray(responseData)) {
          pageUsers = responseData;
          allUsers = [...allUsers, ...pageUsers];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageUsers = responseData.results;
          allUsers = [...allUsers, ...pageUsers];
          
          if (page === 1) {
            totalCount = responseData.count || 0;
          }
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allUsers.length >= totalCount;
          const gotEmptyPage = pageUsers.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) {
            break;
          }
          
          page++;
        } else {
          break;
        }
      }
      
      setAllUsersForAnalytics(allUsers);
    } catch (err) {
      console.error('Error fetching users for analytics:', err);
      setAllUsersForAnalytics([]);
    }
  };

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Get filters from URL
      const page = searchParams.get('page') || '1';
      const search = searchParams.get('search') || '';
      const municipality = searchParams.get('municipality') || '';
      
      if (search) params.set('search', search);
      if (scope === 'SUPER' && municipality) params.set('municipality', municipality);
      
      // Use server-side pagination
      params.set('page', page);
      params.set('page_size', '10');
      
      const res = await api.get(`/clubs/?${params.toString()}`);
      
      // Handle both paginated and non-paginated responses
      if (Array.isArray(res.data)) {
        // Non-paginated response (array)
        setClubs(res.data);
        setTotalCount(res.data.length);
      } else {
        // Paginated response (object with results and count)
        setClubs(res.data.results || []);
        setTotalCount(res.data.count || (res.data.results?.length || 0));
      }
    } catch (err) {
      console.error(err);
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
    const municipality = searchParams.get('municipality');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (municipality) params.set('municipality', municipality);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const getInitials = (name: string) => {
    if (!name) return 'C';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      // Single word: take first 2 letters
      return name.substring(0, 2).toUpperCase();
    }
    // Multiple words: take first letter of first two words
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/clubs/${itemToDelete.id}/`);
      setToast({ message: 'Club deleted.', type: 'success', isVisible: true });
      fetchClubs();
      fetchAllClubsForAnalytics();
    } catch (err) {
      setToast({ message: 'Failed to delete.', type: 'error', isVisible: true });
    } finally {
      setItemToDelete(null);
    }
  };

  // Calculate analytics
  const analytics = {
    total_clubs: allClubsForAnalytics.length,
    new_last_30_days: allClubsForAnalytics.filter((club: any) => {
      // Try to get created_at from the club object
      // If not available, we'll need to fetch it separately or add it to the serializer
      // For now, we'll check if the field exists
      if (!club.created_at) return false;
      const createdDate = new Date(club.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdDate >= thirtyDaysAgo;
    }).length,
    average_members: (() => {
      if (allClubsForAnalytics.length === 0) return 0;
      // Count members per club (users with preferred_club set)
      const memberCounts = allClubsForAnalytics.map((club: any) => {
        return allUsersForAnalytics.filter((user: any) => user.preferred_club === club.id).length;
      });
      const totalMembers = memberCounts.reduce((sum, count) => sum + count, 0);
      return totalMembers > 0 ? Math.round((totalMembers / allClubsForAnalytics.length) * 10) / 10 : 0;
    })(),
  };

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Clubs</h1>
        <Link href={`${basePath}/create`} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow">
          + Add Club
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
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 1: Total Clubs */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Clubs</h3>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_clubs}</p>
              </div>

              {/* Card 2: New Last 30 Days */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">New (30 Days)</h3>
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.new_last_30_days}</p>
              </div>

              {/* Card 3: Average Members */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-purple-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Avg Members</h3>
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.average_members}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                  placeholder="Search by club name, email, or description..." 
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

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-12 text-center">Loading...</div> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Club</th>
                {scope === 'SUPER' && <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Municipality</th>}
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clubs.map(club => (
                <tr key={club.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        {club.avatar ? (
                          <img src={getMediaUrl(club.avatar)||''} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600 text-sm">
                            {getInitials(club.name || 'Club')}
                          </div>
                        )}
                        <span className="font-bold text-gray-900">{club.name}</span>
                    </div>
                  </td>
                  {scope === 'SUPER' && <td className="px-6 py-4 text-sm text-gray-600">{club.municipality_name}</td>}
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>{club.email}</div>
                    <div className="text-xs text-gray-400">{club.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={buildUrlWithParams(`${basePath}/${club.id}`)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-900 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </Link>
                      <Link 
                        href={buildUrlWithParams(`${basePath}/edit/${club.id}`)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-900 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Link>
                      <button 
                        onClick={() => setItemToDelete(club)} 
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
              {clubs.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500">No clubs found.</td></tr>}
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
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        itemName={itemToDelete?.name}
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}