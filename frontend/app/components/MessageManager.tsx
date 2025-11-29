'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';

interface MessageManagerProps {
  basePath: string;
}

export default function MessageManager({ basePath }: MessageManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [allMessagesForAnalytics, setAllMessagesForAnalytics] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  
  // Delete State
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  useEffect(() => {
    fetchAllMessagesForAnalytics();
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [searchParams]);

  const fetchAllMessagesForAnalytics = async () => {
    try {
      // Fetch all messages for analytics calculation
      let allMessages: any[] = [];
      let page = 1;
      let totalCount = 0;
      const pageSize = 100;
      const maxPages = 100;
      
      while (page <= maxPages) {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('page_size', pageSize.toString());
        
        const res: any = await api.get(`/messages/?${params.toString()}`);
        const responseData: any = res?.data;
        
        if (!responseData) {
          break;
        }
        
        let pageMessages: any[] = [];
        
        if (Array.isArray(responseData)) {
          pageMessages = responseData;
          allMessages = [...allMessages, ...pageMessages];
          break;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          pageMessages = responseData.results;
          allMessages = [...allMessages, ...pageMessages];
          
          if (page === 1) {
            totalCount = responseData.count || 0;
          }
          
          const hasNext = responseData.next !== null && responseData.next !== undefined;
          const hasAllResults = totalCount > 0 && allMessages.length >= totalCount;
          const gotEmptyPage = pageMessages.length === 0;
          
          if (!hasNext || hasAllResults || gotEmptyPage) {
            break;
          }
          
          page++;
        } else {
          break;
        }
      }
      
      setAllMessagesForAnalytics(allMessages);
    } catch (err) {
      console.error('Error fetching messages for analytics:', err);
      setAllMessagesForAnalytics([]);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const page = searchParams.get('page') || '1';
      const search = searchParams.get('search') || '';
      const messageType = searchParams.get('message_type') || '';
      const status = searchParams.get('status') || '';
      
      // If any filter is active, fetch all messages for client-side filtering
      // Otherwise use server-side pagination
      const hasFilters = search || messageType || status;
      
      let allMessages: any[] = [];
      
      if (hasFilters) {
        // Fetch all messages when filters are active
        let currentPage = 1;
        const pageSize = 100;
        const maxPages = 100;
        
        while (currentPage <= maxPages) {
          const params = new URLSearchParams();
          params.set('page', currentPage.toString());
          params.set('page_size', pageSize.toString());
          
          // Don't send message_type to API, we'll filter client-side
          
          const res: any = await api.get(`/messages/?${params.toString()}`);
          const responseData: any = res?.data;
          
          if (!responseData) break;
          
          let pageMessages: any[] = [];
          
          if (Array.isArray(responseData)) {
            pageMessages = responseData;
            allMessages = [...allMessages, ...pageMessages];
            break;
          } else if (responseData.results && Array.isArray(responseData.results)) {
            pageMessages = responseData.results;
            allMessages = [...allMessages, ...pageMessages];
            
            const hasNext = responseData.next !== null && responseData.next !== undefined;
            if (!hasNext || pageMessages.length === 0) break;
            
            currentPage++;
          } else {
            break;
          }
        }
      } else {
        // Use server-side pagination when no filters
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('page_size', '10');
        
        const res = await api.get(`/messages/?${params.toString()}`);
        allMessages = Array.isArray(res.data) ? res.data : res.data.results || [];
        const count = Array.isArray(res.data) ? allMessages.length : (res.data.count || allMessages.length);
        setTotalCount(count);
      }
      
      let messagesData = allMessages;
      
      // Apply message_type filter (client-side)
      if (messageType) {
        messagesData = messagesData.filter((msg: any) => {
          return msg.message_type === messageType;
        });
      }
      
      // Apply client-side filtering
      if (search) {
        const searchLower = search.toLowerCase();
        messagesData = messagesData.filter((msg: any) => {
          const titleMatch = msg.title?.toLowerCase().includes(searchLower);
          const messageMatch = msg.message?.toLowerCase().includes(searchLower);
          return titleMatch || messageMatch;
        });
      }
      
      // Apply status filter (active/expired)
      if (status) {
        const now = new Date();
        messagesData = messagesData.filter((msg: any) => {
          if (!msg.expires_at) return false;
          const expiresAt = new Date(msg.expires_at);
          if (status === 'active') {
            return expiresAt > now;
          } else if (status === 'expired') {
            return expiresAt <= now;
          }
          return true;
        });
      }
      
      // Get total count before pagination
      const totalFiltered = messagesData.length;
      
      // Apply client-side pagination when filters are active
      if (hasFilters) {
        const pageSize = 10;
        const startIndex = (Number(page) - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        messagesData = messagesData.slice(startIndex, endIndex);
        setTotalCount(totalFiltered);
      }
      
      setMessages(messagesData);
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

  const clearFilters = () => {
    router.push(pathname);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/messages/${itemToDelete.id}/`);
      setToast({ message: 'Message deleted.', type: 'success', isVisible: true });
      fetchMessages();
      fetchAllMessagesForAnalytics();
    } catch (err) {
      setToast({ message: 'Failed to delete.', type: 'error', isVisible: true });
    } finally {
      setItemToDelete(null);
    }
  };

  // Calculate analytics from allMessagesForAnalytics
  const analytics = {
    total: allMessagesForAnalytics.length,
    info: allMessagesForAnalytics.filter((m: any) => m.message_type === 'INFO').length,
    important: allMessagesForAnalytics.filter((m: any) => m.message_type === 'IMPORTANT').length,
    warning: allMessagesForAnalytics.filter((m: any) => m.message_type === 'WARNING').length,
  };

  const getBadgeStyle = (type: string) => {
    switch(type) {
        case 'INFO': return 'bg-blue-100 text-blue-800';
        case 'IMPORTANT': return 'bg-orange-100 text-orange-800';
        case 'WARNING': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">System Messages</h1>
        <Link 
          href={`${basePath}/create`} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow"
        >
          + Create Message
        </Link>
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
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Messages */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Messages</h3>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.total}</p>
              </div>

              {/* Card 2: Information Messages */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Information</h3>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-blue-600">{analytics.info}</p>
              </div>

              {/* Card 3: Important Messages */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-orange-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Important</h3>
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-orange-600">{analytics.important}</p>
              </div>

              {/* Card 4: Warning Messages */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-red-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Warning</h3>
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-red-600">{analytics.warning}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTERS */}
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
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search</label>
                <input 
                  type="text" 
                  placeholder="Search by title or message..." 
                  className="w-full border rounded p-2 text-sm bg-gray-50"
                  value={searchParams.get('search') || ''} 
                  onChange={e => updateUrl('search', e.target.value)}
                />
              </div>

              {/* Message Type */}
              <div className="w-40">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={searchParams.get('message_type') || ''} 
                  onChange={e => updateUrl('message_type', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="INFO">Information</option>
                  <option value="IMPORTANT">Important</option>
                  <option value="WARNING">Warning</option>
                </select>
              </div>

              {/* Status (Active/Expired) */}
              <div className="w-40">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={searchParams.get('status') || ''} 
                  onChange={e => updateUrl('status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              {(searchParams.get('search') || searchParams.get('message_type') || searchParams.get('status')) && (
                <div className="w-auto">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-500">Loading messages...</div> : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Content</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Audience</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Expires</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {messages.map(msg => (
                <tr key={msg.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getBadgeStyle(msg.message_type)}`}>
                        {msg.message_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{msg.title}</div>
                    <div className="text-sm text-gray-500 max-w-md truncate">{msg.message}</div>
                    {msg.is_sticky && <span className="text-[10px] uppercase font-bold text-yellow-600 bg-yellow-50 px-1 rounded border border-yellow-200">Sticky</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {msg.target_roles.includes("ALL") ? "All Users" : msg.target_roles.join(", ")}
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const expiresAt = new Date(msg.expires_at);
                      const now = new Date();
                      const isExpired = expiresAt <= now;
                      return (
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          isExpired 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {expiresAt.toLocaleDateString()}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setItemToDelete(msg)} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-md hover:bg-red-100 hover:text-red-900 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {messages.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No active messages.</td></tr>
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
        itemName={itemToDelete?.title}
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
    </div>
  );
}