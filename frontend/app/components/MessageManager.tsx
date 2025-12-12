'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, BarChart3, ChevronUp, Trash2, X, MessageSquare, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
    router.replace(`${pathname}?${params.toString()}`);
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
        case 'INFO': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'IMPORTANT': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'WARNING': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Pagination logic
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Get paginated messages for display
  const paginatedMessages = messages;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#121213]">System Messages</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Create and manage system-wide messages.</p>
        </div>
        <Link href={`${basePath}/create`} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
            <Plus className="h-4 w-4" /> Create Message
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
                <h3 className="text-sm font-semibold text-gray-400">Analytics Dashboard</h3>
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
              <CardContent className="p-4 sm:p-6 transition-opacity duration-500 ease-in-out">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Card 1: Total Messages */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-white/90">Total Messages</CardTitle>
                        <div className="w-10 h-10 rounded-xl bg-[#4D4DA4]/30 flex items-center justify-center shadow-md">
                          <MessageSquare className="h-5 w-5 text-[#4D4DA4]" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{analytics.total}</div>
                    </CardContent>
                  </Card>

                  {/* Card 2: Information Messages */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-white/90">Information</CardTitle>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/30 flex items-center justify-center shadow-md">
                          <Info className="h-5 w-5 text-blue-400" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{analytics.info}</div>
                    </CardContent>
                  </Card>

                  {/* Card 3: Important Messages */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-white/90">Important</CardTitle>
                        <div className="w-10 h-10 rounded-xl bg-orange-500/30 flex items-center justify-center shadow-md">
                          <AlertCircle className="h-5 w-5 text-orange-400" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{analytics.important}</div>
                    </CardContent>
                  </Card>

                  {/* Card 4: Warning Messages */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-white/90">Warning</CardTitle>
                        <div className="w-10 h-10 rounded-xl bg-red-500/30 flex items-center justify-center shadow-md">
                          <AlertTriangle className="h-5 w-5 text-red-400" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{analytics.warning}</div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Main Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 items-end">
            {/* Search - Takes more space on larger screens */}
            <div className="relative md:col-span-4 lg:col-span-3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search by title or message..." 
                className="pl-9 bg-gray-50 border-0"
                value={searchParams.get('search') || ''}
                onChange={e => updateUrl('search', e.target.value)}
              />
            </div>
            
            {/* Message Type Filter */}
            <div className="md:col-span-2 lg:col-span-2">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('message_type') || ''} 
                onChange={e => updateUrl('message_type', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="INFO">Information</option>
                <option value="IMPORTANT">Important</option>
                <option value="WARNING">Warning</option>
              </select>
            </div>
            
            {/* Status Filter */}
            <div className="md:col-span-2 lg:col-span-2">
              <select 
                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                value={searchParams.get('status') || ''} 
                onChange={e => updateUrl('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
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
      ) : paginatedMessages.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">No messages found.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedMessages.map(msg => (
              <Card key={msg.id} className="overflow-hidden border-l-4 border-l-[#4D4DA4] shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={cn("text-xs font-semibold", getBadgeStyle(msg.message_type))}>
                        {msg.message_type}
                      </Badge>
                      {msg.is_sticky && (
                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                          Sticky
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base font-semibold text-[#121213] break-words">
                      {msg.title}
                    </CardTitle>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 break-words">{msg.message}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Audience</span>
                      <span className="text-xs text-gray-700">{msg.target_roles.includes("ALL") ? "All Users" : msg.target_roles.join(", ")}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs text-gray-500 uppercase font-semibold">Expires</span>
                      {(() => {
                        const expiresAt = new Date(msg.expires_at);
                        const now = new Date();
                        const isExpired = expiresAt <= now;
                        return (
                          <Badge variant={isExpired ? 'destructive' : 'default'} className="text-xs">
                            {expiresAt.toLocaleDateString()}
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>
                  {/* Action Button */}
                  <div className="pt-2 border-t border-gray-100">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setItemToDelete(msg)}
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
                  <TableHead className="h-12 text-gray-600 font-semibold">Type</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Content</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Audience</TableHead>
                  <TableHead className="h-12 text-gray-600 font-semibold">Expires</TableHead>
                  <TableHead className="h-12 text-right text-gray-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMessages.map(msg => (
                  <TableRow key={msg.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-xs font-semibold", getBadgeStyle(msg.message_type))}>
                          {msg.message_type}
                        </Badge>
                        {msg.is_sticky && (
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                            Sticky
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="font-semibold text-[#121213]">{msg.title}</div>
                      <div className="text-sm text-gray-500 max-w-md truncate">{msg.message}</div>
                    </TableCell>
                    <TableCell className="py-4 text-sm text-gray-600">
                      {msg.target_roles.includes("ALL") ? "All Users" : msg.target_roles.join(", ")}
                    </TableCell>
                    <TableCell className="py-4">
                      {(() => {
                        const expiresAt = new Date(msg.expires_at);
                        const now = new Date();
                        const isExpired = expiresAt <= now;
                        return (
                          <Badge variant={isExpired ? 'destructive' : 'default'} className="text-xs">
                            {expiresAt.toLocaleDateString()}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setItemToDelete(msg)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
        </>
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
