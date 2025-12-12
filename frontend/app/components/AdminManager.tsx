'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X, Users, ShieldCheck, Building, Building2 } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import ConfirmationModal from './ConfirmationModal';
import Toast from './Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface AdminManagerProps {
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

interface Option { id: number; name: string; }

export default function AdminManager({ basePath, scope }: AdminManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [allAdmins, setAllAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Dropdowns
  const [municipalities, setMunicipalities] = useState<Option[]>([]);
  const [clubs, setClubs] = useState<Option[]>([]);
  
  // Analytics
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  // Delete
  const [adminToDelete, setAdminToDelete] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [searchParams]);

  const fetchDropdowns = async () => {
    try {
      // Fetch municipalities for SUPER scope (for filtering) and for displaying assignment names
      if (scope === 'SUPER') {
        const muniRes = await api.get('/municipalities/');
        setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
      } else if (scope === 'MUNICIPALITY') {
        // For MUNICIPALITY scope, fetch municipalities to display assignment names
        // Backend will filter to only show the current user's municipality
        const muniRes = await api.get('/municipalities/');
        setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
      }
      const clubRes = await api.get('/clubs/?page_size=1000');
      setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const rolesToFetch = ['SUPER_ADMIN', 'MUNICIPALITY_ADMIN', 'CLUB_ADMIN'];
      const search = searchParams.get('search') || '';
      const roleFilter = searchParams.get('role') || '';
      const municipalityFilter = searchParams.get('assigned_municipality') || '';
      const clubFilter = searchParams.get('assigned_club') || '';
      
      if (scope === 'SUPER') {
        // For Super Admins: Fetch admin roles in parallel and combine
        // If role filter is set, only fetch that role, otherwise fetch all
        const rolesToFetchFiltered = roleFilter && rolesToFetch.includes(roleFilter) 
          ? [roleFilter] 
          : rolesToFetch;
        
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (municipalityFilter) params.set('assigned_municipality', municipalityFilter);
        if (clubFilter) params.set('assigned_club', clubFilter);
        params.set('page_size', '1000');
        
        // Fetch each admin role separately and combine
        const promises = rolesToFetchFiltered.map(role => {
          const roleParams = new URLSearchParams(params);
          roleParams.set('role', role);
          return api.get(`/users/?${roleParams.toString()}`);
        });
        
        const results = await Promise.all(promises);
        
        // Combine all admin users
        let combinedAdmins: any[] = [];
        results.forEach(res => {
          const data = Array.isArray(res.data) ? res.data : res.data.results || [];
          combinedAdmins = combinedAdmins.concat(data);
        });
        
        setAllAdmins(combinedAdmins);
        setTotalCount(combinedAdmins.length);
      } else {
        // For Municipality/Club scope: Fetch admin roles explicitly
        const allowedRoles = scope === 'MUNICIPALITY' 
          ? ['MUNICIPALITY_ADMIN', 'CLUB_ADMIN']
          : ['CLUB_ADMIN'];
        
        // If role filter is set and valid, only fetch that role
        const rolesToFetch = roleFilter && allowedRoles.includes(roleFilter)
          ? [roleFilter]
          : allowedRoles;
        
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (municipalityFilter) params.set('assigned_municipality', municipalityFilter);
        if (clubFilter) params.set('assigned_club', clubFilter);
        params.set('page_size', '1000');
        
        // Fetch each admin role separately and combine
        const promises = rolesToFetch.map(role => {
          const roleParams = new URLSearchParams(params);
          roleParams.set('role', role);
          return api.get(`/users/?${roleParams.toString()}`);
        });
        
        const results = await Promise.all(promises);
        
        // Combine all admin users
        let combinedAdmins: any[] = [];
        results.forEach(res => {
          const data = Array.isArray(res.data) ? res.data : res.data.results || [];
          combinedAdmins = combinedAdmins.concat(data);
        });
        
        setAllAdmins(combinedAdmins);
        setTotalCount(combinedAdmins.length);
      }
    } catch (err) {
      console.error(err);
      setAllAdmins([]);
      setTotalCount(0);
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
    const role = searchParams.get('role');
    const municipality = searchParams.get('assigned_municipality');
    const club = searchParams.get('assigned_club');
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    if (municipality) params.set('assigned_municipality', municipality);
    if (club) params.set('assigned_club', club);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const handleDelete = async () => {
    if (!adminToDelete) return;
    try {
      await api.delete(`/users/${adminToDelete.id}/`);
      setToast({ message: 'Admin deleted.', type: 'success', isVisible: true });
      fetchAdmins();
    } catch (err) {
      setToast({ message: 'Failed to delete.', type: 'error', isVisible: true });
    } finally {
      setAdminToDelete(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-red-50 text-red-700 border-red-200';
      case 'MUNICIPALITY_ADMIN': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'CLUB_ADMIN': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getInitials = (first?: string | null, last?: string | null) => {
    const firstInitial = first?.charAt(0)?.toUpperCase() || '';
    const lastInitial = last?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || '?';
  };

  // Calculate analytics from allAdmins
  const analytics = {
    total_admins: allAdmins.length,
    super_admins: allAdmins.filter((u: any) => u.role === 'SUPER_ADMIN').length,
    municipality_admins: allAdmins.filter((u: any) => u.role === 'MUNICIPALITY_ADMIN').length,
    club_admins: allAdmins.filter((u: any) => u.role === 'CLUB_ADMIN').length,
  };

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAdmins = allAdmins.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Manage Administrators</h1>
          <p className="text-gray-500 mt-1">Manage admin users and their permissions.</p>
        </div>
        <Link href={`${basePath}/create`}>
          <Button className="w-full sm:w-auto gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
            <Plus className="h-4 w-4" /> Add Admin
          </Button>
        </Link>
      </div>

      {/* Analytics */}
      {!loading && (
        <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="space-y-2">
          <Card className="border-0 shadow-sm bg-gray-900">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-400">Analytics Dashboard</h3>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0 h-8 text-gray-400 hover:text-white hover:bg-gray-800">
                  <ChevronUp className={cn(
                    "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                    analyticsExpanded ? "rotate-0" : "rotate-180"
                  )} />
                  <span className="sr-only">Toggle Analytics</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="transition-all duration-500 ease-in-out">
              <CardContent className="p-4 sm:p-6 transition-opacity duration-500 ease-in-out">
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${
                  scope === 'SUPER' ? 'lg:grid-cols-4' : 
                  scope === 'MUNICIPALITY' ? 'lg:grid-cols-3' : 
                  'lg:grid-cols-2'
                } gap-3 sm:gap-4`}>
                  {/* Card 1: Total Admins */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-white/90">Total Admins</CardTitle>
                        <div className="w-10 h-10 rounded-xl bg-[#4D4DA4]/30 flex items-center justify-center shadow-md">
                          <Users className="h-5 w-5 text-[#4D4DA4]" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{analytics.total_admins}</div>
                    </CardContent>
                  </Card>

                  {/* Card 2: Super Admins - Only show for SUPER scope */}
                  {scope === 'SUPER' && (
                    <Card className="bg-white/5 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-white/90">Super Admins</CardTitle>
                          <div className="w-10 h-10 rounded-xl bg-red-500/30 flex items-center justify-center shadow-md">
                            <ShieldCheck className="h-5 w-5 text-red-400" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-white">{analytics.super_admins}</div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Card 3: Municipality Admins - Hide for CLUB scope */}
                  {scope !== 'CLUB' && (
                    <Card className="bg-white/5 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-white/90">Municipality Admins</CardTitle>
                          <div className="w-10 h-10 rounded-xl bg-purple-500/30 flex items-center justify-center shadow-md">
                            <Building className="h-5 w-5 text-purple-400" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-white">{analytics.municipality_admins}</div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Card 4: Club Admins */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-white/90">Club Admins</CardTitle>
                        <div className="w-10 h-10 rounded-xl bg-green-500/30 flex items-center justify-center shadow-md">
                          <Building2 className="h-5 w-5 text-green-400" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{analytics.club_admins}</div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <div className="p-2 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search by name or email..." 
              className="pl-9 bg-gray-50 border-0"
              value={searchParams.get('search') || ''}
              onChange={e => updateUrl('search', e.target.value)}
            />
          </div>
          {(scope === 'SUPER' || scope === 'MUNICIPALITY') && (
            <div className="w-full sm:w-[180px]">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('role') || ''} 
                onChange={(e) => updateUrl('role', e.target.value)}
              >
                <option value="">All Roles</option>
                {scope === 'SUPER' && <option value="SUPER_ADMIN">Super Admin</option>}
                <option value="MUNICIPALITY_ADMIN">Municipality Admin</option>
                <option value="CLUB_ADMIN">Club Admin</option>
              </select>
            </div>
          )}
          {scope === 'SUPER' && (
            <div className="w-full sm:w-[200px]">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('assigned_municipality') || ''} 
                onChange={(e) => {
                  const value = e.target.value;
                  const params = new URLSearchParams(searchParams.toString());
                  if (value) {
                    params.set('assigned_municipality', value);
                  } else {
                    params.delete('assigned_municipality');
                  }
                  params.delete('assigned_club');
                  params.set('page', '1');
                  router.push(`${pathname}?${params.toString()}`);
                }}
              >
                <option value="">All Municipalities</option>
                {municipalities.map(m => (
                  <option key={m.id} value={m.id.toString()}>{m.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="w-full sm:w-[200px]">
            <select 
              className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
              value={searchParams.get('assigned_club') || ''} 
              onChange={(e) => updateUrl('assigned_club', e.target.value)}
            >
              <option value="">All Clubs</option>
              {clubs.map(c => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(pathname)}
            className="text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
          >
            <X className="h-4 w-4" /> Clear
          </Button>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex justify-center text-gray-400">
          <div className="animate-pulse">Loading...</div>
        </div>
      ) : paginatedAdmins.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">No admins found.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedAdmins.map(user => {
              const assignment = (() => {
                if (user.role === 'CLUB_ADMIN' && user.assigned_club) {
                  const clubId = typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club;
                  const club = clubs.find(c => c.id === clubId);
                  return club?.name || 'Club Assigned';
                }
                if (user.role === 'MUNICIPALITY_ADMIN' && user.assigned_municipality) {
                  const muniId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
                  const municipality = municipalities.find(m => m.id === muniId);
                  return municipality?.name || 'Municipality Assigned';
                }
                if (user.assigned_municipality) {
                  const muniId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
                  const municipality = municipalities.find(m => m.id === muniId);
                  return municipality?.name || 'Municipality Assigned';
                }
                if (user.assigned_club) {
                  const clubId = typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club;
                  const club = clubs.find(c => c.id === clubId);
                  return club?.name || 'Club Assigned';
                }
                return 'Global';
              })();

              return (
                <Card key={user.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50 flex-shrink-0">
                        <AvatarImage src={getMediaUrl(user.avatar) || undefined} className="object-cover" />
                        <AvatarFallback className="rounded-full font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                          {getInitials(user.first_name, user.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold text-[#121213] truncate">
                          {user.first_name} {user.last_name}
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-500 truncate">{user.email}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-xs text-gray-500 uppercase font-semibold">Role</span>
                        <Badge variant="outline" className={getRoleBadge(user.role)}>
                          {user.role.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-xs text-gray-500 uppercase font-semibold">Assignment</span>
                        <span className="text-gray-600 font-medium">{assignment}</span>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <Link href={buildUrlWithParams(`${basePath}/${user.id}`)} className="flex-1">
                        <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </Link>
                      <Link href={buildUrlWithParams(`${basePath}/edit/${user.id}`)} className="flex-1">
                        <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setAdminToDelete(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
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
                  <TableHead className="h-12 text-gray-600 font-semibold">User</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Role</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Assignment</TableHead>
                  <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAdmins.map(user => {
                  const assignment = (() => {
                    if (user.role === 'CLUB_ADMIN' && user.assigned_club) {
                      const clubId = typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club;
                      const club = clubs.find(c => c.id === clubId);
                      return club?.name || 'Club Assigned';
                    }
                    if (user.role === 'MUNICIPALITY_ADMIN' && user.assigned_municipality) {
                      const muniId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
                      const municipality = municipalities.find(m => m.id === muniId);
                      return municipality?.name || 'Municipality Assigned';
                    }
                    if (user.assigned_municipality) {
                      const muniId = typeof user.assigned_municipality === 'object' ? user.assigned_municipality.id : user.assigned_municipality;
                      const municipality = municipalities.find(m => m.id === muniId);
                      return municipality?.name || 'Municipality Assigned';
                    }
                    if (user.assigned_club) {
                      const clubId = typeof user.assigned_club === 'object' ? user.assigned_club.id : user.assigned_club;
                      const club = clubs.find(c => c.id === clubId);
                      return club?.name || 'Club Assigned';
                    }
                    return 'Global';
                  })();

                  return (
                    <TableRow key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 rounded-full border border-gray-200 bg-gray-50">
                            <AvatarImage src={getMediaUrl(user.avatar) || undefined} className="object-cover" />
                            <AvatarFallback className="rounded-full font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                              {getInitials(user.first_name, user.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-[#121213]">{user.first_name} {user.last_name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className={getRoleBadge(user.role)}>
                          {user.role.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-gray-600">{assignment}</TableCell>
                      <TableCell className="py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={buildUrlWithParams(`${basePath}/${user.id}`)}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={buildUrlWithParams(`${basePath}/edit/${user.id}`)}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setAdminToDelete(user)}
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

      <ConfirmationModal 
        isVisible={!!adminToDelete}
        onClose={() => setAdminToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Admin"
        message={`Are you sure you want to delete "${adminToDelete?.first_name} ${adminToDelete?.last_name}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        variant="danger"
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}