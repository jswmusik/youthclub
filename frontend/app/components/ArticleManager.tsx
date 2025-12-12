'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, X, FileText, Calendar, User } from 'lucide-react';
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

interface ArticleManagerProps {
  basePath: string;
}

export default function ArticleManager({ basePath }: ArticleManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [articles, setArticles] = useState<any[]>([]);
  const [allArticlesForAnalytics, setAllArticlesForAnalytics] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  // Delete
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  useEffect(() => {
    fetchAllArticlesForAnalytics();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [searchParams]);

  const fetchAllArticlesForAnalytics = async () => {
    try {
      // Fetch all articles for analytics calculation
      let allArticles: any[] = [];
      let page = 1;
      let totalCount = 0;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/news/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) {
          break;
        }
        
        let pageArticles: any[] = [];
        
        if (Array.isArray(responseData)) {
          pageArticles = responseData;
          allArticles = [...allArticles, ...pageArticles];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageArticles = responseData.results;
          allArticles = [...allArticles, ...pageArticles];
          
          if (page === 1) {
            totalCount = responseData.count || 0;
          }
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allArticles.length >= totalCount;
          const gotEmptyPage = pageArticles.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) {
            break;
          }
          
          page++;
        } else {
          break;
        }
      }
      
      setAllArticlesForAnalytics(allArticles);
    } catch (err) {
      console.error('Error fetching articles for analytics:', err);
      setAllArticlesForAnalytics([]);
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const page = searchParams.get('page') || '1';
      const search = searchParams.get('search') || '';
      const status = searchParams.get('status') || '';
      const author = searchParams.get('author') || '';
      const dateCreated = searchParams.get('date_created') || '';
      
      // Check if we need client-side filtering
      const hasClientSideFilters = status || author || dateCreated;
      
      let fetchedArticles: any[] = [];
      
      if (hasClientSideFilters) {
        // Fetch all articles for client-side filtering
        let currentPage = 1;
        const pageSize = 100;
        const maxPages = 100;
        
        while (currentPage <= maxPages) {
          const params = new URLSearchParams();
          if (search) params.set('search', search);
          params.set('page', currentPage.toString());
          params.set('page_size', pageSize.toString());
          
          const res: any = await api.get(`/news/?${params.toString()}`);
          const responseData: any = res?.data;
          
          if (!responseData) break;
          
          const pageArticles = Array.isArray(responseData) ? responseData : responseData.results || [];
          fetchedArticles = [...fetchedArticles, ...pageArticles];
          
          if (!responseData.next || pageArticles.length === 0) break;
          currentPage++;
        }
      } else {
        // Use server-side pagination when no client-side filters
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        params.set('page', page);
        params.set('page_size', '10');
        
        const res = await api.get(`/news/?${params.toString()}`);
        fetchedArticles = Array.isArray(res.data) ? res.data : res.data.results || [];
        const count = Array.isArray(res.data) ? fetchedArticles.length : (res.data.count || fetchedArticles.length);
        setTotalCount(count);
      }
      
      // Apply client-side filters
      let filteredArticles = fetchedArticles;
      
      if (status) {
        filteredArticles = filteredArticles.filter((a: any) => {
          if (status === 'published') return a.is_published;
          if (status === 'draft') return !a.is_published;
          return true;
        });
      }
      
      if (author) {
        filteredArticles = filteredArticles.filter((a: any) => 
          a.author_name === author
        );
      }
      
      if (dateCreated) {
        const filterDate = new Date(dateCreated);
        filterDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        filteredArticles = filteredArticles.filter((a: any) => {
          if (!a.published_at) return false;
          const articleDate = new Date(a.published_at);
          articleDate.setHours(0, 0, 0, 0);
          return articleDate >= filterDate && articleDate < nextDay;
        });
      }
      
      // Apply client-side pagination if filters were active
      if (hasClientSideFilters) {
        const pageSize = 10;
        const startIndex = (Number(page) - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        setArticles(filteredArticles.slice(startIndex, endIndex));
        setTotalCount(filteredArticles.length);
      } else {
        setArticles(filteredArticles);
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
    router.push(`${pathname}?${params.toString()}`);
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const author = searchParams.get('author');
    const dateCreated = searchParams.get('date_created');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (author) params.set('author', author);
    if (dateCreated) params.set('date_created', dateCreated);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };
  
  // Get unique authors from all articles for analytics
  const uniqueAuthors = Array.from(
    new Set(allArticlesForAnalytics.map((a: any) => a.author_name).filter(Boolean))
  ).sort();

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/news/${itemToDelete.id}/`);
      setToast({ message: 'Article deleted.', type: 'success', isVisible: true });
      fetchArticles();
      fetchAllArticlesForAnalytics();
    } catch (err) {
      setToast({ message: 'Failed to delete.', type: 'error', isVisible: true });
    } finally {
      setItemToDelete(null);
    }
  };

  // Calculate analytics from allArticlesForAnalytics
  const analytics = {
    total: allArticlesForAnalytics.length,
    published: allArticlesForAnalytics.filter((a: any) => a.is_published).length,
    unpublished: allArticlesForAnalytics.filter((a: any) => !a.is_published).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Manage News</h1>
          <p className="text-gray-500 mt-1">Manage news articles and their information.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`${basePath}/tags`}>
            <Button variant="outline" className="gap-2 text-gray-700 hover:text-[#4D4DA4] hover:border-[#4D4DA4]">
              <FileText className="h-4 w-4" /> Manage Tags
            </Button>
          </Link>
          <Link href={`${basePath}/create`}>
            <Button className="gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
              <Plus className="h-4 w-4" /> Create Article
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
            {/* Card 1: Total Articles */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Articles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total}</div>
              </CardContent>
            </Card>

            {/* Card 2: Published Articles */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Published</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.published}</div>
              </CardContent>
            </Card>

            {/* Card 3: Draft Articles */}
            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Draft</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.unpublished}</div>
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
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            
            {/* Author Filter */}
            <div className="md:col-span-3 lg:col-span-3">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('author') || ''} 
                onChange={e => updateUrl('author', e.target.value)}
              >
                <option value="">All Authors</option>
                {uniqueAuthors.map((author: string) => (
                  <option key={author} value={author}>{author}</option>
                ))}
              </select>
            </div>
            
            {/* Date Created Filter */}
            <div className="md:col-span-2 lg:col-span-2">
              <Input
                type="date"
                className="h-9 bg-gray-50 border-0"
                value={searchParams.get('date_created') || ''}
                onChange={e => updateUrl('date_created', e.target.value)}
              />
            </div>
            
            {/* Clear Button */}
            <div className="md:col-span-2 lg:col-span-2">
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
      ) : articles.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">No articles found.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {articles.map(item => (
              <Card key={item.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 flex-shrink-0">
                      {item.hero_image ? (
                        <AvatarImage src={getMediaUrl(item.hero_image) || undefined} className="object-cover rounded-lg" />
                      ) : null}
                      <AvatarFallback className="rounded-lg font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                        <FileText className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-[#121213] truncate">
                        {item.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-500 truncate flex items-center gap-1">
                        <User className="h-3 w-3 flex-shrink-0" />
                        {item.author_name}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Status</span>
                      <Badge variant="outline" className={item.is_published ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}>
                        {item.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    {item.is_hero && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-xs text-gray-500 uppercase font-semibold">Type</span>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          HERO
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Created</span>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.published_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {/* Action Buttons */}
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
                <TableRow className="border-b border-gray-100 hover:bg-transparent">
                  <TableHead className="h-12 text-gray-600 font-semibold">Article</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Status</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Author</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Created</TableHead>
                  <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map(item => (
                  <TableRow key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-lg border border-gray-200 bg-gray-50">
                          {item.hero_image ? (
                            <AvatarImage src={getMediaUrl(item.hero_image) || undefined} className="object-cover rounded-lg" />
                          ) : null}
                          <AvatarFallback className="rounded-lg font-bold text-xs bg-[#EBEBFE] text-[#4D4DA4]">
                            <FileText className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-[#121213]">{item.title}</div>
                          {item.is_hero && (
                            <Badge variant="outline" className="text-xs mt-1 bg-yellow-50 text-yellow-700 border-yellow-200">
                              HERO
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={item.is_published ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}>
                        {item.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        {item.author_name}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {new Date(item.published_at).toLocaleDateString()}
                      </div>
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
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Pagination */}
      {(() => {
        const currentPage = Number(searchParams.get('page')) || 1;
        const pageSize = 10;
        const totalPages = Math.ceil(totalCount / pageSize);
        
        if (totalPages <= 1) return null;
        
        return (
          <div className="flex items-center justify-center gap-2 py-4">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => updateUrl('page', (currentPage - 1).toString())}
              className="gap-2"
            >
              Prev
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => updateUrl('page', (currentPage + 1).toString())}
              className="gap-2"
            >
              Next
            </Button>
          </div>
        );
      })()}

      <ConfirmationModal 
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Article"
        message={`Are you sure you want to delete "${itemToDelete?.title}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        variant="destructive"
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}