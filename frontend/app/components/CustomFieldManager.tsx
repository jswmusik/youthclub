'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Toast from './Toast';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface CustomField {
  id: number;
  name: string;
  help_text: string;
  field_type: 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'BOOLEAN';
  options: string[];
  required: boolean;
  is_published: boolean;
  target_roles: string[];
  specific_clubs: number[];
  context?: 'USER_PROFILE' | 'EVENT';
  owner_role?: string;
  club?: number | { id: number };
  municipality?: number | { id: number };
}

interface CustomFieldManagerProps {
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function CustomFieldManager({ basePath, scope }: CustomFieldManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [allFields, setAllFields] = useState<CustomField[]>([]);
  const [allFieldsForAnalytics, setAllFieldsForAnalytics] = useState<CustomField[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  
  const [clubs, setClubs] = useState<any[]>([]);
  const [fieldToDelete, setFieldToDelete] = useState<CustomField | null>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Search input ref for focus management
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    fetchAllFieldsForAnalytics();
    if (scope === 'MUNICIPALITY') {
      fetchClubs();
    }
  }, [scope]);

  useEffect(() => {
    fetchFields();
  }, [searchParams]);

  // Sync search input with URL param
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    setSearchInput(urlSearch);
  }, [searchParams]);

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      const urlSearch = searchParams.get('search') || '';
      if (searchInput !== urlSearch) {
        updateUrl('search', searchInput);
        // Restore focus after URL update
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 0);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchClubs = async () => {
    try {
      const res = await api.get('/clubs/');
      setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllFieldsForAnalytics = async () => {
    try {
      let allFields: CustomField[] = [];
      let page = 1;
      const pageSize = 100;
      const maxPages = 100;

      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());

        const res: any = await api.get(`/custom-fields/?${params.toString()}`);
        const responseData: any = res?.data;

        if (!responseData) break;

        let pageFields: CustomField[] = [];

        if (Array.isArray(responseData)) {
          pageFields = responseData;
          allFields = [...allFields, ...pageFields];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageFields = responseData.results;
          allFields = [...allFields, ...pageFields];

          if (page === 1) {
            setTotalCount(responseData.count || pageFields.length);
          }

          if (!responseData.next || pageFields.length === 0) break;
        } else {
          break;
        }

        page++;
      }

      setAllFieldsForAnalytics(allFields);
    } catch (err) {
      console.error('Failed to fetch all fields for analytics:', err);
    }
  };

  const fetchFields = async () => {
    setLoading(true);
    try {
      // Get filters from URL
      const search = searchParams.get('search') || '';
      const fieldType = searchParams.get('field_type') || '';
      const context = searchParams.get('context') || '';
      const targetRole = searchParams.get('target_role') || '';
      const status = searchParams.get('status') || '';

      // Fetch ALL fields (backend doesn't support filtering, so we need all data for client-side filtering)
      let allFields: CustomField[] = [];
      let page = 1;
      const fetchPageSize = 100;
      const maxPages = 100;

      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', fetchPageSize.toString());

        const res: any = await api.get(`/custom-fields/?${params.toString()}`);
        const responseData: any = res?.data;

        if (!responseData) break;

        let pageFields: CustomField[] = [];

        if (Array.isArray(responseData)) {
          pageFields = responseData;
          allFields = [...allFields, ...pageFields];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageFields = responseData.results;
          allFields = [...allFields, ...pageFields];

          if (!responseData.next || pageFields.length === 0) break;
        } else {
          break;
        }

        page++;
      }

      // Apply ALL filters client-side (backend doesn't support these filters)
      let filteredFields = allFields;

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        filteredFields = filteredFields.filter(f => 
          f.name.toLowerCase().includes(searchLower) ||
          (f.help_text && f.help_text.toLowerCase().includes(searchLower))
        );
      }

      // Field type filter
      if (fieldType) {
        filteredFields = filteredFields.filter(f => f.field_type === fieldType);
      }

      // Context filter
      if (context) {
        filteredFields = filteredFields.filter(f => {
          // Handle fields that might not have context set (default to USER_PROFILE)
          const fieldContext = f.context || 'USER_PROFILE';
          return fieldContext === context;
        });
      }

      // Target role filter
      if (targetRole) {
        filteredFields = filteredFields.filter(f => f.target_roles.includes(targetRole));
      }

      // Status filter
      if (status) {
        filteredFields = filteredFields.filter(f => 
          status === 'active' ? f.is_published : !f.is_published
        );
      }

      // Set total count before pagination
      setTotalCount(filteredFields.length);

      // Apply pagination
      const currentPage = Number(searchParams.get('page')) || 1;
      const pageSize = 10;
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedFields = filteredFields.slice(startIndex, endIndex);

      setAllFields(paginatedFields);
    } catch (err: any) {
      console.error('Failed to fetch custom fields:', err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to load custom fields';
      setToast({ message: errorMessage, type: 'error', isVisible: true });
      setAllFields([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const fieldType = searchParams.get('field_type');
    const context = searchParams.get('context');
    const targetRole = searchParams.get('target_role');
    const status = searchParams.get('status');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (fieldType) params.set('field_type', fieldType);
    if (context) params.set('context', context);
    if (targetRole) params.set('target_role', targetRole);
    if (status) params.set('status', status);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const handleDelete = async () => {
    if (!fieldToDelete) return;
    try {
      await api.delete(`/custom-fields/${fieldToDelete.id}/`);
      setToast({ message: 'Field deleted', type: 'success', isVisible: true });
      fetchFields();
      fetchAllFieldsForAnalytics();
    } catch (err) {
      setToast({ message: 'Delete failed', type: 'error', isVisible: true });
    } finally {
      setFieldToDelete(null);
    }
  };

  // Calculate analytics from allFieldsForAnalytics
  const analytics = {
    total_fields: allFieldsForAnalytics.length,
    text_fields: allFieldsForAnalytics.filter(f => f.field_type === 'TEXT').length,
    single_select_fields: allFieldsForAnalytics.filter(f => f.field_type === 'SINGLE_SELECT').length,
    multi_select_fields: allFieldsForAnalytics.filter(f => f.field_type === 'MULTI_SELECT').length,
    boolean_fields: allFieldsForAnalytics.filter(f => f.field_type === 'BOOLEAN').length,
  };

  // Pagination info (fields are already paginated in fetchFields)
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedFields = allFields;

  // Check if field is editable by current user
  const isFieldEditable = (field: CustomField): boolean => {
    if (scope === 'CLUB' && user?.assigned_club) {
      const isOwnedByClubAdmin = field.owner_role === 'CLUB_ADMIN' && 
        (typeof field.club === 'object' ? field.club?.id : field.club) === (typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club);
      return isOwnedByClubAdmin;
    }
    
    if (scope === 'MUNICIPALITY' && user?.assigned_municipality) {
      const userMunicipalityId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
      const fieldMunicipalityId = typeof field.municipality === 'object' ? field.municipality?.id : field.municipality;
      
      const isOwnedByMunicipalityAdmin = field.owner_role === 'MUNICIPALITY_ADMIN' && 
        fieldMunicipalityId === userMunicipalityId;
      
      let isClubFieldInMunicipality = false;
      if (field.owner_role === 'CLUB_ADMIN' && field.club) {
        const fieldClubId = typeof field.club === 'object' ? field.club.id : field.club;
        const clubInMunicipality = clubs.find(c => c.id === fieldClubId);
        isClubFieldInMunicipality = !!clubInMunicipality;
      }
      
      return isOwnedByMunicipalityAdmin || isClubFieldInMunicipality;
    }
    
    return true; // Super admin can edit all
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Custom Fields</h1>
        <Link href={`${basePath}/create`} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 shadow">
          + Add Field
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
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: Total Fields */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Fields</h3>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_fields}</p>
              </div>

              {/* Card 2: Text Fields */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Text Fields</h3>
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.text_fields}</p>
              </div>

              {/* Card 3: Single Select Fields */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-purple-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Single Select</h3>
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.single_select_fields}</p>
              </div>

              {/* Card 4: Multi Select Fields */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-orange-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Multi Select</h3>
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.multi_select_fields}</p>
              </div>

              {/* Card 5: Boolean Fields */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-red-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Boolean Fields</h3>
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.boolean_fields}</p>
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
                  placeholder="Search by name or help text..." 
                  className="w-full border rounded p-2 text-sm bg-gray-50"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                />
              </div>

              {/* Field Type */}
              <div className="w-48">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Field Type</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={searchParams.get('field_type') || ''} 
                  onChange={e => updateUrl('field_type', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="TEXT">Text</option>
                  <option value="SINGLE_SELECT">Single Select</option>
                  <option value="MULTI_SELECT">Multi Select</option>
                  <option value="BOOLEAN">Boolean</option>
                </select>
              </div>

              {/* Context */}
              <div className="w-48">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Context</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={searchParams.get('context') || ''} 
                  onChange={e => updateUrl('context', e.target.value)}
                >
                  <option value="">All Contexts</option>
                  <option value="USER_PROFILE">User Profile</option>
                  <option value="EVENT">Event Booking</option>
                </select>
              </div>

              {/* Target Role */}
              <div className="w-40">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Role</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={searchParams.get('target_role') || ''} 
                  onChange={e => updateUrl('target_role', e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="YOUTH_MEMBER">Youth</option>
                  <option value="GUARDIAN">Guardian</option>
                </select>
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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

      {/* LIST */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-8 text-center">Loading...</div> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Label</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Roles</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedFields.map(field => {
                const isEditable = isFieldEditable(field);
                const isReadOnly = !isEditable;
                
                return (
                  <tr key={field.id} className={isReadOnly ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'}>
                    <td className={`px-6 py-4 font-medium ${isReadOnly ? 'text-gray-500' : 'text-gray-900'}`}>
                      {field.name}
                      {isReadOnly && <span className="ml-2 text-xs text-gray-400">(Read-only)</span>}
                    </td>
                    <td className={`px-6 py-4 text-sm ${isReadOnly ? 'text-gray-400' : 'text-gray-600'}`}>
                      {field.field_type.replace('_', ' ')}
                    </td>
                    <td className={`px-6 py-4 text-sm flex gap-1 ${isReadOnly ? 'opacity-50' : ''}`}>
                      {field.target_roles.map(r => (
                        <span key={r} className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                          {r === 'YOUTH_MEMBER' ? 'Youth' : 'Guardian'}
                        </span>
                      ))}
                    </td>
                    <td className={`px-6 py-4 ${isReadOnly ? 'opacity-50' : ''}`}>
                      {field.is_published 
                        ? <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">Active</span>
                        : <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">Draft</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {isReadOnly ? (
                          <span className="text-gray-400 text-sm italic">Read-only</span>
                        ) : (
                          <>
                            <Link 
                              href={buildUrlWithParams(`${basePath}/${field.id}`)} 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-900 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </Link>
                            <Link 
                              href={buildUrlWithParams(`${basePath}/edit/${field.id}`)} 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-900 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </Link>
                            <button 
                              onClick={() => setFieldToDelete(field)} 
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
                );
              })}
              {paginatedFields.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No custom fields found.</td></tr>
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
        isVisible={!!fieldToDelete}
        onClose={() => setFieldToDelete(null)}
        onConfirm={handleDelete}
        itemName={fieldToDelete?.name || 'this field'}
        message="Deleting this field will remove all data users have entered for it. This cannot be undone."
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}
