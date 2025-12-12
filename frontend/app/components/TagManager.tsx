'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, BarChart3, ChevronUp, Edit, Trash2, X, Tag, ArrowLeft } from 'lucide-react';
import api from '../../lib/api';
import ConfirmationModal from './ConfirmationModal';
import Toast from './Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface TagManagerProps {
  basePath: string;
}

export default function TagManager({ basePath }: TagManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [tags, setTags] = useState<any[]>([]);
  const [allTagsForAnalytics, setAllTagsForAnalytics] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  useEffect(() => {
    fetchAllTagsForAnalytics();
  }, []);

  useEffect(() => {
    fetchTags();
  }, [searchParams]);

  const fetchAllTagsForAnalytics = async () => {
    try {
      let allTags: any[] = [];
      let page = 1;
      let totalCount = 0;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/news_tags/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) break;
        
        let pageTags: any[] = [];
        
        if (Array.isArray(responseData)) {
          pageTags = responseData;
          allTags = [...allTags, ...pageTags];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageTags = responseData.results;
          allTags = [...allTags, ...pageTags];
          
          if (page === 1) {
            totalCount = responseData.count || 0;
          }
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allTags.length >= totalCount;
          const gotEmptyPage = pageTags.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) break;
          page++;
        } else {
          break;
        }
      }
      
      setAllTagsForAnalytics(allTags);
    } catch (err) {
      console.error('Error fetching tags for analytics:', err);
      setAllTagsForAnalytics([]);
    }
  };

  const fetchTags = async () => {
    setLoading(true);
    try {
      const page = searchParams.get('page') || '1';
      const search = searchParams.get('search') || '';
      
      // If search filter is active, fetch all tags for client-side filtering
      // Otherwise use server-side pagination
      const hasSearch = search && search.trim() !== '';
      
      let allTags: any[] = [];
      
      if (hasSearch) {
        // Fetch all tags when search is active
        let currentPage = 1;
        const pageSize = 100;
        const maxPages = 100;
        
        while (currentPage <= maxPages) {
          const params = new URLSearchParams();
          params.set('page', currentPage.toString());
          params.set('page_size', pageSize.toString());
          
          const res: any = await api.get(`/news_tags/?${params.toString()}`);
          const responseData: any = res?.data;
          
          if (!responseData) break;
          
          let pageTags: any[] = [];
          
          if (Array.isArray(responseData)) {
            pageTags = responseData;
            allTags = [...allTags, ...pageTags];
            break;
          } else if (responseData.results && Array.isArray(responseData.results)) {
            pageTags = responseData.results;
            allTags = [...allTags, ...pageTags];
            
            const hasNext = responseData.next !== null && responseData.next !== undefined;
            if (!hasNext || pageTags.length === 0) break;
            
            currentPage++;
          } else {
            break;
          }
        }
      } else {
        // Use server-side pagination when no search filter
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('page_size', '10');
        
        const res = await api.get(`/news_tags/?${params.toString()}`);
        allTags = Array.isArray(res.data) ? res.data : res.data.results || [];
        const count = Array.isArray(res.data) ? allTags.length : (res.data.count || allTags.length);
        setTotalCount(count);
      }
      
      let tagsData = allTags;
      
      // Apply client-side search filter
      if (hasSearch) {
        const searchLower = search.toLowerCase();
        tagsData = tagsData.filter((tag: any) => {
          const nameMatch = tag.name?.toLowerCase().includes(searchLower);
          const slugMatch = tag.slug?.toLowerCase().includes(searchLower);
          return nameMatch || slugMatch;
        });
      }
      
      // Apply client-side pagination if search was active
      if (hasSearch) {
        const pageSize = 10;
        const startIndex = (Number(page) - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        setTags(tagsData.slice(startIndex, endIndex));
        setTotalCount(tagsData.length); // Total count of filtered items
      } else {
        setTags(tagsData);
      }
    } catch (err) { 
      console.error(err); 
    } 
    finally { 
      setLoading(false); 
    }
  };

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key !== 'page') params.set('page', '1'); // Reset page to 1 if filter changes
    router.push(`${pathname}?${params.toString()}`);
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
      await api.delete(`/news_tags/${itemToDelete.id}/`);
      setToast({ message: 'Tag deleted.', type: 'success', isVisible: true });
      fetchTags();
      fetchAllTagsForAnalytics();
    } catch (err) {
      setToast({ message: 'Delete failed.', type: 'error', isVisible: true });
    } finally {
      setItemToDelete(null);
    }
  };

  // Calculate analytics from allTagsForAnalytics
  const analytics = {
    total: allTagsForAnalytics.length,
  };

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedTags = tags;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link href="/admin/super/news">
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900 w-fit">
            <ArrowLeft className="h-4 w-4" />
            Back to News
          </Button>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Manage Tags</h1>
            <p className="text-gray-500 mt-1">Manage news article tags and categories.</p>
          </div>
          <Link href={`${basePath}/create`}>
            <Button className="w-full sm:w-auto gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
              <Plus className="h-4 w-4" /> Create Tag
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
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 pt-2">
            {/* Card: Total Tags */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total}</div>
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
            <div className="relative md:col-span-10 lg:col-span-11">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search by name or slug..." 
                className="pl-9 bg-gray-50 border-0"
                value={searchParams.get('search') || ''}
                onChange={e => updateUrl('search', e.target.value)}
              />
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
      ) : paginatedTags.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">No tags found.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedTags.map(tag => (
              <Card key={tag.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-[#EBEBFE] flex items-center justify-center flex-shrink-0">
                      <Tag className="h-5 w-5 text-[#4D4DA4]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-[#121213] truncate">
                        {tag.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-500 truncate font-mono">
                        {tag.slug}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Link href={buildUrlWithParams(`${basePath}/edit/${tag.id}`)} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setItemToDelete(tag)}
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
                  <TableHead className="h-12 text-gray-600 font-semibold">Tag</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Slug</TableHead>
                  <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTags.map(tag => (
                  <TableRow key={tag.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-[#EBEBFE] flex items-center justify-center flex-shrink-0">
                          <Tag className="h-5 w-5 text-[#4D4DA4]" />
                        </div>
                        <div className="font-semibold text-[#121213]">{tag.name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <code className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded font-mono">{tag.slug}</code>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={buildUrlWithParams(`${basePath}/edit/${tag.id}`)}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setItemToDelete(tag)}
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
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Tag"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        variant="danger"
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}