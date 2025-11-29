'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';

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
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  
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

  const buildUrlWithPage = (path: string) => {
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage News</h1>
        <div className="flex gap-3">
            <Link href={`${basePath}/tags`} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-200">
                Manage Tags
            </Link>
            <Link href={`${basePath}/create`} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow">
                + Create Article
            </Link>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {!loading && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Toggle Button */}
          <button
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700">Analytics Dashboard</span>
            </div>
            <svg 
              className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${analyticsExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Analytics Cards - Collapsible */}
          <div 
            className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${
              analyticsExpanded 
                ? 'max-h-[500px] opacity-100' 
                : 'max-h-0 opacity-0'
            } overflow-hidden`}
          >
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 1: Total Articles */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Articles</h3>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.total}</p>
              </div>

              {/* Card 2: Published Articles */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Published</h3>
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-600">{analytics.published}</p>
              </div>

              {/* Card 3: Draft Articles */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Draft</h3>
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-600">{analytics.unpublished}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Toggle Button */}
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">Filters</span>
          </div>
          <svg 
            className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Filter Fields - Collapsible */}
        <div 
          className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${
            filtersExpanded 
              ? 'max-h-[1000px] opacity-100' 
              : 'max-h-0 opacity-0'
          } overflow-hidden`}
        >
          <div className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Search by Title */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search by Title</label>
                <input 
                  type="text" 
                  placeholder="Search by title..." 
                  className="w-full border rounded p-2 text-sm bg-gray-50"
                  value={searchParams.get('search') || ''} 
                  onChange={e => updateUrl('search', e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <div className="w-40">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filter by Status</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={searchParams.get('status') || ''} 
                  onChange={e => updateUrl('status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              {/* Author Filter */}
              <div className="w-48">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filter by Author</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
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
              <div className="w-48">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filter by Date of Creation</label>
                <input
                  type="date"
                  className="w-full border rounded p-2 text-sm bg-gray-50"
                  value={searchParams.get('date_created') || ''}
                  onChange={e => updateUrl('date_created', e.target.value)}
                />
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => router.push(pathname)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-red-500 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-500">Loading...</div> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Article</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Author</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {articles.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        {item.hero_image ? (
                            <img src={getMediaUrl(item.hero_image)||''} className="w-12 h-12 rounded object-cover" />
                        ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">No Img</div>
                        )}
                        <div>
                            <div className="font-bold text-gray-900">{item.title}</div>
                            {item.is_hero && <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded font-bold">HERO</span>}
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.is_published 
                        ? <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-bold">Published</span>
                        : <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs font-bold">Draft</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.author_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(item.published_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={buildUrlWithPage(`${basePath}/${item.id}`)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-900 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </Link>
                      <Link 
                        href={buildUrlWithPage(`${basePath}/edit/${item.id}`)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-900 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Link>
                      <button 
                        onClick={() => setItemToDelete(item)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-md hover:bg-red-100 hover:text-red-900 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {articles.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No articles found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {(() => {
        const currentPage = Number(searchParams.get('page')) || 1;
        const pageSize = 10;
        const totalPages = Math.ceil(totalCount / pageSize);
        
        if (totalPages <= 1) return null;
        
        return (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
            <div className="flex flex-1 justify-between sm:hidden">
              <button 
                disabled={currentPage === 1}
                onClick={() => updateUrl('page', (currentPage - 1).toString())}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                disabled={currentPage >= totalPages}
                onClick={() => updateUrl('page', (currentPage + 1).toString())}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                  {' '}(Total: {totalCount})
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => updateUrl('page', (currentPage - 1).toString())}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    ← Prev
                  </button>
                  
                  {/* Simple Pagination Numbers */}
                  {[...Array(totalPages)].map((_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => updateUrl('page', p.toString())}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold 
                          ${p === currentPage 
                            ? 'bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' 
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => updateUrl('page', (currentPage + 1).toString())}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    Next →
                  </button>
                </nav>
              </div>
            </div>
          </div>
        );
      })()}

      <DeleteConfirmationModal 
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        itemName={itemToDelete?.title}
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}