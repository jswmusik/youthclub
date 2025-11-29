'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Interests</h1>
        <Link 
          href={`${basePath}/create`} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow"
        >
          + Add Interest
        </Link>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <input 
          type="text" 
          placeholder="Search interests..." 
          className="w-full border rounded p-2 text-sm"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-500">Loading...</div> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Interest</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Icon</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {interests.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.avatar ? (
                        <img src={getMediaUrl(item.avatar) || ''} className="w-10 h-10 rounded-lg object-cover bg-gray-100 border" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                          No Img
                        </div>
                      )}
                      <span className="font-bold text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-2xl">{item.icon}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={buildUrlWithParams(`${basePath}/${item.id}`)} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-900 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </Link>
                      <Link 
                        href={buildUrlWithParams(`${basePath}/edit/${item.id}`)} 
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
              {interests.length === 0 && (
                <tr><td colSpan={3} className="p-8 text-center text-gray-500">No interests found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
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