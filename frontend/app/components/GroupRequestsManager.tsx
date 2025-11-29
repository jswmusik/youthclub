'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import api from '../../lib/api';
import Toast from './Toast';
import { getMediaUrl } from '../../app/utils';

export default function GroupRequestsManager() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Determine admin type from pathname
  const isSuperAdmin = pathname.includes('/super');
  const isMuniAdmin = pathname.includes('/municipality');
  const isClubAdmin = pathname.includes('/club');
  
  const [requests, setRequests] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]); // Store all requests from API
  const [allFilteredRequests, setAllFilteredRequests] = useState<any[]>([]); // Store all filtered requests for pagination
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Dropdowns
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    // Reset to page 1 when filters change (except when changing page itself)
    if (key !== 'page') {
      params.set('page', '1');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    fetchDropdowns();
    fetchAllRequests();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [searchParams, allRequests]);

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = searchParams.get('search') || '';
      if (searchInput !== currentSearch) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) params.set('search', searchInput); else params.delete('search');
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 0);
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Sync searchInput with URL when it changes externally
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== searchInput && document.activeElement !== searchInputRef.current) {
      setSearchInput(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchDropdowns = async () => {
    try {
      const [muniRes, clubRes] = await Promise.all([
        isSuperAdmin ? api.get('/municipalities/') : Promise.resolve({ data: [] }),
        api.get('/clubs/?page_size=1000')
      ]);
      
      setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
      setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllRequests = async () => {
    setLoading(true);
    try {
      // Fetch ALL requests by paginating through all pages
      let allRequestsData: any[] = [];
      let pageNum = 1;
      let totalCount = 0;
      const fetchPageSize = 100;
      const maxPages = 100;
      
      while (pageNum <= maxPages) {
        const res = await api.get(`/group-requests/?page=${pageNum}&page_size=${fetchPageSize}`);
        const responseData = res.data;
        
        if (Array.isArray(responseData)) {
          allRequestsData = [...allRequestsData, ...responseData];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          const pageRequests = responseData.results;
          allRequestsData = [...allRequestsData, ...pageRequests];
          
          if (pageNum === 1) {
            totalCount = responseData.count || 0;
          }
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allRequestsData.length >= totalCount;
          const gotEmptyPage = pageRequests.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) {
            break;
          }
          
          pageNum++;
        } else {
          allRequestsData = Array.isArray(responseData) ? responseData : [];
          break;
        }
      }
      
      setAllRequests(allRequestsData);
      applyFilter();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    let filtered = [...allRequests];
    
    // Search filter (by user name, email, or group name)
    const search = searchParams.get('search') || '';
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(req => 
        req.user_name?.toLowerCase().includes(searchLower) ||
        req.user_email?.toLowerCase().includes(searchLower) ||
        req.group_name?.toLowerCase().includes(searchLower)
      );
    }

    // Municipality filter
    const municipality = searchParams.get('municipality') || '';
    if (municipality) {
      filtered = filtered.filter(req => 
        req.group_municipality?.toString() === municipality
      );
    }

    // Club filter
    const club = searchParams.get('club') || '';
    if (club) {
      filtered = filtered.filter(req => 
        req.group_club?.toString() === club
      );
    }
    
    // Store all filtered requests for pagination calculation
    setAllFilteredRequests(filtered);
    
    // Apply pagination
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedRequests = filtered.slice(startIndex, endIndex);
    
    setRequests(paginatedRequests);
  };

  // Calculate analytics from all requests
  const calculateAnalytics = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalApplications = allRequests.length;
    const applicationsLastWeek = allRequests.filter(req => {
      const requestDate = new Date(req.joined_at || req.created_at);
      return requestDate >= weekAgo;
    }).length;
    const applicationsLast30Days = allRequests.filter(req => {
      const requestDate = new Date(req.joined_at || req.created_at);
      return requestDate >= thirtyDaysAgo;
    }).length;

    return {
      totalApplications,
      applicationsLastWeek,
      applicationsLast30Days
    };
  };

  const analytics = calculateAnalytics();

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
    const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || '?';
  };

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      await api.post(`/group-requests/${id}/${action}/`);
      setToast({ 
        message: action === 'approve' ? 'Member approved!' : 'Request rejected.', 
        type: 'success', 
        isVisible: true 
      });
      // Refresh list - pagination state is preserved in URL, so applyFilter will maintain current page
      fetchAllRequests();
    } catch (err) {
      setToast({ message: 'Action failed.', type: 'error', isVisible: true });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Group Applications</h1>
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
              {/* Card 1: Total Applications */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Applications</h3>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalApplications}</p>
              </div>

              {/* Card 2: Applications Last Week */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Last Week</h3>
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.applicationsLastWeek}</p>
              </div>

              {/* Card 3: Applications Last 30 Days */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-purple-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Last 30 Days</h3>
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.applicationsLast30Days}</p>
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
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Search by user name, email, or group name..." 
                  className="w-full border rounded p-2 text-sm bg-gray-50"
                  value={searchInput} 
                  onChange={e => setSearchInput(e.target.value)}
                />
              </div>

              {/* Municipality - Only for Super Admin */}
              {isSuperAdmin && (
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

              {/* Club - For Super Admin and Municipality Admin */}
              {(isSuperAdmin || isMuniAdmin) && (
                <div className="w-48">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Club</label>
                  <select 
                    className="w-full border rounded p-2 text-sm bg-gray-50" 
                    value={searchParams.get('club') || ''} 
                    onChange={e => updateUrl('club', e.target.value)}
                  >
                    <option value="">All Clubs</option>
                    {clubs.map(c => (
                      <option key={c.id} value={c.id.toString()}>{c.name}</option>
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

      {/* LIST */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="mb-2">
              {searchParams.get('search') || searchParams.get('municipality') || searchParams.get('club')
                ? 'No applications found matching your filters.'
                : 'No pending applications found.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Applying To</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Requested</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {req.user_avatar ? (
                          <img src={getMediaUrl(req.user_avatar) || ''} className="w-10 h-10 rounded-full object-cover bg-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                            {getInitials(req.user_first_name, req.user_last_name)}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-bold text-gray-900">{req.user_name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{req.user_email || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {req.group_name || 'Unknown Group'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {req.joined_at ? new Date(req.joined_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleAction(req.id, 'approve')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded-md hover:bg-green-100 hover:text-green-900 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve
                        </button>
                        <button 
                          onClick={() => handleAction(req.id, 'reject')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-md hover:bg-red-100 hover:text-red-900 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Deny
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {(() => {
        const currentPage = Number(searchParams.get('page')) || 1;
        const pageSize = 10;
        const totalCount = allFilteredRequests.length;
        const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

        if (totalPages <= 1) return null;

        return (
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
        );
      })()}

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}