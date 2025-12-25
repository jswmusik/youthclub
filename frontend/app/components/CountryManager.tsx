'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MoreHorizontal, Plus, Search, Globe, CreditCard, Trash2, Edit, Eye, Flag, Languages, Clock, ChevronLeft } from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

// Your existing Modals (Preserved)
import ConfirmationModal from './ConfirmationModal';
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

function CountryCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    </div>
  );
}

function CountryTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
          <Skeleton className="h-5 w-28" />
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-12 rounded-lg" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-10" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-8" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="w-9 h-9 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

function CountriesPageSkeleton() {
  return (
    <>
      {/* Mobile Cards Skeleton */}
      <div className="flex flex-col gap-3 md:hidden">
        {[...Array(4)].map((_, i) => (
          <CountryCardSkeleton key={i} />
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--dark-600)]">
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Country</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Code</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Currency</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Language</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Timezone</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <CountryTableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface CountryManagerProps {
  basePath: string;
}

export default function CountryManager({ basePath }: CountryManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [countries, setCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const isUpdatingFromInput = useRef(false);
  
  // Delete
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

  // Sync search input
  useEffect(() => {
    if (!isUpdatingFromInput.current) {
      setSearchInput(searchParams.get('search') || '');
    }
    isUpdatingFromInput.current = false;
  }, [searchParams]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = searchParams.get('search') || '';
      if (searchInput !== currentSearch) {
        isUpdatingFromInput.current = true;
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) params.set('search', searchInput); else params.delete('search');
        router.replace(`${pathname}?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, pathname, router, searchParams]);

  const fetchCountries = useCallback(async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();
    
    try {
      const search = searchParams.get('search') || '';
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      
      const res = await api.get(`/countries/?${params.toString()}`);
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setCountries(data);
    } catch (err) {
      console.error('Error fetching countries:', err);
      setCountries([]);
    } finally {
      // Ensure minimum loading time for skeleton display
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      
      setTimeout(() => {
        setLoading(false);
        setShowSkeleton(false);
      }, remaining);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCountries();
  }, [searchParams, fetchCountries]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/countries/${itemToDelete.id}/`);
      setToast({ message: 'Country deleted successfully.', type: 'success', isVisible: true });
      fetchCountries();
    } catch (err) {
      setToast({ message: 'Failed to delete. It might contain municipalities.', type: 'error', isVisible: true });
    } finally {
      setItemToDelete(null);
    }
  };

  const buildUrlWithParams = (path: string) => {
    const params = new URLSearchParams();
    const searchParam = searchParams.get('search');
    if (searchParam) params.set('search', searchParam);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
              <Flag className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Manage Countries</h1>
          </div>
          <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">Configure the regions available in the application.</p>
        </div>
        <Link href={`${basePath}/create`}>
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
            <Plus className="h-4 w-4" /> Add Country
          </button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 py-3">
        <div className="flex items-center gap-3">
          <Search className="h-5 w-5 text-[var(--brand-light)]/40 flex-shrink-0" />
          <input 
            type="text"
            placeholder="Search by name or code..." 
            className="flex-1 bg-transparent text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none text-base"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button 
              onClick={() => setSearchInput('')}
              className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {!loading && countries.length > 0 && (
        <div className="px-4 sm:px-0">
          <p className="text-sm text-[var(--brand-light)]/50">
            Showing <span className="text-[var(--brand-primary)] font-semibold">{countries.length}</span> {countries.length === 1 ? 'country' : 'countries'}
          </p>
        </div>
      )}

      {/* Content */}
      {showSkeleton ? (
        <CountriesPageSkeleton />
      ) : countries.length === 0 ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-[var(--brand-light)]/30" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">No countries found</h3>
          <p className="text-[var(--brand-light)]/50 text-sm mb-6">
            {searchInput ? 'Try adjusting your search terms.' : 'Get started by adding your first country.'}
          </p>
          {!searchInput && (
            <Link href={`${basePath}/create`}>
              <button className="inline-flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
                <Plus className="h-4 w-4" /> Add Country
              </button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {countries.map((item, index) => (
              <SwipeableCard
                key={item.id}
                onClick={() => router.push(buildUrlWithParams(`${basePath}/${item.id}`))}
                onEdit={() => router.push(buildUrlWithParams(`${basePath}/edit/${item.id}`))}
                onDelete={() => setItemToDelete(item)}
              >
                <div className="border-y border-[var(--dark-600)] p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[var(--dark-600)] border border-[var(--dark-500)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.avatar ? (
                        <img src={getMediaUrl(item.avatar)} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-[var(--brand-light)]/60">{item.country_code}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-[var(--brand-light)] truncate">{item.name}</h3>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-[var(--dark-600)] rounded-md text-xs font-mono text-[var(--brand-light)]/60">
                        {item.country_code}
                      </span>
                    </div>
                  </div>
                  
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="flex items-center gap-2 bg-[var(--dark-600)] p-3 rounded-lg">
                      <CreditCard className="h-4 w-4 text-[var(--brand-peach)] flex-shrink-0" /> 
                      <span className="text-sm text-[var(--brand-light)]/70 truncate">{item.currency_code || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[var(--dark-600)] p-3 rounded-lg">
                      <Languages className="h-4 w-4 text-[var(--brand-blue)] flex-shrink-0" /> 
                      <span className="text-sm text-[var(--brand-light)]/70 truncate">{item.default_language || '—'}</span>
                    </div>
                  </div>
                </div>
              </SwipeableCard>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--dark-600)]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Country</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Code</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Currency</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Language</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Timezone</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Actions</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`${index !== countries.length - 1 ? 'border-b border-[var(--dark-600)]/50' : ''} hover:bg-[var(--dark-700)]/30 transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--dark-700)] border border-[var(--dark-500)] flex items-center justify-center overflow-hidden">
                          {item.avatar ? (
                            <img src={getMediaUrl(item.avatar)} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-[var(--brand-light)]/50">{item.country_code}</span>
                          )}
                        </div>
                        <span className="font-semibold text-[var(--brand-light)]">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-1 bg-[var(--dark-600)] rounded-lg text-xs font-mono text-[var(--brand-light)]/70">
                        {item.country_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--brand-light)]/60">{item.currency_code || '—'}</td>
                    <td className="px-6 py-4 text-[var(--brand-light)]/60">{item.default_language || '—'}</td>
                    <td className="px-6 py-4 text-[var(--brand-light)]/60 text-sm">{item.timezone || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={buildUrlWithParams(`${basePath}/${item.id}`)}>
                          <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                        <Link href={buildUrlWithParams(`${basePath}/edit/${item.id}`)}>
                          <button className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all">
                            <Edit className="w-4 h-4" />
                          </button>
                        </Link>
                        <button 
                          onClick={() => setItemToDelete(item)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modals */}
      <ConfirmationModal 
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        variant="danger"
        title="Delete Country"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        darkMode={true}
      />
      <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} darkMode />
    </div>
  );
}
