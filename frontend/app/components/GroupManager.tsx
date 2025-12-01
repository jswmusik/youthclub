'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import api from '../../lib/api';
import Toast from './Toast';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface Group {
  id: number;
  name: string;
  group_type: 'OPEN' | 'APPLICATION' | 'CLOSED';
  is_system_group: boolean;
  member_count: number;
  pending_request_count: number;
  created_at: string;
  municipality: number | null;
  municipality_name?: string; // New
  club: number | null;
  club_name?: string;         // New
}

interface GroupManagerProps {
  basePath: string; // e.g., "/admin/super/groups"
}

export default function GroupManager({ basePath }: GroupManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]); // Store all groups from API
  const [allFilteredGroups, setAllFilteredGroups] = useState<Group[]>([]); // Store all filtered groups for pagination
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Determine admin type from basePath
  const isSuperAdmin = basePath.includes('/super');
  const isMuniAdmin = basePath.includes('/municipality');
  
  // Dropdowns
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  
  // Stats
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalMembers: 0,
    activeGroups: 0,
    emptyGroups: 0
  });

  // Actions
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false });
  const [showDelete, setShowDelete] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    // Reset to page 1 when filters change (except when changing page itself)
    if (key !== 'page') {
      params.set('page', '1');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const municipality = searchParams.get('municipality');
    const club = searchParams.get('club');
    const type = searchParams.get('type');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (municipality) params.set('municipality', municipality);
    if (club) params.set('club', club);
    if (type) params.set('type', type);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  useEffect(() => {
    fetchDropdowns();
    fetchGroups();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchParams, allGroups]);

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

  const fetchGroups = async () => {
    setLoading(true);
    try {
      // Fetch ALL groups by paginating through all pages
      // (Backend paginates by default, so we need to fetch all pages)
      let allGroupsData: Group[] = [];
      let pageNum = 1;
      let totalCount = 0;
      const fetchPageSize = 100; // Fetch large pages to minimize requests
      const maxPages = 100; // Safety limit
      
      while (pageNum <= maxPages) {
        const res = await api.get(`/groups/?page=${pageNum}&page_size=${fetchPageSize}`);
        const responseData = res.data;
        
        if (Array.isArray(responseData)) {
          // Direct array response (unlikely with DRF)
          allGroupsData = [...allGroupsData, ...responseData];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          // Paginated response
          const pageGroups = responseData.results;
          allGroupsData = [...allGroupsData, ...pageGroups];
          
          // Get total count from first page
          if (pageNum === 1) {
            totalCount = responseData.count || 0;
          }
          
          // Check if we should continue
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allGroupsData.length >= totalCount;
          const gotEmptyPage = pageGroups.length === 0;
          
          // Stop if: no next page, we have all results, or got empty page
          if (!hasNext || hasAllResults || gotEmptyPage) {
            break;
          }
          
          // Continue to next page
          pageNum++;
        } else {
          // Fallback: treat as array
          allGroupsData = Array.isArray(responseData) ? responseData : [];
          break;
        }
      }
      
      setAllGroups(allGroupsData);
      // applyFilters will calculate stats from filtered groups
      applyFilters();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to load groups.', type: 'error', isVisible: true });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allGroups];

    // Search filter (by name)
    const search = searchParams.get('search') || '';
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(g => 
        g.name?.toLowerCase().includes(searchLower)
      );
    }

    // Municipality filter
    const municipality = searchParams.get('municipality') || '';
    if (municipality) {
      filtered = filtered.filter(g => 
        g.municipality?.toString() === municipality
      );
    }

    // Club filter
    const club = searchParams.get('club') || '';
    if (club) {
      filtered = filtered.filter(g => 
        g.club?.toString() === club
      );
    }

    // Type filter
    const type = searchParams.get('type') || '';
    if (type) {
      filtered = filtered.filter(g => 
        g.group_type === type
      );
    }

    // Store all filtered groups for pagination calculation
    setAllFilteredGroups(filtered);
    calculateStats(filtered);
    
    // Apply pagination
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedGroups = filtered.slice(startIndex, endIndex);
    
    setGroups(paginatedGroups);
  };

  const calculateStats = (data: Group[]) => {
    const totalMembers = data.reduce((sum, g) => sum + (g.member_count || 0), 0);
    const activeGroups = data.filter(g => (g.member_count || 0) > 0).length;
    
    setStats({
      totalGroups: data.length,
      totalMembers,
      activeGroups,
      emptyGroups: data.length - activeGroups
    });
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    try {
      await api.delete(`/groups/${selectedGroup.id}/`);
      setToast({ message: 'Group deleted successfully.', type: 'success', isVisible: true });
      fetchGroups();
    } catch (err) {
      setToast({ message: 'Failed to delete group.', type: 'error', isVisible: true });
    } finally {
      setShowDelete(false);
      setSelectedGroup(null);
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'OPEN': return 'bg-green-100 text-green-800';
      case 'APPLICATION': return 'bg-blue-100 text-blue-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-500 text-sm">Manage member segments and filters.</p>
        </div>
        <Link 
          href={`${basePath}/create`}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow transition text-center"
        >
          + Create New Group
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
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Groups */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Groups</h3>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalGroups || 0}</p>
              </div>

              {/* Card 2: Total Members */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Members</h3>
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalMembers || 0}</p>
              </div>

              {/* Card 3: Active Groups */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Active Groups</h3>
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.activeGroups || 0}</p>
              </div>

              {/* Card 4: Empty Groups */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Empty Groups</h3>
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.emptyGroups || 0}</p>
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
                  placeholder="Search by name..." 
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

              {/* Club */}
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

              {/* Type */}
              <div className="w-48">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={searchParams.get('type') || ''} 
                  onChange={e => updateUrl('type', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="OPEN">Open</option>
                  <option value="APPLICATION">Application</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

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

      {/* GROUPS LIST */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-2">
              {searchParams.get('search') || searchParams.get('municipality') || searchParams.get('club') || searchParams.get('type')
                ? 'No groups found matching your filters.'
                : 'No groups found. Create your first group to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Group Name</th>
                  
                  {/* DYNAMIC COLUMNS */}
                  {isSuperAdmin && <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Municipality</th>}
                  {(isSuperAdmin || isMuniAdmin) && <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Club</th>}
                  
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Members</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-bold text-gray-900">{group.name}</div>
                          {group.is_system_group && (
                            <span className="text-[10px] uppercase font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">System</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* DYNAMIC CELLS */}
                    {isSuperAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {group.municipality_name || '-'}
                      </td>
                    )}
                    {(isSuperAdmin || isMuniAdmin) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {group.club_name || '-'}
                      </td>
                    )}

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getBadgeStyle(group.group_type)}`}>
                        {group.group_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">{group.member_count}</div>
                      {group.pending_request_count > 0 && (
                        <div className="text-xs text-orange-600 font-semibold">
                          {group.pending_request_count} pending
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={buildUrlWithParams(`${basePath}/${group.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-900 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </Link>
                        {!group.is_system_group && (
                          <>
                            <Link 
                              href={buildUrlWithParams(`${basePath}/edit/${group.id}`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-900 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </Link>
                            <button 
                              onClick={() => { setSelectedGroup(group); setShowDelete(true); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-md hover:bg-red-100 hover:text-red-900 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </>
                        )}
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
        const totalCount = allFilteredGroups.length;
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

      <DeleteConfirmationModal
        isVisible={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        itemName={selectedGroup?.name}
        message="Are you sure? This will remove all members from this group."
      />

      <Toast {...toast} onClose={() => setToast({ ...toast, isVisible: false })} />
    </div>
  );
}