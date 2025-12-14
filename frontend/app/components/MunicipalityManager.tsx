'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  MoreHorizontal, Plus, Search, MapPin, Globe, 
  Trash2, Edit, Eye, Filter, BarChart3, ChevronDown, ChevronUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Modals
import ConfirmationModal from './ConfirmationModal';
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
  
  // Analytics data
  const [allMunicipalitiesForAnalytics, setAllMunicipalitiesForAnalytics] = useState<any[]>([]);
  
  // Delete
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Inputs
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [countryFilter, setCountryFilter] = useState(searchParams.get('country') || '');

  useEffect(() => {
    api.get('/countries/').then(res => {
        setCountries(Array.isArray(res.data) ? res.data : res.data.results || []);
    });
    fetchAllMunicipalitiesForAnalytics();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) params.set('search', searchInput); else params.delete('search');
        if (countryFilter) params.set('country', countryFilter); else params.delete('country');
        params.set('page', '1'); // Reset page on filter change
        router.replace(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, countryFilter, router, pathname]);

  useEffect(() => {
    fetchData();
  }, [searchParams]);

  const fetchAllMunicipalitiesForAnalytics = async () => {
    try {
      // Simple fetch for analytics (limiting to first 100 for performance demo)
      const res = await api.get('/municipalities/?page_size=100');
      const data = res.data.results || (Array.isArray(res.data) ? res.data : []);
      setAllMunicipalitiesForAnalytics(data);
    } catch (err) { console.error(err); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      if (!params.has('page_size')) params.set('page_size', '10');
      
      const res = await api.get(`/municipalities/?${params.toString()}`);
      if (Array.isArray(res.data)) {
        setMunicipalities(res.data);
        setTotalCount(res.data.length);
      } else {
        setMunicipalities(res.data.results || []);
        setTotalCount(res.data.count || 0);
      }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
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

  const buildUrlWithParams = (path: string) => {
    const queryString = searchParams.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const analytics = {
    total: allMunicipalitiesForAnalytics.length,
    active: allMunicipalitiesForAnalytics.filter((m: any) => m.allow_self_registration).length
  };

  // Pagination
  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = Math.ceil(totalCount / 10);
  const handlePageChange = (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', newPage.toString());
      router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Municipalities</h1>
          <p className="text-gray-500 mt-1.5 text-sm">Manage regions and local settings.</p>
        </div>
        <Link href={`${basePath}/create`}>
          <Button className="w-full sm:w-auto gap-2 bg-[#4D4DA4] hover:bg-[#4D4DA4]/90 text-white rounded-full transition-colors">
            <Plus className="h-4 w-4" /> Add Municipality
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
                <h3 className="text-sm font-semibold text-white drop-shadow-[0_0_8px_rgba(77,77,164,0.6)]" style={{ textShadow: '0 0 8px rgba(255, 84, 133, 0.4), 0 0 12px rgba(77, 77, 164, 0.3)' }}>
                  Analytics Dashboard
                </h3>
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
              <CardContent className="p-4 sm:p-6 pt-3 transition-opacity duration-500 ease-in-out">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
                  {/* Card 1: Total Municipalities */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-[#4D4DA4]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                    style={{
                      boxShadow: '0 4px 20px rgba(77, 77, 164, 0.3), 0 0 20px rgba(255, 84, 133, 0.2)',
                    }}>
                    <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4D4DA4] to-[#FF5485] flex items-center justify-center shadow-lg"
                          style={{
                            boxShadow: '0 4px 15px rgba(77, 77, 164, 0.5), 0 0 20px rgba(255, 84, 133, 0.3)',
                          }}>
                          <MapPin className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-sm font-medium text-white/90">Total Municipalities</CardTitle>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.total}</div>
                    </div>
                  </Card>

                  {/* Card 2: Open for Registration */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-[#10B981]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                    style={{
                      boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3), 0 0 20px rgba(16, 185, 129, 0.2)',
                    }}>
                    <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center shadow-lg"
                          style={{
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.5), 0 0 20px rgba(16, 185, 129, 0.3)',
                          }}>
                          <Globe className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-sm font-medium text-white/90">Open for Registration</CardTitle>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.active}</div>
                    </div>
                  </Card>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <div className="px-6 py-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search municipalities..." 
              className="pl-9 bg-gray-50 border-0"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-[200px]">
            {/* Native select for simplicity, can upgrade to shadcn Select later */}
            <select 
              className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
              value={countryFilter}
              onChange={e => setCountryFilter(e.target.value)}
            >
              <option value="">All Countries</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* CONTENT */}
      {loading ? (
        <div className="py-20 flex justify-center text-gray-400">
          <div className="animate-pulse">Loading...</div>
        </div>
      ) : municipalities.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">No municipalities found.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {municipalities.map((item) => (
              <Card key={item.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50 flex-shrink-0">
                      <AvatarImage src={getMediaUrl(item.avatar)} className="object-cover" />
                      <AvatarFallback className="rounded-full font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">M</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-gray-900 truncate">{item.name}</CardTitle>
                      <CardDescription className="text-xs text-gray-500">{item.country_name}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <span className="text-xs uppercase font-semibold text-gray-400">Status</span>
                    <Badge variant="outline" className={`font-normal ${item.allow_self_registration ? "border-[#10B981]/30 bg-green-50 text-[#10B981]" : "border-[#EF4444]/30 bg-red-50 text-[#EF4444]"}`}>
                      {item.allow_self_registration ? 'Open' : 'Restricted'}
                    </Badge>
                  </div>
                  
                  {/* Actions - Directly on Card */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Link href={buildUrlWithParams(`${basePath}/${item.id}`)} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    <Link href={buildUrlWithParams(`${basePath}/edit/${item.id}`)} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setItemToDelete(item)}
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
                <TableRow className="border-b border-gray-100 bg-white hover:bg-white">
                  <TableHead className="h-12 px-6 text-gray-600 font-semibold">Municipality</TableHead>
                  <TableHead className="h-12 px-6 text-gray-600 font-semibold">Country</TableHead>
                  <TableHead className="h-12 px-6 text-gray-600 font-semibold">Code</TableHead>
                  <TableHead className="h-12 px-6 text-gray-600 font-semibold">Registration</TableHead>
                  <TableHead className="h-12 px-6 text-right text-gray-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {municipalities.map((item) => (
                  <TableRow key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-full border border-gray-200 bg-gray-50">
                          <AvatarImage src={getMediaUrl(item.avatar)} className="object-cover" />
                          <AvatarFallback className="rounded-full font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">M</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-gray-900">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 text-gray-600">{item.country_name}</TableCell>
                    <TableCell className="px-6">
                      <span className="font-mono text-xs text-gray-500">{item.municipality_code || '-'}</span>
                    </TableCell>
                    <TableCell className="px-6">
                      <Badge variant="outline" className={`font-normal ${item.allow_self_registration ? "border-[#10B981]/30 bg-green-50 text-[#10B981]" : "border-[#EF4444]/30 bg-red-50 text-[#EF4444]"}`}>
                        {item.allow_self_registration ? 'Open' : 'Restricted'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={buildUrlWithParams(`${basePath}/${item.id}`)}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={buildUrlWithParams(`${basePath}/edit/${item.id}`)}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setItemToDelete(item)}
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
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Prev
              </Button>
              <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage >= totalPages} 
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmationModal 
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        variant="danger"
        title="Delete Municipality"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This will remove the municipality and may affect linked data.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}
