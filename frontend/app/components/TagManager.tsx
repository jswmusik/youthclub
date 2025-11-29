'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';

interface TagManagerProps {
  basePath: string;
}

export default function TagManager({ basePath }: TagManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [tags, setTags] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  useEffect(() => {
    fetchTags();
  }, [searchParams]);

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

  const buildUrlWithPage = (path: string) => {
    const params = new URLSearchParams();
    const page = searchParams.get('page');
    const search = searchParams.get('search');
    
    if (page && page !== '1') params.set('page', page);
    if (search) params.set('search', search);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const clearFilters = () => {
    router.push(pathname); // Navigate to base path to clear all params
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/news_tags/${itemToDelete.id}/`);
      setToast({ message: 'Tag deleted.', type: 'success', isVisible: true });
      // Re-fetch to preserve current page
      fetchTags();
    } catch (err) {
      setToast({ message: 'Delete failed.', type: 'error', isVisible: true });
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Tags</h1>
        <Link href={`${basePath}/create`} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow">
          + New Tag
        </Link>
      </div>

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
              {/* Search by Name */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search by Name</label>
                <input 
                  type="text" 
                  placeholder="Search by name..." 
                  className="w-full border rounded p-2 text-sm bg-gray-50"
                  value={searchParams.get('search') || ''} 
                  onChange={e => updateUrl('search', e.target.value)}
                />
              </div>

              {/* Clear Filters */}
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-500 hover:text-red-500 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-8 text-center">Loading...</div> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Slug</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tags.map(tag => (
                <tr key={tag.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-gray-900">{tag.name}</td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-sm">{tag.slug}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={buildUrlWithPage(`${basePath}/edit/${tag.id}`)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-900 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Link>
                      <button 
                        onClick={() => setItemToDelete(tag)} 
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
              {tags.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-gray-500">No tags found.</td></tr>}
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
        itemName={itemToDelete?.name}
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}