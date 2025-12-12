'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';
import { getMediaUrl } from '../../utils';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import { Calendar, Clock, Edit, Trash2, Plus, Search, BarChart3, ChevronUp, Package, CheckCircle, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface BookingResourceManagerProps {
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB'; // Added Scope
}

export default function BookingResourceManager({ basePath, scope }: BookingResourceManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [resources, setResources] = useState<any[]>([]);
  const [allResources, setAllResources] = useState<any[]>([]); // For analytics
  const [clubs, setClubs] = useState<any[]>([]); // For Filter
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchDropdowns();
    fetchAllResourcesForAnalytics();
  }, []);

  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1');
    setCurrentPage(page);
    fetchResources();
  }, [searchParams]);

  const fetchDropdowns = async () => {
    if (scope === 'CLUB') return; // Club admins don't need to filter clubs
    try {
        // API automatically filters clubs based on user role (Muni Admin gets their muni's clubs)
        const res = await api.get('/clubs/?page_size=100'); 
        setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
        console.error(err);
    }
  };

  const fetchAllResourcesForAnalytics = async () => {
    try {
      let allResources: any[] = [];
      let page = 1;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/bookings/resources/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) break;
        
        let pageResources: any[] = [];
        
        if (Array.isArray(responseData)) {
          pageResources = responseData;
          allResources = [...allResources, ...pageResources];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageResources = responseData.results;
          allResources = [...allResources, ...pageResources];
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const gotEmptyPage = pageResources.length === 0;
          
          if (!hasNext || gotEmptyPage) break;
          page++;
        } else {
          break;
        }
      }
      
      setAllResources(allResources);
      console.log('Analytics resources fetched:', allResources.length);
    } catch (err) {
      console.error('Error fetching resources for analytics:', err);
      setAllResources([]);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Get filters from URL
      const search = searchParams.get('search') || '';
      const club = searchParams.get('club') || '';
      const resourceType = searchParams.get('resource_type') || '';
      const page = searchParams.get('page') || '1';
      
      if (search) params.set('search', search);
      if (club) params.set('club', club);
      if (resourceType) params.set('resource_type', resourceType);
      
      params.set('page', page);
      params.set('page_size', pageSize.toString());
      
      const res = await api.get(`/bookings/resources/?${params.toString()}`);
      const data = res.data;
      
      const results = Array.isArray(data) ? data : data.results || [];
      setResources(results);
      
      // Update pagination info
      if (data.count !== undefined) {
        setTotalCount(data.count);
        setTotalPages(Math.ceil(data.count / pageSize));
      } else {
        setTotalCount(results.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error(err);
      setResources([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.set('page', '1'); // Reset to page 1 when filters change
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/bookings/resources/${itemToDelete.id}/`);
      fetchResources();
      setItemToDelete(null);
    } catch (err) {
      alert('Failed to delete resource');
    }
  };

  // Calculate analytics
  const analytics = {
    total: allResources.length,
    active: allResources.filter((r: any) => r.is_active).length,
    inactive: allResources.filter((r: any) => !r.is_active).length,
  };

  // Determine the bookings dashboard and calendar paths based on basePath
  const bookingsPath = basePath.replace('/resources', '');
  const calendarPath = `${bookingsPath}/calendar`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Manage Resources</h1>
          <p className="text-gray-500 mt-1">Manage booking resources (rooms and equipment).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={bookingsPath}>
            <Button variant="outline" className="gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
              <Calendar className="h-4 w-4" />
              Bookings Dashboard
            </Button>
          </Link>
          <Link href={calendarPath}>
            <Button variant="outline" className="gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
              <Calendar className="h-4 w-4" />
              Calendar
            </Button>
          </Link>
          <Link href={`${basePath}/create`}>
            <Button className="gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
              <Plus className="h-4 w-4" /> New Resource
            </Button>
          </Link>
        </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Card 1: Total Resources */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total}</div>
              </CardContent>
            </Card>

            {/* Card 2: Total Active */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{analytics.active}</div>
              </CardContent>
            </Card>

            {/* Card 3: Total Inactive */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Inactive</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{analytics.inactive}</div>
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Filters */}
      <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded} className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-500">Filters</h3>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0 h-8">
              <ChevronUp className={cn(
                "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                filtersExpanded ? "rotate-0" : "rotate-180"
              )} />
              <span className="sr-only">Toggle Filters</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-2">
          <Card className="border border-gray-100 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                {/* Search */}
                <div className="relative md:col-span-4 lg:col-span-3">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search resources..." 
                    className="pl-9 bg-gray-50 border-0"
                    value={searchParams.get('search') || ''}
                    onChange={e => updateUrl('search', e.target.value)}
                  />
                </div>
                
                {/* Scope-based Club Filter */}
                {(scope === 'MUNICIPALITY' || scope === 'SUPER') && (
                  <div className="md:col-span-2 lg:col-span-2">
                    <select 
                      className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                      onChange={e => updateUrl('club', e.target.value)}
                      value={searchParams.get('club') || ''}
                    >
                      <option value="">All Clubs</option>
                      {clubs.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Resource Type Filter */}
                <div className="md:col-span-2 lg:col-span-2">
                  <select 
                    className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                    onChange={e => updateUrl('resource_type', e.target.value)}
                    value={searchParams.get('resource_type') || ''}
                  >
                    <option value="">All Types</option>
                    <option value="ROOM">Rooms</option>
                    <option value="EQUIPMENT">Equipment</option>
                  </select>
                </div>

                {/* Clear Filters Button */}
                {(searchParams.get('search') || searchParams.get('club') || searchParams.get('resource_type')) && (
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
                )}
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex justify-center text-gray-400">
          <div className="animate-pulse">Loading...</div>
        </div>
      ) : resources.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">No resources found.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Table */}
          <Card className="hidden md:block border border-gray-100 shadow-sm bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                  <TableHead className="h-12 text-gray-600 font-semibold">Resource</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Type</TableHead>
                  {scope !== 'CLUB' && (
                    <TableHead className="h-12 text-gray-600 font-semibold">Club</TableHead>
                  )}
                  <TableHead className="h-12 text-gray-600 font-semibold">Status</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Description</TableHead>
                  <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map(res => {
                  const imageUrl = res.image ? getMediaUrl(res.image) : null;
                  return (
                    <TableRow key={res.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={res.name}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-[#EBEBFE]/30 flex items-center justify-center border border-gray-200">
                              <Package className="h-6 w-6 text-[#4D4DA4]" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-[#121213]">{res.name}</div>
                            <div className="text-xs text-gray-500">
                              Max {res.max_participants} {res.max_participants === 1 ? 'person' : 'people'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="bg-[#EBEBFE] text-[#4D4DA4] border-[#EBEBFE]">
                          {res.resource_type}
                        </Badge>
                      </TableCell>
                      {scope !== 'CLUB' && (
                        <TableCell className="py-4">
                          <span className="text-sm text-gray-700">{res.club_name || '-'}</span>
                        </TableCell>
                      )}
                      <TableCell className="py-4">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "border",
                            res.is_active 
                              ? "bg-green-50 text-green-700 border-green-200" 
                              : "bg-red-50 text-red-700 border-red-200"
                          )}
                        >
                          {res.is_active ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <p className="text-sm text-gray-600 line-clamp-2 max-w-md">
                          {res.description || <span className="text-gray-400 italic">No description</span>}
                        </p>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`${basePath}/${res.id}/schedule`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                              <Clock className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`${basePath}/edit/${res.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setItemToDelete(res)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
        isVisible={!!itemToDelete} 
        onClose={() => setItemToDelete(null)} 
        onConfirm={handleDelete} 
        itemName={itemToDelete?.name} 
      />
    </div>
  );
}