'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import api from '../../../../lib/api';
import Toast from '../../../components/Toast';
import { useAuth } from '../../../../context/AuthContext';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';
import { BarChart3, ChevronUp, Search, X, MessageSquare, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface SystemMessage {
  id: number;
  title: string;
  message: string;
  message_type: 'INFO' | 'IMPORTANT' | 'WARNING';
  created_at: string;
  expires_at: string;
  is_sticky: boolean;
  external_link?: string | null;
}

const MESSAGE_STYLES: Record<SystemMessage['message_type'], { badge: string; borderTop: string }> = {
  INFO: {
    badge: 'bg-blue-100 text-blue-800',
    borderTop: 'border-t-4 border-blue-500',
  },
  IMPORTANT: {
    badge: 'bg-orange-100 text-orange-800',
    borderTop: 'border-t-4 border-orange-500',
  },
  WARNING: {
    badge: 'bg-red-100 text-red-800',
    borderTop: 'border-t-4 border-red-500',
  },
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function MunicipalityMessageBoardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<SystemMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Pagination state
  const pageSize = 10;
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });
  const { refreshMessageCount } = useAuth();
  
  // Hide Confirmation Modal State
  const [showHideModal, setShowHideModal] = useState(false);
  const [messageToHide, setMessageToHide] = useState<{ id: number; title: string } | null>(null);
  const [isHiding, setIsHiding] = useState(false);

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    // Reset page to 1 when filters change (except when changing page itself)
    if (key !== 'page') {
      params.set('page', '1');
    }
    router.push(`${pathname}?${params.toString()}`);
  };
  
  const handlePageChange = (newPage: number) => {
    updateUrl('page', newPage.toString());
  };

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = searchParams.get('search') || '';
      if (searchInput !== currentSearch) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) params.set('search', searchInput); else params.delete('search');
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 0);
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Sync searchInput with URL when it changes externally
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== searchInput && document.activeElement !== searchInputRef.current) {
      setSearchInput(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Apply filters and pagination
  useEffect(() => {
    let filtered = [...messages];
    
    // Search filter
    const search = searchParams.get('search') || '';
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(searchLower) || 
        m.message.toLowerCase().includes(searchLower)
      );
    }
    
    // Type filter
    const type = searchParams.get('type') || '';
    if (type) {
      filtered = filtered.filter(m => m.message_type === type);
    }
    
    // Pagination
    const page = Number(searchParams.get('page')) || 1;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = filtered.slice(startIndex, endIndex);
    
    setFilteredMessages(paginated);
  }, [searchParams, messages]);
  
  // Calculate total pages for pagination
  const getTotalFilteredCount = () => {
    let filtered = [...messages];
    const search = searchParams.get('search') || '';
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(searchLower) || 
        m.message.toLowerCase().includes(searchLower)
      );
    }
    const type = searchParams.get('type') || '';
    if (type) {
      filtered = filtered.filter(m => m.message_type === type);
    }
    return filtered.length;
  };
  
  const totalFilteredCount = getTotalFilteredCount();
  const totalPages = Math.ceil(totalFilteredCount / pageSize);

  // Calculate analytics from all messages (not filtered)
  const analytics = {
    total: messages.length,
    info: messages.filter(m => m.message_type === 'INFO').length,
    important: messages.filter(m => m.message_type === 'IMPORTANT').length,
    warning: messages.filter(m => m.message_type === 'WARNING').length,
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/messages/active_list/');
      const list: SystemMessage[] = Array.isArray(res.data) ? res.data : [];
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setMessages(list);
      refreshMessageCount();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to load messages.', type: 'error', isVisible: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleHideClick = (msg: SystemMessage) => {
    if (msg.is_sticky) return;
    setMessageToHide({ id: msg.id, title: msg.title });
    setShowHideModal(true);
  };

  const handleHideConfirm = async () => {
    if (!messageToHide) return;

    setIsHiding(true);
    try {
      await api.post(`/messages/${messageToHide.id}/dismiss/`);
      setToast({ message: 'Message hidden.', type: 'success', isVisible: true });
      setShowHideModal(false);
      setMessageToHide(null);
      fetchMessages();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to hide message.', type: 'error', isVisible: true });
    } finally {
      setIsHiding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Message Board</h1>
          <p className="text-gray-500 mt-1.5 text-sm">Manage system messages and announcements.</p>
        </div>
        <Button
          onClick={fetchMessages}
          variant="outline"
          className="gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        >
          Refresh
        </Button>
      </div>

      {/* Analytics */}
      {!loading && (
        <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="space-y-2">
          <Card className="border-0 shadow-sm bg-gray-900">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-white drop-shadow-[0_0_8px_rgba(77,77,164,0.6)]" style={{ textShadow: '0 0 8px rgba(255, 84, 133, 0.4), 0 0 12px rgba(77, 77, 164, 0.3)' }}>
                  Analytics Dashboard
                </h3>
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
              <CardContent className="p-4 sm:p-6 pt-3 transition-opacity duration-500 ease-in-out">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Total Messages */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-[#4D4DA4]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                    style={{
                      boxShadow: '0 4px 20px rgba(77, 77, 164, 0.3), 0 0 20px rgba(255, 84, 133, 0.2)',
                    }}>
                    <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4D4DA4] to-[#FF5485] flex items-center justify-center shadow-lg"
                          style={{
                            boxShadow: '0 4px 15px rgba(77, 77, 164, 0.5), 0 0 20px rgba(255, 84, 133, 0.3)',
                          }}>
                          <MessageSquare className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-sm font-medium text-white/90">Total Messages</CardTitle>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.total}</div>
                    </div>
                  </Card>

                  {/* Info */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-[#0EA5E9]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                    style={{
                      boxShadow: '0 4px 20px rgba(14, 165, 233, 0.3), 0 0 20px rgba(56, 189, 248, 0.2)',
                    }}>
                    <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] flex items-center justify-center shadow-lg"
                          style={{
                            boxShadow: '0 4px 15px rgba(14, 165, 233, 0.5), 0 0 20px rgba(56, 189, 248, 0.3)',
                          }}>
                          <Info className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-sm font-medium text-white/90">Info</CardTitle>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.info}</div>
                    </div>
                  </Card>

                  {/* Important */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-[#F59E0B]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                    style={{
                      boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3), 0 0 20px rgba(251, 191, 36, 0.2)',
                    }}>
                    <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] flex items-center justify-center shadow-lg"
                          style={{
                            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.5), 0 0 20px rgba(251, 191, 36, 0.3)',
                          }}>
                          <AlertTriangle className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-sm font-medium text-white/90">Important</CardTitle>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.important}</div>
                    </div>
                  </Card>

                  {/* Warning */}
                  <Card className="bg-white/5 backdrop-blur-sm border border-[#EF4444]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                    style={{
                      boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3), 0 0 20px rgba(239, 68, 68, 0.2)',
                    }}>
                    <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EF4444] to-[#F87171] flex items-center justify-center shadow-lg"
                          style={{
                            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.5), 0 0 20px rgba(248, 113, 113, 0.3)',
                          }}>
                          <AlertCircle className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-sm font-medium text-white/90">Warning</CardTitle>
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.warning}</div>
                    </div>
                  </Card>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <div className="px-6 py-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input 
              ref={searchInputRef}
              placeholder="Search by title or message..." 
              className="pl-9 bg-gray-50 border-0"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-[200px]">
            <select 
              className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
              value={searchParams.get('type') || ''} 
              onChange={e => updateUrl('type', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="INFO">Info</option>
              <option value="IMPORTANT">Important</option>
              <option value="WARNING">Warning</option>
            </select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(pathname)}
            className="w-full sm:w-auto h-9 text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
          >
            <X className="h-4 w-4" /> Clear
          </Button>
        </div>
      </Card>

      {/* CONTENT */}
      {loading ? (
        <div className="py-20 flex justify-center text-gray-400">
          <div className="animate-pulse">Loading...</div>
        </div>
      ) : filteredMessages.length === 0 ? (
        <Card className="border border-gray-100 shadow-sm">
          <div className="py-20 text-center">
            <p className="text-gray-500">
              {messages.length === 0 
                ? 'No active messages for your role right now.'
                : 'No messages match your filters.'}
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* MOBILE: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredMessages.map((msg) => {
              const styles = MESSAGE_STYLES[msg.message_type] || MESSAGE_STYLES.INFO;
              return (
                <Card key={msg.id} className={`overflow-hidden ${styles.borderTop} shadow-sm`}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${styles.badge} text-xs`}>{msg.message_type}</Badge>
                        {msg.is_sticky && (
                          <Badge variant="outline" className="text-xs border-red-300 bg-red-50 text-red-600">
                            Sticky
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-semibold text-gray-900 truncate">{msg.title}</CardTitle>
                      <CardDescription className="text-xs text-gray-500 mt-1 line-clamp-2">{msg.message}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="flex items-center justify-between text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <span className="text-xs uppercase font-semibold text-gray-400">Created</span>
                      <span className="text-xs">{formatDate(msg.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <span className="text-xs uppercase font-semibold text-gray-400">Expires</span>
                      <span className="text-xs">{formatDate(msg.expires_at)}</span>
                    </div>
                    {(msg.external_link || !msg.is_sticky) && (
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        {msg.external_link && (
                          <a
                            href={msg.external_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1"
                          >
                            <Button variant="ghost" size="sm" className="w-full justify-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                              View more
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleHideClick(msg)}
                          disabled={msg.is_sticky}
                          className={`flex-1 justify-center gap-2 ${
                            msg.is_sticky
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                          }`}
                        >
                          Hide
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* DESKTOP: Table */}
          <Card className="hidden md:block border border-gray-100 shadow-sm bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-white hover:bg-white">
                  <TableHead className="h-12 px-6 text-gray-600 font-semibold">Type</TableHead>
                  <TableHead className="h-12 px-6 text-gray-600 font-semibold">Title</TableHead>
                  <TableHead className="h-12 px-6 text-gray-600 font-semibold">Message</TableHead>
                  <TableHead className="h-12 px-6 text-gray-600 font-semibold">Created</TableHead>
                  <TableHead className="h-12 px-6 text-gray-600 font-semibold">Expires</TableHead>
                  <TableHead className="h-12 px-6 text-right text-gray-600 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMessages.map((msg) => {
                  const styles = MESSAGE_STYLES[msg.message_type] || MESSAGE_STYLES.INFO;
                  return (
                    <TableRow key={msg.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Badge className={`${styles.badge} text-xs`}>{msg.message_type}</Badge>
                          {msg.is_sticky && (
                            <Badge variant="outline" className="text-xs border-red-300 bg-red-50 text-red-600">
                              Sticky
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6">
                        <span className="font-semibold text-gray-900">{msg.title}</span>
                      </TableCell>
                      <TableCell className="px-6">
                        <span className="text-gray-600 line-clamp-2">{msg.message}</span>
                      </TableCell>
                      <TableCell className="px-6 text-gray-600">
                        <span className="text-sm">{formatDate(msg.created_at)}</span>
                      </TableCell>
                      <TableCell className="px-6 text-gray-600">
                        <span className="text-sm">{formatDate(msg.expires_at)}</span>
                      </TableCell>
                      <TableCell className="px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {msg.external_link && (
                            <a
                              href={msg.external_link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </Button>
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleHideClick(msg)}
                            disabled={msg.is_sticky}
                            className={`h-8 w-8 p-0 ${
                              msg.is_sticky
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                            }`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (() => {
            const currentPage = Number(searchParams.get('page')) || 1;
            return (
              <div className="flex items-center justify-center gap-2 py-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1} 
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Prev
                </Button>
                <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage >= totalPages} 
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Next
                </Button>
              </div>
            );
          })()}
        </>
      )}

      {/* Hide Confirmation Modal */}
      <DeleteConfirmationModal
        isVisible={showHideModal}
        onClose={() => {
          if (!isHiding) {
            setShowHideModal(false);
            setMessageToHide(null);
          }
        }}
        onConfirm={handleHideConfirm}
        title="Hide Message"
        itemName={messageToHide?.title}
        message={messageToHide ? `Are you sure you want to hide "${messageToHide.title}"? You can refresh the page to see it again.` : undefined}
        confirmButtonText="Hide"
        isLoading={isHiding}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

export default function MunicipalityMessageBoardPage() {
  return (
    <div className="p-8">
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading message board…</div>}>
        <MunicipalityMessageBoardContent />
      </Suspense>
    </div>
  );
}
