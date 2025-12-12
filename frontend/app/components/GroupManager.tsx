'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X, Users, Building } from 'lucide-react';
import api from '../../lib/api';
import Toast from './Toast';
import ConfirmationModal from './ConfirmationModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface Group {
  id: number;
  name: string;
  group_type: 'OPEN' | 'APPLICATION' | 'CLOSED';
  is_system_group: boolean;
  member_count?: number; // Optional in case API doesn't return it
  pending_request_count?: number; // Optional in case API doesn't return it
  created_at: string;
  municipality: number | null;
  municipality_name?: string;
  club: number | null;
  club_name?: string;
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
  
  // Determine admin type from basePath
  const isSuperAdmin = basePath.includes('/super');
  const isMuniAdmin = basePath.includes('/municipality');
  
  // Dropdowns
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  
  // Stats - calculated from all groups for analytics
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalMembers: 0,
    activeGroups: 0,
    emptyGroups: 0
  });
  
  // Calculate stats from all groups (for analytics)
  useEffect(() => {
    const totalMembers = allGroups.reduce((sum, g) => {
      const count = g.member_count ?? 0;
      return sum + (typeof count === 'number' ? count : 0);
    }, 0);
    const activeGroups = allGroups.filter(g => {
      const count = g.member_count ?? 0;
      return typeof count === 'number' && count > 0;
    }).length;
    
    setStats({
      totalGroups: allGroups.length,
      totalMembers,
      activeGroups,
      emptyGroups: allGroups.length - activeGroups
    });
  }, [allGroups]);

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
    
    // Apply pagination
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedGroups = filtered.slice(startIndex, endIndex);
    
    setGroups(paginatedGroups);
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
      case 'OPEN': return 'bg-green-50 text-green-700 border-green-200';
      case 'APPLICATION': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CLOSED': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(allFilteredGroups.length / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Manage Groups</h1>
          <p className="text-gray-500 mt-1">Manage member segments and filters.</p>
        </div>
        <Link href={`${basePath}/create`}>
          <Button className="w-full sm:w-auto gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
            <Plus className="h-4 w-4" /> Add Group
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {/* Card 1: Total Groups */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{stats.totalGroups || 0}</div>
              </CardContent>
            </Card>

            {/* Card 2: Total Members */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{stats.totalMembers || 0}</div>
              </CardContent>
            </Card>

            {/* Card 3: Active Groups */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Active Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{stats.activeGroups || 0}</div>
              </CardContent>
            </Card>

            {/* Card 4: Empty Groups */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Empty Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{stats.emptyGroups || 0}</div>
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
                placeholder="Search by name..." 
                className="pl-9 bg-gray-50 border-0"
                value={searchParams.get('search') || ''}
                onChange={e => updateUrl('search', e.target.value)}
              />
            </div>
            
            {/* Municipality Filter - Only for SUPER scope */}
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
            
            {/* Club Filter */}
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
            
            {/* Type Filter */}
            <div className={cn("md:col-span-2", (isSuperAdmin || isMuniAdmin) ? "lg:col-span-2" : "lg:col-span-3")}>
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('type') || ''} 
                onChange={e => updateUrl('type', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="OPEN">Open</option>
                <option value="APPLICATION">Application</option>
                <option value="CLOSED">Closed</option>
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
      ) : groups.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">
              {searchParams.get('search') || searchParams.get('municipality') || searchParams.get('club') || searchParams.get('type')
                ? 'No groups found matching your filters.'
                : 'No groups found. Create your first group to get started.'}
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {groups.map(group => (
              <Card key={group.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full border border-gray-200 bg-[#EBEBFE] flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-[#4D4DA4]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-[#121213] truncate">
                        {group.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-500 truncate flex items-center gap-1">
                        {group.is_system_group && (
                          <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                            System
                          </Badge>
                        )}
                        {isSuperAdmin && group.municipality_name && (
                          <>
                            <Building className="h-3 w-3 flex-shrink-0" />
                            {group.municipality_name}
                          </>
                        )}
                        {(isSuperAdmin || isMuniAdmin) && group.club_name && (
                          <>
                            <Building className="h-3 w-3 flex-shrink-0" />
                            {group.club_name}
                          </>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Type</span>
                      <Badge variant="outline" className={getBadgeStyle(group.group_type)}>
                        {group.group_type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Members</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {group.member_count ?? 0} members
                        </Badge>
                        {group.pending_request_count > 0 && (
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                            {group.pending_request_count} pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Link href={buildUrlWithParams(`${basePath}/${group.id}`)} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    {!group.is_system_group && (
                      <>
                        <Link href={buildUrlWithParams(`${basePath}/edit/${group.id}`)} className="flex-1">
                          <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="flex-1 justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => { setSelectedGroup(group); setShowDelete(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </>
                    )}
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
                  <TableHead className="h-12 text-gray-600 font-semibold">Group Name</TableHead>
                  {isSuperAdmin && <TableHead className="h-12 text-gray-600 font-semibold">Municipality</TableHead>}
                  {(isSuperAdmin || isMuniAdmin) && <TableHead className="h-12 text-gray-600 font-semibold">Club</TableHead>}
                  <TableHead className="h-12 text-gray-600 font-semibold">Type</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Members</TableHead>
                  <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map(group => (
                  <TableRow key={group.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full border border-gray-200 bg-[#EBEBFE] flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-[#4D4DA4]" />
                        </div>
                        <div>
                          <div className="font-semibold text-[#121213]">{group.name}</div>
                          {group.is_system_group && (
                            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 mt-1">
                              System
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="py-4">
                        <div className="text-sm text-gray-500">{group.municipality_name || '-'}</div>
                      </TableCell>
                    )}
                    {(isSuperAdmin || isMuniAdmin) && (
                      <TableCell className="py-4">
                        <div className="text-sm text-gray-500">{group.club_name || '-'}</div>
                      </TableCell>
                    )}
                    <TableCell className="py-4">
                      <Badge variant="outline" className={getBadgeStyle(group.group_type)}>
                        {group.group_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-gray-900 font-medium">{group.member_count ?? 0}</span>
                        {group.pending_request_count > 0 && (
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                            {group.pending_request_count} pending
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={buildUrlWithParams(`${basePath}/${group.id}`)}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {!group.is_system_group && (
                          <>
                            <Link href={buildUrlWithParams(`${basePath}/edit/${group.id}`)}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => { setSelectedGroup(group); setShowDelete(true); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
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

      <ConfirmationModal 
        isVisible={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Group"
        message={`Are you sure you want to delete "${selectedGroup?.name}"? This will remove all members from this group. This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        variant="danger"
      />

      <Toast {...toast} onClose={() => setToast({ ...toast, isVisible: false })} />
    </div>
  );
}