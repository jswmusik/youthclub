'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MoreHorizontal, Plus, Search, Globe, CreditCard, Trash2, Edit, Eye } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

// New Shadcn Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

// Your existing Modals (Preserved)
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';

interface CountryManagerProps {
  basePath: string;
}

export default function CountryManager({ basePath }: CountryManagerProps) {
  // --- 1. PRESERVED LOGIC SECTION (Exact copy of your logic) ---
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [countries, setCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const isUpdatingFromInput = useRef(false);
  
  // Delete
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Sync search input
  useEffect(() => {
    if (!isUpdatingFromInput.current) {
      setSearchInput(searchParams.get('search') || '');
    }
    isUpdatingFromInput.current = false;
  }, [searchParams]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = searchParams.get('search') || '';
      if (searchInput !== currentSearch) {
        isUpdatingFromInput.current = true;
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) params.set('search', searchInput); else params.delete('search');
        router.replace(`${pathname}?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, pathname, router, searchParams]);

  const fetchCountries = useCallback(async () => {
    setLoading(true);
    try {
      const search = searchParams.get('search') || '';
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      
      const res = await api.get(`/countries/?${params.toString()}`);
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setCountries(data);
    } catch (err) {
      console.error('Error fetching countries:', err);
      setCountries([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCountries();
  }, [searchParams, fetchCountries]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/countries/${itemToDelete.id}/`);
      setToast({ message: 'Country deleted.', type: 'success', isVisible: true });
      fetchCountries();
    } catch (err) {
      setToast({ message: 'Failed to delete. It might contain municipalities.', type: 'error', isVisible: true });
    } finally {
      setItemToDelete(null);
    }
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const searchParam = searchParams.get('search');
    if (searchParam) params.set('search', searchParam);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  // --- 2. NEW UI SECTION (Taskly-inspired clean design) ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manage Countries</h1>
          <p className="text-gray-500 mt-1.5 text-sm">Configure the regions available in the application.</p>
        </div>
        <Link href={`${basePath}/create`}>
          <Button className="w-full sm:w-auto gap-2 bg-[#4D4DA4] hover:bg-[#4D4DA4]/90 text-white rounded-full px-6 shadow-sm hover:shadow-md transition-all">
            <Plus className="h-4 w-4" /> Add Country
          </Button>
        </Link>
      </div>

      {/* Filter / Search */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <div className="px-3 py-1.5 flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <Input 
            placeholder="Search by name or code..." 
            className="border-0 shadow-none focus-visible:ring-0 bg-transparent placeholder:text-gray-400 p-0 h-7 text-sm"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
      </Card>

      {/* CONTENT: Loading State */}
      {loading ? (
        <div className="py-20 flex justify-center text-gray-400">
          <div className="animate-pulse">Loading...</div>
        </div>
      ) : countries.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">No countries found matching your search.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* MOBILE VIEW: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {countries.map((item) => (
              <Card key={item.id} className="border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 flex-shrink-0">
                      <AvatarImage src={getMediaUrl(item.avatar)} className="object-cover" />
                      <AvatarFallback className="rounded-lg font-semibold text-xs bg-gray-100 text-gray-700">
                        {item.country_code}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-gray-900 truncate">{item.name}</CardTitle>
                      <CardDescription className="font-mono text-xs text-gray-500 mt-0.5">{item.country_code}</CardDescription>
                    </div>
                  </div>
                  
                  {/* Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={buildUrlWithParams(`${basePath}/${item.id}`)} className="cursor-pointer">
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={buildUrlWithParams(`${basePath}/edit/${item.id}`)} className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setItemToDelete(item)} className="text-red-600 cursor-pointer focus:text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <CreditCard className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" /> 
                      <span className="text-sm text-gray-700 truncate">{item.currency_code}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <Globe className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" /> 
                      <span className="text-sm text-gray-700 truncate">{item.default_language}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* DESKTOP VIEW: Table */}
          <Card className="hidden md:block border border-gray-100 shadow-sm bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                  <TableHead className="h-12 text-gray-600 font-semibold">Country</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Code</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Currency</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Language</TableHead>
                  <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countries.map((item) => (
                  <TableRow key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-lg border border-gray-200 bg-gray-50">
                          <AvatarImage src={getMediaUrl(item.avatar)} className="object-cover" />
                          <AvatarFallback className="rounded-lg font-semibold text-xs bg-gray-100 text-gray-700">
                            {item.country_code}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-gray-900">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs border-gray-200 text-gray-700 bg-gray-50">
                        {item.country_code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">{item.currency_code}</TableCell>
                    <TableCell className="text-gray-600">{item.default_language}</TableCell>
                    <TableCell className="text-right">
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
        </>
      )}

      {/* Preserve Modals */}
      <DeleteConfirmationModal 
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        itemName={itemToDelete?.name}
        message={`Are you sure you want to delete "${itemToDelete?.name}"?`}
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}
