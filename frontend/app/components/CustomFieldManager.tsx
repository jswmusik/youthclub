'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Toast from './Toast';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
  
  const [clubs, setClubs] = useState<any[]>([]);
  const [fieldToDelete, setFieldToDelete] = useState<CustomField | null>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

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

  const getFieldTypeLabel = (type: string) => {
    return type.replace('_', ' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Manage Custom Fields</h1>
          <p className="text-gray-500 mt-1">Manage custom fields and their configurations.</p>
        </div>
        <Link href={`${basePath}/create`}>
          <Button className="w-full sm:w-auto gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
            <Plus className="h-4 w-4" /> Add Field
          </Button>
        </Link>
      </div>

      {/* Analytics */}
      {!loading && (
        <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-500">Analytics</h3>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0 h-8">
                <ChevronUp className={cn(
                  "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                  analyticsExpanded ? "rotate-0" : "rotate-180"
                )} />
                <span className="sr-only">Toggle Analytics</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
              {/* Card 1: Total Fields */}
              <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Fields</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total_fields}</div>
                </CardContent>
              </Card>

              {/* Card 2: Text Fields */}
              <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Text Fields</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.text_fields}</div>
                </CardContent>
              </Card>

              {/* Card 3: Single Select Fields */}
              <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Single Select</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.single_select_fields}</div>
                </CardContent>
              </Card>

              {/* Card 4: Multi Select Fields */}
              <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Multi Select</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.multi_select_fields}</div>
                </CardContent>
              </Card>

              {/* Card 5: Boolean Fields */}
              <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Boolean Fields</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.boolean_fields}</div>
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <div className="p-4 space-y-4">
          {/* Main Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Search - Takes more space on larger screens */}
            <div className="relative md:col-span-4 lg:col-span-3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search by name or help text..." 
                className="pl-9 bg-gray-50 border-0"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
            </div>
            
            {/* Field Type Filter */}
            <div className="md:col-span-2 lg:col-span-2">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
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
            
            {/* Context Filter */}
            <div className="md:col-span-2 lg:col-span-2">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('context') || ''} 
                onChange={e => updateUrl('context', e.target.value)}
              >
                <option value="">All Contexts</option>
                <option value="USER_PROFILE">User Profile</option>
                <option value="EVENT">Event Booking</option>
              </select>
            </div>
            
            {/* Target Role Filter */}
            <div className="md:col-span-2 lg:col-span-2">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('target_role') || ''} 
                onChange={e => updateUrl('target_role', e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="YOUTH_MEMBER">Youth</option>
                <option value="GUARDIAN">Guardian</option>
              </select>
            </div>
            
            {/* Status Filter */}
            <div className="md:col-span-2 lg:col-span-2">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('status') || ''} 
                onChange={e => updateUrl('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            {/* Clear Button */}
            <div className="md:col-span-2 lg:col-span-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(pathname)}
                className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
              >
                <X className="h-4 w-4" /> Clear
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex justify-center text-gray-400">
          <div className="animate-pulse">Loading...</div>
        </div>
      ) : paginatedFields.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">No custom fields found.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedFields.map(field => {
              const isEditable = isFieldEditable(field);
              const isReadOnly = !isEditable;
              
              return (
                <Card key={field.id} className={cn(
                  "overflow-hidden border-l-4 shadow-sm",
                  isReadOnly ? "border-l-gray-300 opacity-60" : "border-l-[#4D4DA4]"
                )}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-[#121213] truncate">
                        {field.name}
                        {isReadOnly && <span className="ml-2 text-xs text-gray-400 font-normal">(Read-only)</span>}
                      </CardTitle>
                      <p className="text-xs text-gray-500 mt-1 truncate">{field.help_text || 'No description'}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-xs text-gray-500 uppercase font-semibold">Type</span>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {getFieldTypeLabel(field.field_type)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-xs text-gray-500 uppercase font-semibold">Roles</span>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {field.target_roles.map(r => (
                            <Badge key={r} variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                              {r === 'YOUTH_MEMBER' ? 'Youth' : 'Guardian'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-xs text-gray-500 uppercase font-semibold">Status</span>
                        <Badge 
                          variant="outline" 
                          className={field.is_published 
                            ? "text-xs bg-green-50 text-green-700 border-green-200" 
                            : "text-xs bg-gray-50 text-gray-600 border-gray-200"
                          }
                        >
                          {field.is_published ? 'Active' : 'Draft'}
                        </Badge>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    {!isReadOnly && (
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <Link href={buildUrlWithParams(`${basePath}/${field.id}`)} className="flex-1">
                          <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </Link>
                        <Link href={buildUrlWithParams(`${basePath}/edit/${field.id}`)} className="flex-1">
                          <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setFieldToDelete(field)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    )}
                    {isReadOnly && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-400 italic text-center">Read-only field</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* DESKTOP: Table */}
          <Card className="hidden md:block border border-gray-100 shadow-sm bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                  <TableHead className="h-12 text-gray-600 font-semibold">Label</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Type</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Roles</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Status</TableHead>
                  <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFields.map(field => {
                  const isEditable = isFieldEditable(field);
                  const isReadOnly = !isEditable;
                  
                  return (
                    <TableRow 
                      key={field.id} 
                      className={cn(
                        "border-b border-gray-50 transition-colors",
                        isReadOnly ? "opacity-60 bg-gray-50/50" : "hover:bg-gray-50/50"
                      )}
                    >
                      <TableCell className="py-4">
                        <div>
                          <div className={cn(
                            "font-semibold",
                            isReadOnly ? "text-gray-500" : "text-[#121213]"
                          )}>
                            {field.name}
                            {isReadOnly && <span className="ml-2 text-xs text-gray-400 font-normal">(Read-only)</span>}
                          </div>
                          {field.help_text && (
                            <div className="text-xs text-gray-500 mt-1 truncate max-w-md">
                              {field.help_text}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {getFieldTypeLabel(field.field_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-wrap items-center gap-1">
                          {field.target_roles.map(r => (
                            <Badge key={r} variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                              {r === 'YOUTH_MEMBER' ? 'Youth' : 'Guardian'}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge 
                          variant="outline" 
                          className={field.is_published 
                            ? "text-xs bg-green-50 text-green-700 border-green-200" 
                            : "text-xs bg-gray-50 text-gray-600 border-gray-200"
                          }
                        >
                          {field.is_published ? 'Active' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        {isReadOnly ? (
                          <span className="text-sm text-gray-400 italic">Read-only</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Link href={buildUrlWithParams(`${basePath}/${field.id}`)}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={buildUrlWithParams(`${basePath}/edit/${field.id}`)}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setFieldToDelete(field)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1} 
                onClick={() => updateUrl('page', (currentPage - 1).toString())}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                Prev
              </Button>
              <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage >= totalPages} 
                onClick={() => updateUrl('page', (currentPage + 1).toString())}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                Next
              </Button>
            </div>
          )}
        </>
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
