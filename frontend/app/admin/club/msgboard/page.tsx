'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import api from '../../../../lib/api';
import Toast from '../../../components/Toast';
import { useAuth } from '../../../../context/AuthContext';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';

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

function ClubMessageBoardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<SystemMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const searchInputRef = useRef<HTMLInputElement>(null);
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
    router.push(`${pathname}?${params.toString()}`);
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

  // Apply filters
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
    
    setFilteredMessages(filtered);
  }, [searchParams, messages]);

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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Message Board</h1>
        <button
          onClick={fetchMessages}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
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

              {/* Card 2: Total Info */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Info</h3>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.info}</p>
              </div>

              {/* Card 3: Total Important */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-orange-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Important</h3>
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.important}</p>
              </div>

              {/* Card 4: Total Warning */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-red-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Warning</h3>
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.warning}</p>
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
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Search by title or message..." 
                  className="w-full border rounded p-2 text-sm bg-gray-50"
                  value={searchInput} 
                  onChange={e => setSearchInput(e.target.value)}
                />
              </div>

              {/* Type */}
              <div className="w-48">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-gray-50" 
                  value={searchParams.get('type') || ''} 
                  onChange={e => updateUrl('type', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="INFO">Info</option>
                  <option value="IMPORTANT">Important</option>
                  <option value="WARNING">Warning</option>
                </select>
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

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Loading messages…</div>
      ) : filteredMessages.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {messages.length === 0 
            ? 'No active messages for your role right now.'
            : 'No messages match your filters.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((msg) => {
            const styles = MESSAGE_STYLES[msg.message_type] || MESSAGE_STYLES.INFO;
            return (
              <div
                key={msg.id}
                className={`bg-white ${styles.borderTop} rounded-lg shadow-sm p-6 flex flex-col gap-4`}
              >
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles.badge}`}>
                        {msg.message_type}
                      </span>
                      {msg.is_sticky && (
                        <span className="text-xs uppercase tracking-wide text-red-600 font-semibold">
                          Sticky
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">{msg.title}</h2>
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">{msg.message}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500 whitespace-nowrap">
                    <div className="mb-1">Created: {formatDate(msg.created_at)}</div>
                    <div>Expires: {formatDate(msg.expires_at)}</div>
                  </div>
                </div>

                {(msg.external_link || !msg.is_sticky) && (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    {msg.external_link && (
                      <a
                        href={msg.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 font-semibold hover:text-indigo-800 hover:underline inline-flex items-center gap-1"
                      >
                        View more
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                    {!msg.external_link && <div></div>}
                    <button
                      onClick={() => handleHideClick(msg)}
                      disabled={msg.is_sticky}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        msg.is_sticky
                          ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                          : 'text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-900'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Hide
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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

export default function ClubMessageBoardPage() {
  return (
    <div className="p-8">
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading message board…</div>}>
        <ClubMessageBoardContent />
      </Suspense>
    </div>
  );
}

