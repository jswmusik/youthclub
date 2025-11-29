'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';

interface MunicipalityManagerProps {
  basePath: string;
}

export default function MunicipalityManager({ basePath }: MunicipalityManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  
  // Analytics data
  const [allMunicipalitiesForAnalytics, setAllMunicipalitiesForAnalytics] = useState<any[]>([]);
  
  // Delete
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  useEffect(() => {
    // Load Countries for filter
    api.get('/countries/').then(res => {
        setCountries(Array.isArray(res.data) ? res.data : res.data.results || []);
    });
    fetchAllMunicipalitiesForAnalytics();
  }, []);

  useEffect(() => {
    fetchData();
  }, [searchParams]);

  const fetchAllMunicipalitiesForAnalytics = async () => {
    try {
      // Fetch all municipalities for analytics calculation
      let allMunicipalities: any[] = [];
      let page = 1;
      let totalCount = 0;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/municipalities/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) {
          break;
        }
        
        let pageMunicipalities: any[] = [];
        
        if (Array.isArray(responseData)) {
          pageMunicipalities = responseData;
          allMunicipalities = [...allMunicipalities, ...pageMunicipalities];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageMunicipalities = responseData.results;
          allMunicipalities = [...allMunicipalities, ...pageMunicipalities];
          
          if (page === 1) {
            totalCount = responseData.count || 0;
          }
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allMunicipalities.length >= totalCount;
          const gotEmptyPage = pageMunicipalities.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) {
            break;
          }
          
          page++;
        } else {
          break;
        }
      }
      
      setAllMunicipalitiesForAnalytics(allMunicipalities);
    } catch (err) {
      console.error('Error fetching municipalities for analytics:', err);
      setAllMunicipalitiesForAnalytics([]);
    }
  };


  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Get filters from URL
      const search = searchParams.get('search') || '';
      const country = searchParams.get('country') || '';
      const page = searchParams.get('page') || '1';
      
      if (search) params.set('search', search);
      if (country) params.set('country', country);
      
      // Use server-side pagination
      params.set('page', page);
      params.set('page_size', '10');
      
      const res = await api.get(`/municipalities/?${params.toString()}`);
      
      // Handle both paginated and non-paginated responses
      if (Array.isArray(res.data)) {
        // Non-paginated response (array)
        setMunicipalities(res.data);
        setTotalCount(res.data.length);
      } else {
        // Paginated response (object with results and count)
        setMunicipalities(res.data.results || []);
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
    const country = searchParams.get('country');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (country) params.set('country', country);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/municipalities/${itemToDelete.id}/`);
      setToast({ message: 'Municipality deleted.', type: 'success', isVisible: true });
      fetchData();
      fetchAllMunicipalitiesForAnalytics();
    } catch (err) {
      setToast({ message: 'Failed to delete. It might contain clubs.', type: 'error', isVisible: true });
    } finally {
      setItemToDelete(null);
    }
  };

  // Calculate analytics
  const analytics = {
    total_municipalities: allMunicipalitiesForAnalytics.length,
    new_municipalities_last_30_days: allMunicipalitiesForAnalytics.filter((municipality: any) => {
      // Check for various possible date field names (created_at is the standard field from backend)
      const dateValue = municipality.created_at || municipality.date_created || municipality.date_joined;
      
      if (!dateValue) {
        // Debug: log municipalities without date fields (only log first few to avoid spam)
        if (allMunicipalitiesForAnalytics.length <= 5) {
          console.log('Municipality without date field:', municipality.id, municipality.name, 'Available keys:', Object.keys(municipality));
        }
        return false;
      }
      
      try {
        const createdDate = new Date(dateValue);
        
        // Check if date is valid
        if (isNaN(createdDate.getTime())) {
          console.log('Invalid date for municipality:', municipality.id, municipality.name, dateValue);
          return false;
        }
        
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // Set time to start of day for accurate comparison
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        
        const isRecent = createdDate >= thirtyDaysAgo;
        
        // Debug: log the comparison for first few municipalities
        if (allMunicipalitiesForAnalytics.length <= 5) {
          console.log(`Municipality ${municipality.name}: created=${createdDate.toISOString()}, 30daysAgo=${thirtyDaysAgo.toISOString()}, isRecent=${isRecent}`);
        }
        
        return isRecent;
      } catch (err) {
        console.error('Error parsing date for municipality:', municipality.id, municipality.name, dateValue, err);
        return false;
      }
    }).length,
  };

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Municipalities</h1>
        <Link 
          href={`${basePath}/create`} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow"
        >
          + Add Municipality
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
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Total Municipalities */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Municipalities</h3>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_municipalities}</p>
              </div>

              {/* Card 2: New Municipalities Last 30 Days */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">New Municipalities (30 Days)</h3>
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.new_municipalities_last_30_days}</p>
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
                  placeholder="Search by name, code, email, or description..." 
                  className="w-full border rounded p-2 text-sm bg-gray-50"
                  value={searchParams.get('search') || ''} 
                  onChange={e => updateUrl('search', e.target.value)}
                />
              </div>

              {/* Country */}
              <div className="w-48">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Country</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={searchParams.get('country') || ''} 
                  onChange={e => updateUrl('country', e.target.value)}
                >
                  <option value="">All Countries</option>
                  {countries.map(c => (
                    <option key={c.id} value={c.id.toString()}>{c.name}</option>
                  ))}
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

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-500">Loading...</div> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Municipality</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Country</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Registration</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {municipalities.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.avatar ? (
                        <img src={getMediaUrl(item.avatar) || ''} className="w-10 h-10 rounded-lg object-contain bg-gray-50 border" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs">M</div>
                      )}
                      <span className="font-bold text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.country_name || '-'}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.municipality_code || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.allow_self_registration ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {item.allow_self_registration ? 'Open' : 'Closed'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={buildUrlWithParams(`${basePath}/${item.id}`)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-900 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </Link>
                      <Link 
                        href={buildUrlWithParams(`${basePath}/edit/${item.id}`)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-900 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Link>
                      <button 
                        onClick={() => setItemToDelete(item)} 
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
              {municipalities.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No municipalities found.</td></tr>
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
        itemName={itemToDelete?.name}
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This will delete all associated clubs and data.`}
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}