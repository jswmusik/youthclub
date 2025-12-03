'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { questionnaireApi } from '../../../lib/questionnaire-api';
import api from '../../../lib/api';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import Toast from '../Toast';

interface QuestionnaireManagerProps {
  basePath: string; // e.g., '/admin/club/questionnaires'
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function QuestionnaireManager({ basePath, scope }: QuestionnaireManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [analytics, setAnalytics] = useState({
    total_created: 0,
    total_completed: 0,
    total_started: 0,
  });
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  
  // Delete state
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });
  
  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset to page 1 when filters change
    if (key !== 'page') {
      params.set('page', '1');
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const fetchAnalytics = async () => {
    try {
      const res = await questionnaireApi.getSummaryAnalytics();
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const fetchMunicipalities = async () => {
    try {
      const res = await api.get('/municipalities/');
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      console.log('[QuestionnaireManager] Fetched municipalities:', data.length, data);
      setMunicipalities(data);
    } catch (err) {
      console.error('Failed to fetch municipalities:', err);
      setMunicipalities([]);
    }
  };

  const fetchClubs = async () => {
    try {
      // Fetch all clubs with pagination
      let allClubs: any[] = [];
      let nextUrl: string | null = null;
      let page = 1;
      
      do {
        const res = await api.get(`/clubs/?page=${page}&page_size=100`);
        const data = res.data;
        const pageClubs = Array.isArray(data) ? data : data.results || [];
        allClubs = [...allClubs, ...pageClubs];
        nextUrl = data.next || null;
        page++;
        if (page > 100) break; // Safety limit
      } while (nextUrl);
      
      console.log('[QuestionnaireManager] Fetched clubs:', allClubs.length, allClubs);
      setClubs(allClubs);
    } catch (err) {
      console.error('Failed to fetch clubs:', err);
      setClubs([]);
    }
  };

  // Fetch municipalities and clubs once on mount for SUPER admins
  useEffect(() => {
    if (scope === 'SUPER') {
      console.log('[QuestionnaireManager] Fetching municipalities and clubs for SUPER admin');
      fetchMunicipalities();
      fetchClubs();
    }
  }, [scope]);

  useEffect(() => {
    fetchData();
    fetchAnalytics();
  }, [searchParams]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      if (!params.has('page')) params.set('page', '1');
      // Set page size for pagination
      if (!params.has('page_size')) params.set('page_size', '10');
      
      const res = await questionnaireApi.list(params);
      setItems(Array.isArray(res.data) ? res.data : res.data.results || []);
      setTotalCount(res.data.count || 0);
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error fetching questionnaires', type: 'error', isVisible: true });
    } finally {
      setLoading(false);
    }
  };
  
  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // Helper to preserve current page when navigating
  const getLinkWithPage = (path: string) => {
    const currentPageParam = searchParams.get('page');
    if (currentPageParam) {
      return `${path}?page=${currentPageParam}`;
    }
    return path;
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await questionnaireApi.delete(itemToDelete.id);
      setToast({ message: 'Questionnaire deleted', type: 'success', isVisible: true });
      fetchData();
      fetchAnalytics();
    } catch (err) {
      setToast({ message: 'Failed to delete', type: 'error', isVisible: true });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleTogglePublish = async (item: any) => {
    const newStatus = item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await questionnaireApi.update(item.id, { status: newStatus });
      setToast({ 
        message: newStatus === 'PUBLISHED' ? 'Questionnaire published' : 'Questionnaire unpublished', 
        type: 'success', 
        isVisible: true 
      });
      fetchData();
      fetchAnalytics();
    } catch (err) {
      setToast({ message: 'Failed to update status', type: 'error', isVisible: true });
    }
  };

  const getStatusBadge = (status: string, scheduledPublishDate?: string | null, expirationDate?: string | null) => {
    // Check if expired
    if (expirationDate) {
      const expDate = new Date(expirationDate);
      if (expDate < new Date()) {
        return 'bg-yellow-100 text-yellow-800';
      }
    }
    
    // If it's DRAFT but has a scheduled publish date, show as SCHEDULED
    if (status === 'DRAFT' && scheduledPublishDate) {
      return 'bg-purple-100 text-purple-800';
    }
    
    switch (status) {
      case 'PUBLISHED': return 'bg-green-100 text-green-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'ARCHIVED': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusDisplay = (status: string, scheduledPublishDate?: string | null, expirationDate?: string | null) => {
    // Check if expired - show as ARCHIVED
    if (expirationDate) {
      const expDate = new Date(expirationDate);
      if (expDate < new Date()) {
        return 'ARCHIVED';
      }
    }
    
    // If it's DRAFT but has a scheduled publish date, show as SCHEDULED
    if (status === 'DRAFT' && scheduledPublishDate) {
      return 'SCHEDULED';
    }
    return status;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Questionnaires</h1>
        <Link 
          href={`${basePath}/create`} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow flex items-center gap-2"
        >
          <span>+ Create New</span>
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
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Total Questionnaires Created */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Created</h3>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_created}</p>
              </div>

              {/* Card 2: Completed Questionnaires */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Completed</h3>
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_completed}</p>
              </div>

              {/* Card 3: Started Questionnaires */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-orange-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Started</h3>
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_started}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
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
                  placeholder="Search by title..." 
                  className="w-full border rounded p-2 text-sm bg-gray-50"
                  value={searchParams.get('search') || ''} 
                  onChange={e => updateUrl('search', e.target.value)}
                />
              </div>

              {/* Status */}
              <div className="w-40">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={searchParams.get('status') || ''} 
                  onChange={e => updateUrl('status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Scheduled</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              {/* Municipality - Only for SUPER scope */}
              {scope === 'SUPER' && (
                <div className="w-48">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Municipality</label>
                  <select 
                    className="w-full border rounded p-2 text-sm bg-gray-50" 
                    value={searchParams.get('municipality') || ''} 
                    onChange={e => {
                      const params = new URLSearchParams(searchParams.toString());
                      const municipalityValue = e.target.value;
                      
                      // Update municipality
                      if (municipalityValue) {
                        params.set('municipality', municipalityValue);
                      } else {
                        params.delete('municipality');
                      }
                      
                      // Clear club selection when municipality changes
                      params.delete('club');
                      
                      // Reset to page 1
                      params.set('page', '1');
                      
                      router.replace(`${pathname}?${params.toString()}`);
                    }}
                  >
                    <option value="">All Municipalities</option>
                    {municipalities.map(m => (
                      <option key={m.id} value={m.id.toString()}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Club - Only for SUPER scope */}
              {scope === 'SUPER' && (
                <div className="w-48">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Club</label>
                  <select 
                    className="w-full border rounded p-2 text-sm bg-gray-50" 
                    value={searchParams.get('club') || ''} 
                    onChange={e => updateUrl('club', e.target.value)}
                  >
                    <option value="">All Clubs</option>
                    {(() => {
                      const selectedMunicipalityId = searchParams.get('municipality');
                      let filteredClubs = clubs;
                      
                      // Filter clubs by selected municipality
                      if (selectedMunicipalityId) {
                        filteredClubs = clubs.filter((c: any) => 
                          c.municipality?.toString() === selectedMunicipalityId || 
                          c.municipality_id?.toString() === selectedMunicipalityId
                        );
                      }
                      
                      return filteredClubs.map(c => (
                        <option key={c.id} value={c.id.toString()}>{c.name}</option>
                      ));
                    })()}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading questionnaires...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Responses</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link 
                      href={`${basePath}/${q.id}/analytics${searchParams.get('page') ? `?page=${searchParams.get('page')}` : ''}`}
                      className="font-bold text-gray-900 hover:text-blue-600 hover:underline"
                    >
                      {q.title}
                    </Link>
                    <div className="text-xs text-gray-500 truncate max-w-xs">{q.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusBadge(q.status, q.scheduled_publish_date, q.expiration_date)}`}>
                      {getStatusDisplay(q.status, q.scheduled_publish_date, q.expiration_date)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {q.expiration_date ? new Date(q.expiration_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">
                      <span className="font-semibold">{q.response_count || 0}</span>{' '}
                      <span className="text-gray-500">completed</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {q.status === 'DRAFT' && (
                        <button 
                          onClick={() => handleTogglePublish(q)}
                          className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded text-xs font-semibold"
                          title="Publish questionnaire"
                        >
                          Publish
                        </button>
                      )}
                      {q.status === 'PUBLISHED' && (
                        <button 
                          onClick={() => handleTogglePublish(q)}
                          className="text-yellow-600 hover:text-yellow-900 bg-yellow-50 px-3 py-1 rounded text-xs font-semibold"
                          title="Unpublish questionnaire"
                        >
                          Unpublish
                        </button>
                      )}
                      <Link 
                        href={`${basePath}/edit/${q.id}${searchParams.get('page') ? `?page=${searchParams.get('page')}` : ''}`}
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded text-xs font-semibold"
                      >
                        Edit
                      </Link>
                      <button 
                        onClick={() => setItemToDelete(q)}
                        className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No questionnaires found.</td></tr>
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
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        itemName={itemToDelete?.title}
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}

