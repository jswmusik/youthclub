'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, BarChart3, ChevronUp, X, CheckCircle2, XCircle, Users, Building, MapPin } from 'lucide-react';
import api from '../../lib/api';
import Toast from './Toast';
import { getMediaUrl } from '../../app/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalCount = allFilteredRequests.length;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Group Applications</h1>
          <p className="text-gray-500 mt-1">Manage group membership requests and applications.</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {/* Card 1: Total Applications */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.totalApplications}</div>
              </CardContent>
            </Card>

            {/* Card 2: Applications Last Week */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Last Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.applicationsLastWeek}</div>
              </CardContent>
            </Card>

            {/* Card 3: Applications Last 30 Days */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Last 30 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.applicationsLast30Days}</div>
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <div className="p-4 space-y-4">
          {/* Main Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Search - Takes more space on larger screens */}
            <div className="relative md:col-span-4 lg:col-span-3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search by user name, email, or group name..." 
                className="pl-9 bg-gray-50 border-0"
                value={searchParams.get('search') || ''}
                onChange={e => updateUrl('search', e.target.value)}
              />
            </div>
            
            {/* Municipality Filter - Only for Super Admin */}
            {isSuperAdmin && (
              <div className="md:col-span-2 lg:col-span-2">
                <select 
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
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
            
            {/* Club Filter - For Super Admin and Municipality Admin */}
            {(isSuperAdmin || isMuniAdmin) && (
              <div className={cn("md:col-span-2", isSuperAdmin ? "lg:col-span-2" : "lg:col-span-3")}>
                <select 
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
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
      ) : requests.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">
              {searchParams.get('search') || searchParams.get('municipality') || searchParams.get('club')
                ? 'No applications found matching your filters.'
                : 'No pending applications found.'}
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {requests.map(req => (
              <Card key={req.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50 flex-shrink-0">
                      <AvatarImage src={getMediaUrl(req.user_avatar) || undefined} className="object-cover" />
                      <AvatarFallback className="rounded-full font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                        {getInitials(req.user_first_name, req.user_last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-[#121213] truncate">
                        {req.user_name || 'Unknown'}
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-500 truncate">
                        {req.user_email || ''}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Group</span>
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {req.group_name || 'Unknown Group'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Requested</span>
                      <span className="text-sm text-gray-600">
                        {req.joined_at ? new Date(req.joined_at).toLocaleDateString() : '-'}
                      </span>
                    </div>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 justify-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleAction(req.id, 'approve')}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleAction(req.id, 'reject')}
                    >
                      <XCircle className="h-4 w-4" />
                      Deny
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
                  <TableHead className="h-12 text-gray-600 font-semibold">User</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Applying To</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Requested</TableHead>
                  <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(req => (
                  <TableRow key={req.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-full border border-gray-200 bg-gray-50">
                          <AvatarImage src={getMediaUrl(req.user_avatar) || undefined} className="object-cover" />
                          <AvatarFallback className="rounded-full font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                            {getInitials(req.user_first_name, req.user_last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-[#121213]">{req.user_name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{req.user_email || ''}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {req.group_name || 'Unknown Group'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm text-gray-600">
                        {req.joined_at ? new Date(req.joined_at).toLocaleDateString() : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-3 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleAction(req.id, 'approve')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleAction(req.id, 'reject')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Deny
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

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

      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}