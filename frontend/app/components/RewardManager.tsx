'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import Toast from './Toast';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { getMediaUrl } from '../utils';

interface Reward {
  id: number;
  name: string;
  image: string | null;
  owner_role: string;
  municipality_name?: string;
  club_name?: string;
  is_active: boolean;
  expiration_date: string | null;
  usage_limit: number | null;
}

interface Analytics {
  total_created: number;
  active_rewards: number;
  expired_rewards: number;
  total_uses: number;
  uses_last_7_days: number;
}

interface RewardManagerProps {
  basePath: string; // e.g. "/admin/super/rewards"
}

export default function RewardManager({ basePath }: RewardManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Determine admin type from pathname
  const isSuperAdmin = pathname.includes('/super');
  const isMuniAdmin = pathname.includes('/municipality');
  const isClubAdmin = pathname.includes('/club');
  
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [allRewards, setAllRewards] = useState<Reward[]>([]); // Store all rewards from API
  const [filteredRewards, setFilteredRewards] = useState<Reward[]>([]); // Store filtered rewards for pagination
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Actions
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });
  const [rewardToDelete, setRewardToDelete] = useState<Reward | null>(null);

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
    const scope = searchParams.get('scope');
    const status = searchParams.get('status');
    const expired = searchParams.get('expired');
    
    // Always include page if it exists and is not '1', or if we're on a page > 1
    const currentPage = Number(searchParams.get('page')) || 1;
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (search) params.set('search', search);
    if (scope) params.set('scope', scope);
    if (status) params.set('status', status);
    if (expired) params.set('expired', expired);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchParams, allRewards]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all rewards (may need to paginate through all pages)
      let allRewardsData: Reward[] = [];
      let page = 1;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/rewards/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) {
          break;
        }
        
        let pageRewards: Reward[] = [];
        
        if (Array.isArray(responseData)) {
          pageRewards = responseData;
          allRewardsData = [...allRewardsData, ...pageRewards];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageRewards = responseData.results;
          allRewardsData = [...allRewardsData, ...pageRewards];
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = responseData.count > 0 && allRewardsData.length >= responseData.count;
          const gotEmptyPage = pageRewards.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) {
            break;
          }
          
          page++;
        } else {
          break;
        }
      }
      
      const [statsRes] = await Promise.all([
        api.get('/rewards/analytics_overview/')
      ]);
      
      setAllRewards(allRewardsData);
      setAnalytics(statsRes.data);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to load rewards.', type: 'error', isVisible: true });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allRewards];
    
    // Search by name
    const search = searchParams.get('search') || '';
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(r => r.name.toLowerCase().includes(searchLower));
    }
    
    // Filter by scope
    const scope = searchParams.get('scope') || '';
    if (scope) {
      if (scope === 'GLOBAL') {
        filtered = filtered.filter(r => r.owner_role === 'SUPER_ADMIN');
      } else if (scope === 'MUNICIPALITY') {
        filtered = filtered.filter(r => r.owner_role === 'MUNICIPALITY_ADMIN');
      } else if (scope === 'CLUB') {
        filtered = filtered.filter(r => r.owner_role === 'CLUB_ADMIN');
      }
    }
    
    // Filter by status
    const status = searchParams.get('status') || '';
    if (status) {
      if (status === 'active') {
        filtered = filtered.filter(r => r.is_active);
      } else if (status === 'inactive') {
        filtered = filtered.filter(r => !r.is_active);
      }
    }
    
    // Filter by expired
    const expired = searchParams.get('expired') || '';
    if (expired) {
      const now = new Date();
      if (expired === 'yes') {
        filtered = filtered.filter(r => {
          if (!r.expiration_date) return false;
          return new Date(r.expiration_date) < now;
        });
      } else if (expired === 'no') {
        filtered = filtered.filter(r => {
          if (!r.expiration_date) return true; // No expiry = not expired
          return new Date(r.expiration_date) >= now;
        });
      }
    }
    
    setFilteredRewards(filtered);
    
    // Apply pagination
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setRewards(filtered.slice(startIndex, endIndex));
  };

  const handleDelete = async () => {
    if (!rewardToDelete) return;
    try {
      await api.delete(`/rewards/${rewardToDelete.id}/`);
      setToast({ message: 'Reward deleted successfully.', type: 'success', isVisible: true });
      setRewardToDelete(null);
      await fetchData(); // Refresh list
      // Reapply filters to maintain current page if possible
      applyFilters();
    } catch (err) {
      setToast({ message: 'Failed to delete reward.', type: 'error', isVisible: true });
    }
  };

  const getScopeLabel = (r: Reward) => {
    if (r.owner_role === 'SUPER_ADMIN') return '🌍 Global';
    if (r.owner_role === 'MUNICIPALITY_ADMIN') return `🏛️ ${r.municipality_name}`;
    if (r.owner_role === 'CLUB_ADMIN') return `⚽ ${r.club_name}`;
    return '-';
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading rewards...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Rewards Management</h1>
        <Link 
          href={`${basePath}/create`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow transition"
        >
          + Create Reward
        </Link>
      </div>

      {/* Analytics Dashboard */}
      {!loading && analytics && (
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
              {/* Card 1: Active Rewards */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Active Rewards</h3>
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.active_rewards}</p>
              </div>

              {/* Card 2: Total Created */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Created</h3>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_created}</p>
              </div>

              {/* Card 3: Total Claims */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-purple-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Claims</h3>
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_uses}</p>
              </div>

              {/* Card 4: Claims (7 Days) */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-orange-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Claims (7 Days)</h3>
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.uses_last_7_days}</p>
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

              {/* Scope - Only for Super Admin */}
              {isSuperAdmin && (
                <div className="w-48">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Scope</label>
                  <select 
                    className="w-full border rounded p-2 text-sm bg-gray-50" 
                    value={searchParams.get('scope') || ''} 
                    onChange={e => updateUrl('scope', e.target.value)}
                  >
                    <option value="">All Scopes</option>
                    <option value="GLOBAL">Global</option>
                    <option value="MUNICIPALITY">Municipality</option>
                    <option value="CLUB">Club</option>
                  </select>
                </div>
              )}

              {/* Scope - For Municipality Admin (only Municipality and Club options) */}
              {isMuniAdmin && (
                <div className="w-48">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Scope</label>
                  <select 
                    className="w-full border rounded p-2 text-sm bg-gray-50" 
                    value={searchParams.get('scope') || ''} 
                    onChange={e => updateUrl('scope', e.target.value)}
                  >
                    <option value="">All Scopes</option>
                    <option value="MUNICIPALITY">Municipality</option>
                    <option value="CLUB">Club</option>
                  </select>
                </div>
              )}

              {/* Status */}
              <div className="w-48">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={searchParams.get('status') || ''} 
                  onChange={e => updateUrl('status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Expired */}
              <div className="w-48">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expired</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={searchParams.get('expired') || ''} 
                  onChange={e => updateUrl('expired', e.target.value)}
                >
                  <option value="">All</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
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

      {/* LIST TABLE */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-8 text-center">Loading...</div> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Reward</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Scope</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Expiry</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rewards.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No rewards found.</td></tr>
              ) : (
                <>
                  {rewards.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border">
                        {r.image ? (
                          <img src={getMediaUrl(r.image) || ''} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-lg">🎁</div>
                        )}
                      </div>
                      <span className="font-bold text-gray-900">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{getScopeLabel(r)}</td>
                  <td className="px-6 py-4">
                    {r.is_active 
                      ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">Active</span>
                      : <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-bold">Inactive</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {r.expiration_date ? new Date(r.expiration_date).toLocaleDateString() : 'No Expiry'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={buildUrlWithParams(`${basePath}/${r.id}`)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-900 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </Link>
                      <Link 
                        href={buildUrlWithParams(`${basePath}/edit/${r.id}`)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-900 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Link>
                      <button 
                        onClick={() => setRewardToDelete(r)} 
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
                </>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {(() => {
        const currentPage = Number(searchParams.get('page')) || 1;
        const pageSize = 10;
        const totalCount = filteredRewards.length;
        const totalPages = Math.ceil(totalCount / pageSize);
        
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
        isVisible={!!rewardToDelete}
        onClose={() => setRewardToDelete(null)}
        onConfirm={handleDelete}
        itemName={rewardToDelete?.name}
      />

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}