'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  MoreHorizontal, Plus, Search, MapPin, Phone, Mail, 
  Trash2, Edit, Eye, BarChart3, Filter, ChevronUp, ChevronDown,
  Building, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Modals
import ConfirmationModal from './ConfirmationModal';
import Toast from './Toast';

interface ClubManagerProps {
  basePath: string;
  scope: 'SUPER' | 'MUNICIPALITY';
}

export default function ClubManager({ basePath, scope }: ClubManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [clubs, setClubs] = useState<any[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  // Analytics State
  const [allClubsForAnalytics, setAllClubsForAnalytics] = useState<any[]>([]);
  const [allUsersForAnalytics, setAllUsersForAnalytics] = useState<any[]>([]);
  
  // Actions
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Filter State
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [municipalityFilter, setMunicipalityFilter] = useState(searchParams.get('municipality') || '');

  // Load Metadata
  useEffect(() => {
    if (scope === 'SUPER') {
        api.get('/municipalities/').then(res => {
            setMunicipalities(Array.isArray(res.data) ? res.data : res.data.results || []);
        });
    }
    fetchAllAnalyticsData();
  }, [scope]);

  // Debounced Search/Filter Update
  useEffect(() => {
    const timer = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) params.set('search', searchInput); else params.delete('search');
        if (municipalityFilter) params.set('municipality', municipalityFilter); else params.delete('municipality');
        params.set('page', '1'); 
        router.replace(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, municipalityFilter, router, pathname]); // Intentionally omitting searchParams

  // Fetch Data on URL Change
  useEffect(() => {
    fetchClubs();
  }, [searchParams]);

  const fetchAllAnalyticsData = async () => {
    // Simplified fetching for demo - in production consider dedicated analytics endpoints
    try {
      const clubRes = await api.get('/clubs/?page_size=100');
      setAllClubsForAnalytics(clubRes.data.results || []);
      
      const userRes = await api.get('/users/?role=YOUTH_MEMBER&page_size=100');
      setAllUsersForAnalytics(userRes.data.results || []);
    } catch (e) { console.error(e); }
  };

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      if (!params.has('page_size')) params.set('page_size', '10');
      
      const res = await api.get(`/clubs/?${params.toString()}`);
      if (Array.isArray(res.data)) {
        setClubs(res.data);
        setTotalCount(res.data.length);
      } else {
        setClubs(res.data.results || []);
        setTotalCount(res.data.count || 0);
      }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/clubs/${itemToDelete.id}/`);
      setToast({ message: 'Club deleted.', type: 'success', isVisible: true });
      fetchClubs();
      fetchAllAnalyticsData();
    } catch (err) {
      setToast({ message: 'Failed to delete club.', type: 'error', isVisible: true });
    } finally {
      setItemToDelete(null);
    }
  };

  const buildUrlWithParams = (path: string) => {
    const queryString = searchParams.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  // Analytics Calculations
  const analytics = {
    total: allClubsForAnalytics.length,
    avgMembers: (() => {
        if (!allClubsForAnalytics.length) return 0;
        // Mock calculation based on loaded users
        const assignedCount = allUsersForAnalytics.filter((u:any) => u.preferred_club).length;
        return (assignedCount / allClubsForAnalytics.length).toFixed(1);
    })()
  };

  // Pagination
  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = Math.ceil(totalCount / 10);
  const handlePageChange = (p: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', p.toString());
      router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Youth Clubs</h1>
          <p className="text-gray-500 mt-1">Manage youth centers and activity hubs.</p>
        </div>
        <Link href={`${basePath}/create`}>
          <Button className="w-full sm:w-auto gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
            <Plus className="h-4 w-4" /> Add Club
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
                  {/* Card 1: Total Clubs */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-white/90">Total Clubs</CardTitle>
                        <div className="w-10 h-10 rounded-xl bg-[#4D4DA4]/30 flex items-center justify-center shadow-md">
                          <Building className="h-5 w-5 text-[#4D4DA4]" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{analytics.total}</div>
                    </CardContent>
                  </Card>

                  {/* Card 2: Avg. Members */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-white/90">Avg. Members</CardTitle>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/30 flex items-center justify-center shadow-md">
                          <Users className="h-5 w-5 text-blue-400" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{analytics.avgMembers}</div>
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
              placeholder="Search clubs..." 
              className="pl-9 bg-gray-50 border-0"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
          {scope === 'SUPER' && (
            <div className="w-full sm:w-[200px]">
              {/* Native select for simplicity, can upgrade to shadcn Select later */}
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={municipalityFilter}
                onChange={e => setMunicipalityFilter(e.target.value)}
              >
                <option value="">All Municipalities</option>
                {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex justify-center text-gray-400">
          <div className="animate-pulse">Loading...</div>
        </div>
      ) : clubs.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">No clubs found.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {clubs.map((club) => (
              <Card key={club.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                   <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 flex-shrink-0">
                            <AvatarImage src={getMediaUrl(club.avatar)} className="object-cover" />
                            <AvatarFallback className="rounded-lg font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">C</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <CardTitle className="text-base font-semibold text-gray-900 truncate">{club.name}</CardTitle>
                            {scope === 'SUPER' && <CardDescription className="text-xs text-gray-500">{club.municipality_name}</CardDescription>}
                        </div>
                   </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                    <div className="grid grid-cols-2 gap-2 text-gray-600">
                        {club.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" /><span className="truncate text-xs">{club.email}</span></div>}
                        {club.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /><span className="truncate text-xs">{club.phone}</span></div>}
                    </div>
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <Link href={buildUrlWithParams(`${basePath}/${club.id}`)} className="flex-1">
                        <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </Link>
                      <Link href={buildUrlWithParams(`${basePath}/edit/${club.id}`)} className="flex-1">
                        <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setItemToDelete(club)}
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
                  <TableHead className="h-12 text-gray-600 font-semibold">Club Name</TableHead>
                  {scope === 'SUPER' && <TableHead className="h-12 text-gray-600 font-semibold">Municipality</TableHead>}
                  <TableHead className="h-12 text-gray-600 font-semibold">Contact</TableHead>
                  <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clubs.map((club) => (
                  <TableRow key={club.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 rounded-lg border border-gray-200 bg-gray-50">
                                <AvatarImage src={getMediaUrl(club.avatar)} className="object-cover" />
                                <AvatarFallback className="rounded-lg font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">C</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-gray-900">{club.name}</span>
                        </div>
                    </TableCell>
                    {scope === 'SUPER' && <TableCell className="text-gray-600">{club.municipality_name}</TableCell>}
                    <TableCell>
                        <div className="text-sm text-gray-600">
                            {club.email && <div>{club.email}</div>}
                            {club.phone && <div className="text-xs text-gray-400">{club.phone}</div>}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                           <Link href={buildUrlWithParams(`${basePath}/${club.id}`)}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100"><Eye className="h-4 w-4" /></Button>
                           </Link>
                           <Link href={buildUrlWithParams(`${basePath}/edit/${club.id}`)}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100"><Edit className="h-4 w-4" /></Button>
                           </Link>
                           <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50" onClick={() => setItemToDelete(club)}>
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
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>Prev</Button>
                <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => handlePageChange(currentPage + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      <ConfirmationModal 
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Club"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This will permanently delete the club and its data.`}
        variant="danger"
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}
