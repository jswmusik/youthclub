'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Eye, Edit, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface InterestManagerProps {
  basePath: string;
}

export default function InterestManager({ basePath }: InterestManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [interests, setInterests] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const isUpdatingFromInput = useRef(false);
  
  // Delete
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Sync search input with URL params (only when URL changes externally)
  useEffect(() => {
    if (!isUpdatingFromInput.current) {
      const urlSearch = searchParams.get('search') || '';
      setSearchInput(urlSearch);
    }
    isUpdatingFromInput.current = false;
  }, [searchParams]);

  // Debounce search input to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = searchParams.get('search') || '';
      if (searchInput !== currentSearch) {
        isUpdatingFromInput.current = true;
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) params.set('search', searchInput); else params.delete('search');
        params.set('page', '1'); // Reset to page 1 when searching
        router.replace(`${pathname}?${params.toString()}`);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, pathname, router, searchParams]);

  useEffect(() => {
    fetchInterests();
  }, [searchParams]);

  const fetchInterests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const search = searchParams.get('search') || '';
      const page = searchParams.get('page') || '1';
      
      if (search) params.set('search', search);
      params.set('page', page);
      params.set('page_size', '10'); // Use pagination like YouthManager

      const res = await api.get(`/interests/?${params.toString()}`);
      
      // Handle both paginated and non-paginated responses
      if (Array.isArray(res.data)) {
        // Non-paginated response (array)
        setInterests(res.data);
        setTotalCount(res.data.length);
      } else {
        // Paginated response (object with results and count)
        setInterests(res.data.results || []);
        setTotalCount(res.data.count || (res.data.results?.length || 0));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/interests/${itemToDelete.id}/`);
      setToast({ message: 'Interest deleted.', type: 'success', isVisible: true });
      fetchInterests();
    } catch (err) {
      setToast({ message: 'Failed to delete. It might be in use.', type: 'error', isVisible: true });
    } finally {
      setItemToDelete(null);
    }
  };

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#121213]">Manage Interests</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Create and manage interests for your organization.</p>
        </div>
        <Link href={`${basePath}/create`} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
            <Plus className="h-4 w-4" /> Add Interest
          </Button>
        </Link>
      </div>

      {/* Filter */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <CardContent className="p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search interests..."
              className="pl-9 border-gray-200 focus:border-[#4D4DA4] focus:ring-[#4D4DA4]"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <Card className="border border-gray-100 shadow-sm bg-white">
          <CardContent className="p-12">
            <div className="text-center text-gray-500">Loading...</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="hidden md:block border border-gray-100 shadow-sm bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                  <TableHead className="h-12 text-gray-600 font-semibold">Interest</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Icon</TableHead>
                  <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interests.map(item => (
                  <TableRow key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        {item.avatar ? (
                          <Avatar className="h-9 w-9 rounded-lg border border-gray-200 bg-gray-50">
                            <AvatarImage src={getMediaUrl(item.avatar) || ''} alt={item.name} />
                            <AvatarFallback className="bg-gray-100 text-gray-400 rounded-lg">
                              {item.name?.charAt(0)?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs border border-gray-200">
                            {item.icon || '?'}
                          </div>
                        )}
                        <span className="font-semibold text-[#121213]">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-2xl">{item.icon || '—'}</span>
                    </TableCell>
                    <TableCell className="py-4 text-right">
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
                {interests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="p-8 text-center text-gray-500">
                      No interests found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {interests.map(item => (
              <Card key={item.id} className="border border-gray-100 shadow-sm bg-white overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3 px-4 pt-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {item.avatar ? (
                        <Avatar className="h-10 w-10 rounded-lg flex-shrink-0">
                          <AvatarImage src={getMediaUrl(item.avatar) || ''} alt={item.name} />
                          <AvatarFallback className="bg-gray-100 text-gray-400 rounded-lg">
                            {item.name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-sm border border-gray-200 flex-shrink-0">
                          {item.icon || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold text-[#121213] break-words">
                          {item.name}
                        </CardTitle>
                        {item.icon && (
                          <p className="text-2xl mt-1">{item.icon}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={buildUrlWithParams(`${basePath}/${item.id}`)} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-2 border-gray-200 hover:bg-gray-50">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    <Link href={buildUrlWithParams(`${basePath}/edit/${item.id}`)} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-2 border-gray-200 hover:bg-[#EBEBFE] hover:text-[#4D4DA4] hover:border-[#4D4DA4]">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-2 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      onClick={() => setItemToDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {interests.length === 0 && (
              <Card className="border border-gray-100 shadow-sm bg-white">
                <CardContent className="p-8">
                  <div className="text-center text-gray-500">No interests found.</div>
                </CardContent>
              </Card>
            )}
          </div>
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

      <DeleteConfirmationModal 
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        itemName={itemToDelete?.name}
        message={`Are you sure you want to delete "${itemToDelete?.name}"? It will be removed from all users and groups using it.`}
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}
