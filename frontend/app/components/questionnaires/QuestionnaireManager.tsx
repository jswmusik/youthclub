'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X, FileText, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { questionnaireApi } from '../../../lib/questionnaire-api';
import api from '../../../lib/api';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import Toast from '../Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
      
      setClubs(allClubs);
    } catch (err) {
      console.error('Failed to fetch clubs:', err);
      setClubs([]);
    }
  };

  // Fetch municipalities and clubs once on mount for SUPER admins
  useEffect(() => {
    if (scope === 'SUPER') {
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
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      }
    }
    
    // If it's DRAFT but has a scheduled publish date, show as SCHEDULED
    if (status === 'DRAFT' && scheduledPublishDate) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    
    switch (status) {
      case 'PUBLISHED': return 'bg-green-50 text-green-700 border-green-200';
      case 'DRAFT': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'ARCHIVED': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#121213]">Manage Questionnaires</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Create and manage questionnaires for your organization.</p>
        </div>
        <Link href={`${basePath}/create`} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
            <Plus className="h-4 w-4" /> Create New
          </Button>
        </Link>
      </div>

      {/* Analytics */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-2">
            {/* Card 1: Total Created */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Created</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total_created}</div>
              </CardContent>
            </Card>

            {/* Card 2: Completed */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total_completed}</div>
              </CardContent>
            </Card>

            {/* Card 3: Started */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Started</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total_started}</div>
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Main Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 items-end">
            {/* Search - Takes more space on larger screens */}
            <div className="relative md:col-span-4 lg:col-span-3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search by title..." 
                className="pl-9 bg-gray-50 border-0"
                value={searchParams.get('search') || ''} 
                onChange={e => updateUrl('search', e.target.value)}
              />
            </div>
            
            {/* Status Filter */}
            <div className="md:col-span-2 lg:col-span-2">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('status') || ''} 
                onChange={e => updateUrl('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            
            {/* Municipality Filter - Only for SUPER scope */}
            {scope === 'SUPER' && (
              <div className="md:col-span-2 lg:col-span-2">
                <select 
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
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
            
            {/* Club Filter - Only for SUPER scope */}
            {scope === 'SUPER' && (
              <div className={cn("md:col-span-2", scope === 'SUPER' && municipalities.length > 0 ? "lg:col-span-2" : "lg:col-span-3")}>
                <select 
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
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
      ) : items.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">No questionnaires found.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {items.map((q) => (
              <Card key={q.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3 px-4 pt-4">
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`${basePath}/${q.id}/analytics${searchParams.get('page') ? `?page=${searchParams.get('page')}` : ''}`}
                      className="block"
                    >
                      <CardTitle className="text-base font-semibold text-[#121213] break-words hover:text-[#4D4DA4] transition-colors">
                        {q.title}
                      </CardTitle>
                    </Link>
                    {q.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 break-words">{q.description}</p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 px-4 pb-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Status</span>
                      <Badge variant="outline" className={getStatusBadge(q.status, q.scheduled_publish_date, q.expiration_date)}>
                        {getStatusDisplay(q.status, q.scheduled_publish_date, q.expiration_date)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Expires</span>
                      <span className="text-gray-900 font-medium">
                        {q.expiration_date ? new Date(q.expiration_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Responses</span>
                      <span className="text-gray-900 font-medium">
                        {q.response_count || 0} completed
                      </span>
                    </div>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Link href={`${basePath}/${q.id}/analytics${searchParams.get('page') ? `?page=${searchParams.get('page')}` : ''}`} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    <Link href={`${basePath}/edit/${q.id}${searchParams.get('page') ? `?page=${searchParams.get('page')}` : ''}`} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setItemToDelete(q)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* DESKTOP: Table */}
          <Card className="hidden md:block border border-gray-100 shadow-sm bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                  <TableHead className="h-12 text-gray-600 font-semibold">Title</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Status</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Expires</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Responses</TableHead>
                  <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((q) => (
                  <TableRow key={q.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div>
                        <Link 
                          href={`${basePath}/${q.id}/analytics${searchParams.get('page') ? `?page=${searchParams.get('page')}` : ''}`}
                          className="font-semibold text-[#121213] hover:text-[#4D4DA4] transition-colors"
                        >
                          {q.title}
                        </Link>
                        {q.description && (
                          <div className="text-xs text-gray-500 mt-1 truncate max-w-md">
                            {q.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={getStatusBadge(q.status, q.scheduled_publish_date, q.expiration_date)}>
                        {getStatusDisplay(q.status, q.scheduled_publish_date, q.expiration_date)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm text-gray-900">
                        {q.expiration_date ? new Date(q.expiration_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm text-gray-900">
                        <span className="font-semibold">{q.response_count || 0}</span>{' '}
                        <span className="text-gray-500">completed</span>
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`${basePath}/${q.id}/analytics${searchParams.get('page') ? `?page=${searchParams.get('page')}` : ''}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {q.status === 'DRAFT' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleTogglePublish(q)}
                            title="Publish questionnaire"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {q.status === 'PUBLISHED' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                            onClick={() => handleTogglePublish(q)}
                            title="Unpublish questionnaire"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        )}
                        <Link href={`${basePath}/edit/${q.id}${searchParams.get('page') ? `?page=${searchParams.get('page')}` : ''}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setItemToDelete(q)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        itemName={itemToDelete?.title}
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}
