'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Eye, Edit, Trash2, Heart, ChevronLeft, ChevronUp, BarChart3 } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import Toast from './Toast';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}

function SwipeableCard({ children, onEdit, onDelete, onClick }: SwipeableCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const actionWidth = 140;
  const threshold = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = startX - e.touches[0].clientX;
    if (isOpen) {
      const newX = Math.max(-actionWidth, Math.min(0, -actionWidth + (startX - e.touches[0].clientX) * -1));
      setCurrentX(newX);
    } else {
      const newX = Math.max(-actionWidth, Math.min(0, -diff));
      setCurrentX(newX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (isOpen) {
      if (currentX > -actionWidth + threshold) {
        setIsOpen(false);
        setCurrentX(0);
      } else {
        setCurrentX(-actionWidth);
      }
    } else {
      if (currentX < -threshold) {
        setIsOpen(true);
        setCurrentX(-actionWidth);
      } else {
        setCurrentX(0);
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isOpen && Math.abs(currentX) < 5) {
      onClick();
    } else if (isOpen) {
      setIsOpen(false);
      setCurrentX(0);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
    setIsOpen(false);
    setCurrentX(0);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
    setIsOpen(false);
    setCurrentX(0);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node) && isOpen) {
        setIsOpen(false);
        setCurrentX(0);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={cardRef} className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          onClick={handleEditClick}
          className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-blue)] text-white transition-all active:bg-[var(--brand-blue)]/80"
        >
          <Edit className="w-5 h-5" />
          <span className="text-xs font-medium">Edit</span>
        </button>
        <button
          onClick={handleDeleteClick}
          className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-red)] text-white transition-all active:bg-[var(--brand-red)]/80"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs font-medium">Delete</span>
        </button>
      </div>

      <div
        className="relative bg-[var(--dark-700)] transition-transform duration-200 ease-out cursor-pointer"
        style={{ 
          transform: `translateX(${isDragging ? currentX : (isOpen ? -actionWidth : 0)}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {children}
        {!isOpen && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/20 pointer-events-none">
            <ChevronLeft className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}

// Skeleton Components
function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-[var(--dark-600)] rounded ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite, pulse 2s infinite'
      }}
    />
  );
}

function InterestCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

function InterestTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
          <Skeleton className="h-5 w-32" />
        </div>
      </td>
      <td className="px-6 py-4">
        <Skeleton className="h-8 w-8 rounded" />
      </td>
      <td className="px-6 py-4">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

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
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);
  
  // Delete
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Sync search input with URL params
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
        params.set('page', '1');
        router.replace(`${pathname}?${params.toString()}`);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, pathname, router, searchParams]);

  useEffect(() => {
    fetchInterests();
  }, [searchParams]);

  const fetchInterests = async () => {
    const startTime = Date.now();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const search = searchParams.get('search') || '';
      const page = searchParams.get('page') || '1';
      
      if (search) params.set('search', search);
      params.set('page', page);
      params.set('page_size', '10');

      const res = await api.get(`/interests/?${params.toString()}`);
      
      if (Array.isArray(res.data)) {
        setInterests(res.data);
        setTotalCount(res.data.length);
      } else {
        setInterests(res.data.results || []);
        setTotalCount(res.data.count || (res.data.results?.length || 0));
      }
    } catch (err) {
      console.error(err);
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = MIN_LOADING_TIME - elapsed;
      if (remaining > 0) {
        setTimeout(() => setLoading(false), remaining);
      } else {
        setLoading(false);
      }
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
      setToast({ message: 'Interest deleted successfully.', type: 'success', isVisible: true });
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
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-6">
      <div className="sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Interests</h1>
              <p className="text-sm text-[var(--brand-light)]/50">Manage interests for your organization</p>
            </div>
          </div>
          <Link href={`${basePath}/create`} className="w-full sm:w-auto">
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold hover:bg-[var(--brand-primary)]/90 transition-all">
              <Plus className="w-5 h-5" />
              Add Interest
            </button>
          </Link>
        </div>

        {/* Analytics Dashboard (Collapsible) */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
          <button 
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="w-full px-4 sm:px-6 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--brand-light)]/50" />
              <span className="text-sm font-medium text-[var(--brand-light)]">Analytics Overview</span>
            </div>
            <ChevronUp className={`w-4 h-4 text-[var(--brand-light)]/50 transition-transform ${analyticsExpanded ? '' : 'rotate-180'}`} />
          </button>
          
          {analyticsExpanded && (
            <div className="px-4 sm:px-6 pb-4 border-t border-[var(--dark-600)]">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border-l-4 border-[var(--brand-primary)]">
                  <div className="text-2xl font-bold text-[var(--brand-light)]">{totalCount}</div>
                  <div className="text-xs text-[var(--brand-light)]/50">Total Interests</div>
                </div>
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border-l-4 border-[var(--brand-green)]">
                  <div className="text-2xl font-bold text-[var(--brand-light)]">{interests.filter(i => i.icon).length}</div>
                  <div className="text-xs text-[var(--brand-light)]/50">With Icons</div>
                </div>
                <div className="bg-[var(--dark-700)] rounded-xl p-4 border-l-4 border-[var(--brand-blue)] col-span-2 sm:col-span-1">
                  <div className="text-2xl font-bold text-[var(--brand-light)]">{interests.filter(i => i.avatar).length}</div>
                  <div className="text-xs text-[var(--brand-light)]/50">With Images</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6 px-4 sm:px-6 py-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--brand-light)]/40" />
            <input
              type="text"
              placeholder="Search interests..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 outline-none focus:border-[var(--brand-primary)] transition-colors"
            />
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-4 sm:px-0 mb-4">
          <span className="text-sm text-[var(--brand-light)]/50">
            {loading ? 'Loading...' : `${totalCount} interest${totalCount !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Loading State */}
        {loading ? (
          <>
            {/* Mobile Skeletons */}
            <div className="flex flex-col gap-3 md:hidden">
              {[...Array(5)].map((_, i) => (
                <InterestCardSkeleton key={i} />
              ))}
            </div>
            {/* Desktop Skeletons */}
            <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--dark-600)]">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">Interest</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">Icon</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <InterestTableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {interests.length === 0 ? (
                <div className="bg-[var(--dark-800)] rounded-none border-y border-[var(--dark-600)] p-12 text-center">
                  <Heart className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-4" />
                  <p className="text-[var(--brand-light)]/50">No interests found.</p>
                  <Link href={`${basePath}/create`}>
                    <button className="mt-4 px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-medium text-sm">
                      Add First Interest
                    </button>
                  </Link>
                </div>
              ) : (
                interests.map(item => (
                  <SwipeableCard
                    key={item.id}
                    onClick={() => router.push(buildUrlWithParams(`${basePath}/${item.id}`))}
                    onEdit={() => router.push(buildUrlWithParams(`${basePath}/edit/${item.id}`))}
                    onDelete={() => setItemToDelete(item)}
                  >
                    <div className="border-y border-[var(--dark-600)] p-4">
                      <div className="flex items-center gap-3">
                        {item.avatar ? (
                          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-[var(--dark-500)]">
                            <img 
                              src={getMediaUrl(item.avatar) || ''} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[var(--dark-600)] flex items-center justify-center text-2xl flex-shrink-0 border border-[var(--dark-500)]">
                            {item.icon || '❤️'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[var(--brand-light)] truncate">{item.name}</h3>
                          {item.icon && (
                            <span className="text-xl">{item.icon}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </SwipeableCard>
                ))
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--dark-600)]">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">Interest</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">Icon</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--brand-light)]/50 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {interests.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center">
                        <Heart className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-4" />
                        <p className="text-[var(--brand-light)]/50">No interests found.</p>
                      </td>
                    </tr>
                  ) : (
                    interests.map(item => (
                      <tr 
                        key={item.id} 
                        className="border-b border-[var(--dark-600)]/50 hover:bg-[var(--dark-700)]/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {item.avatar ? (
                              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-[var(--dark-500)]">
                                <img 
                                  src={getMediaUrl(item.avatar) || ''} 
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-[var(--dark-600)] flex items-center justify-center text-xl flex-shrink-0 border border-[var(--dark-500)]">
                                {item.icon || '❤️'}
                              </div>
                            )}
                            <span className="font-semibold text-[var(--brand-light)]">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-2xl">{item.icon || '—'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={buildUrlWithParams(`${basePath}/${item.id}`)}>
                              <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all">
                                <Eye className="w-4 h-4" />
                              </button>
                            </Link>
                            <Link href={buildUrlWithParams(`${basePath}/edit/${item.id}`)}>
                              <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/60 hover:text-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/10 transition-all">
                                <Edit className="w-4 h-4" />
                              </button>
                            </Link>
                            <button 
                              onClick={() => setItemToDelete(item)}
                              className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 py-6 px-4 sm:px-0">
            <button 
              disabled={currentPage === 1} 
              onClick={() => updateUrl('page', (currentPage - 1).toString())}
              className="px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)] transition-all"
            >
              Previous
            </button>
            <span className="text-sm text-[var(--brand-light)]/50">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              disabled={currentPage >= totalPages} 
              onClick={() => updateUrl('page', (currentPage + 1).toString())}
              className="px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)] transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <DeleteConfirmationModal 
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        itemName={itemToDelete?.name}
        message={`Are you sure you want to delete "${itemToDelete?.name}"? It will be removed from all users and groups using it.`}
        darkMode={true}
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} darkMode={true} />
    </div>
  );
}
