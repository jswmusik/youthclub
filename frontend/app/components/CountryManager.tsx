'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';

interface CountryManagerProps {
  basePath: string;
}

export default function CountryManager({ basePath }: CountryManagerProps) {
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
        console.log('CountryManager: Updating URL with search:', searchInput, 'current:', currentSearch);
        isUpdatingFromInput.current = true;
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) params.set('search', searchInput); else params.delete('search');
        const newUrl = `${pathname}?${params.toString()}`;
        console.log('CountryManager: Navigating to:', newUrl);
        router.replace(newUrl);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, pathname, router, searchParams]);

  const fetchCountries = useCallback(async () => {
    const search = searchParams.get('search') || '';
    console.log('CountryManager: fetchCountries called with search:', search);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (search) params.set('search', search);
      
      const url = `/countries/?${params.toString()}`;
      console.log('CountryManager: Fetching from URL:', url);
      
      const res = await api.get(url);
      console.log('CountryManager: API response:', res.data);
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      console.log('CountryManager: Received', data.length, 'countries. Data:', data);
      console.log('CountryManager: About to setCountries with', data.length, 'items');
      setCountries(data);
      console.log('CountryManager: setCountries called');
    } catch (err) {
      console.error('CountryManager: Error fetching countries:', err);
      setCountries([]);
    } finally {
      setLoading(false);
      console.log('CountryManager: Loading set to false');
    }
  }, [searchParams]);

  // Fetch countries when search params change
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    console.log('CountryManager: searchParams changed, fetching countries. Search:', currentSearch);
    fetchCountries();
  }, [searchParams, fetchCountries]);

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const searchParam = searchParams.get('search');
    
    if (searchParam) params.set('search', searchParam);
    
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

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

  console.log('CountryManager: Render - countries.length:', countries.length, 'loading:', loading, 'searchInput:', searchInput);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Countries</h1>
        <Link 
          href={`${basePath}/create`} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow"
        >
          + Add Country
        </Link>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <input 
          type="text" 
          placeholder="Search by name or code..." 
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
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Country</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Currency</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Language</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {countries.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.avatar ? (
                        <img src={getMediaUrl(item.avatar) || ''} className="w-10 h-10 rounded-lg object-contain bg-gray-50 border" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs">
                          {item.country_code}
                        </div>
                      )}
                      <span className="font-bold text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.country_code}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.currency_code}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.default_language}</td>
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
              {countries.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No countries found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <DeleteConfirmationModal 
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        itemName={itemToDelete?.name}
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This will likely delete all Municipalities and Clubs linked to it.`}
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}