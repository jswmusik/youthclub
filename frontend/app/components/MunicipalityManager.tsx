'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { 
  Plus, Search, MapPin, Globe, 
  Trash2, Edit, Eye, BarChart3, ChevronDown, ChevronUp,
  Building2, CheckCircle, XCircle, ChevronLeft
} from 'lucide-react';
import api from '../../lib/api';
import { getMediaUrl } from '../../app/utils';

// Modals
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '../../hooks/useToast';

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
  const t = useTranslations('municipalitiesAdmin');
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
          <span className="text-xs font-medium">{t('actions.edit')}</span>
        </button>
        <button
          onClick={handleDeleteClick}
          className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-red)] text-white transition-all active:bg-[var(--brand-red)]/80"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs font-medium">{t('actions.delete')}</span>
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

function MunicipalityCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-28 rounded-full mt-2" />
        </div>
      </div>
    </div>
  );
}

function MunicipalityTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
          <Skeleton className="h-5 w-32" />
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
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

function MunicipalitiesPageSkeleton() {
  const t = useTranslations('municipalitiesAdmin');
  return (
    <>
      {/* Mobile Cards Skeleton */}
      <div className="flex flex-col gap-3 md:hidden">
        {[...Array(4)].map((_, i) => (
          <MunicipalityCardSkeleton key={i} />
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--dark-600)]">
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.municipality')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.country')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.code')}</th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.registration')}</th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <MunicipalityTableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface MunicipalityManagerProps {
  basePath: string;
}

export default function MunicipalityManager({ basePath }: MunicipalityManagerProps) {
  const t = useTranslations('municipalitiesAdmin');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  
  // Analytics data
  const [allMunicipalitiesForAnalytics, setAllMunicipalitiesForAnalytics] = useState<any[]>([]);
  
  // Delete
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const { success, error, info, warning } = useToast();

  // Inputs
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [countryFilter, setCountryFilter] = useState(searchParams.get('country') || '');

  useEffect(() => {
    api.get('/countries/').then(res => {
        setCountries(Array.isArray(res.data) ? res.data : res.data.results || []);
    });
    fetchAllMunicipalitiesForAnalytics();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) params.set('search', searchInput); else params.delete('search');
        if (countryFilter) params.set('country', countryFilter); else params.delete('country');
        params.set('page', '1'); // Reset page on filter change
        router.replace(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, countryFilter, router, pathname]);

  useEffect(() => {
    fetchData();
  }, [searchParams]);

  const fetchAllMunicipalitiesForAnalytics = async () => {
    try {
      const res = await api.get('/municipalities/?page_size=100');
      const data = res.data.results || (Array.isArray(res.data) ? res.data : []);
      setAllMunicipalitiesForAnalytics(data);
    } catch (err) { console.error(err); }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setShowSkeleton(true);
    const startTime = Date.now();
    
    try {
      const params = new URLSearchParams(searchParams.toString());
      if (!params.has('page_size')) params.set('page_size', '10');
      
      const res = await api.get(`/municipalities/?${params.toString()}`);
      if (Array.isArray(res.data)) {
        setMunicipalities(res.data);
        setTotalCount(res.data.length);
      } else {
        setMunicipalities(res.data.results || []);
        setTotalCount(res.data.count || 0);
      }
    } catch (err) { console.error(err); } 
    finally {
      // Ensure minimum loading time for skeleton display
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      
      setTimeout(() => {
        setLoading(false);
        setShowSkeleton(false);
      }, remaining);
    }
  }, [searchParams]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/municipalities/${itemToDelete.id}/`);
      success(t('toast.deleteSuccess'));
      fetchData();
      fetchAllMunicipalitiesForAnalytics();
    } catch (err) {
      error(t('toast.deleteFailed'));
    } finally {
      setItemToDelete(null);
    }
  };

  const buildUrlWithParams = (path: string) => {
    const queryString = searchParams.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const analytics = {
    total: allMunicipalitiesForAnalytics.length,
    active: allMunicipalitiesForAnalytics.filter((m: any) => m.allow_self_registration).length
  };

  // Pagination
  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = Math.ceil(totalCount / 10);
  const handlePageChange = (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', newPage.toString());
      router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
          </div>
          <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
        </div>
        <Link href={`${basePath}/create`}>
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
            <Plus className="h-4 w-4" /> {t('addMunicipality')}
          </button>
        </Link>
      </div>

      {/* Analytics Dashboard */}
      {!showSkeleton && (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
          {/* Header */}
          <button 
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[var(--dark-700)]/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-[var(--brand-purple)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--brand-light)]">{t('analytics.dashboard')}</h3>
            </div>
            <ChevronUp className={`h-4 w-4 text-[var(--brand-light)]/50 transition-transform duration-300 ${analyticsExpanded ? 'rotate-0' : 'rotate-180'}`} />
          </button>
          
          {/* Content */}
          <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Total Municipalities */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.totalMunicipalities')}</span>
                </div>
                <div className="text-3xl font-bold text-[var(--brand-light)]">{analytics.total}</div>
              </div>

              {/* Open for Registration */}
              <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-third)]/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center">
                    <Globe className="h-5 w-5 text-[var(--dark-900)]" />
                  </div>
                  <span className="text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.openForRegistration')}</span>
                </div>
                <div className="text-3xl font-bold text-[var(--brand-third)]">{analytics.active}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 py-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Search className="h-5 w-5 text-[var(--brand-light)]/40 flex-shrink-0" />
            <input 
              type="text"
              placeholder={t('searchPlaceholder')} 
              className="flex-1 bg-transparent text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none text-base"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button 
                onClick={() => setSearchInput('')}
                className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors text-xl"
              >
                ×
              </button>
            )}
          </div>
          <div className="w-full sm:w-[200px]">
            <select 
              className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
              value={countryFilter}
              onChange={e => setCountryFilter(e.target.value)}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1rem'
              }}
            >
              <option value="">{t('allCountries')}</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {!showSkeleton && municipalities.length > 0 && (
        <div className="px-4 sm:px-0">
          <p className="text-sm text-[var(--brand-light)]/50">
            {t('showing')} <span className="text-[var(--brand-primary)] font-semibold">{municipalities.length}</span> {t('pagination.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> {totalCount === 1 ? t('municipality') : t('municipalities')}
          </p>
        </div>
      )}

      {/* Content */}
      {showSkeleton ? (
        <MunicipalitiesPageSkeleton />
      ) : municipalities.length === 0 ? (
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-[var(--brand-light)]/30" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('noMunicipalitiesFound')}</h3>
          <p className="text-[var(--brand-light)]/50 text-sm mb-6">
            {searchInput || countryFilter ? t('noMunicipalitiesMessage') : t('noMunicipalitiesEmptyMessage')}
          </p>
          {!searchInput && !countryFilter && (
            <Link href={`${basePath}/create`}>
              <button className="inline-flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
                <Plus className="h-4 w-4" /> {t('addMunicipality')}
              </button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {municipalities.map((item, index) => (
              <SwipeableCard
                key={item.id}
                onClick={() => router.push(buildUrlWithParams(`${basePath}/${item.id}`))}
                onEdit={() => router.push(buildUrlWithParams(`${basePath}/edit/${item.id}`))}
                onDelete={() => setItemToDelete(item)}
              >
                <div className="border-y border-[var(--dark-600)] p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[var(--dark-600)] border border-[var(--dark-500)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.avatar ? (
                        <img src={getMediaUrl(item.avatar)} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-[var(--brand-primary)]">M</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-[var(--brand-light)] truncate">{item.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Globe className="w-3 h-3 text-[var(--brand-light)]/40" />
                        <p className="text-xs text-[var(--brand-light)]/50 truncate">{item.country_name}</p>
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.allow_self_registration 
                            ? 'bg-[var(--brand-third)]/20 text-[var(--brand-third)]' 
                            : 'bg-[var(--brand-red)]/20 text-[var(--brand-red)]'
                        }`}>
                          {item.allow_self_registration ? (
                            <><CheckCircle className="w-3 h-3" /> {t('registration.openRegistration')}</>
                          ) : (
                            <><XCircle className="w-3 h-3" /> {t('registration.restricted')}</>
                          )}
                        </span>
                      </div>
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
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.municipality')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.country')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.code')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.registration')}</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {municipalities.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`${index !== municipalities.length - 1 ? 'border-b border-[var(--dark-600)]/50' : ''} hover:bg-[var(--dark-700)]/30 transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--dark-700)] border border-[var(--dark-500)] flex items-center justify-center overflow-hidden">
                          {item.avatar ? (
                            <img src={getMediaUrl(item.avatar)} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-[var(--brand-primary)]">M</span>
                          )}
                        </div>
                        <span className="font-semibold text-[var(--brand-light)]">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[var(--brand-light)]/60">{item.country_name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-1 bg-[var(--dark-600)] rounded-lg text-xs font-mono text-[var(--brand-light)]/70">
                        {item.municipality_code || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        item.allow_self_registration 
                          ? 'bg-[var(--brand-third)]/20 text-[var(--brand-third)]' 
                          : 'bg-[var(--brand-red)]/20 text-[var(--brand-red)]'
                      }`}>
                        {item.allow_self_registration ? (
                          <><CheckCircle className="w-3 h-3" /> {t('registration.open')}</>
                        ) : (
                          <><XCircle className="w-3 h-3" /> {t('registration.restricted')}</>
                        )}
                      </span>
                    </td>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-4 px-4 sm:px-0">
              <button 
                disabled={currentPage === 1} 
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('pagination.previous')}
              </button>
              <div className="text-sm text-[var(--brand-light)]/50">
                {t('pagination.page')} <span className="text-[var(--brand-primary)] font-semibold">{currentPage}</span> {t('pagination.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalPages}</span>
              </div>
              <button 
                disabled={currentPage >= totalPages} 
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('pagination.next')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <ConfirmationModal 
        isVisible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        variant="danger"
        title={t('deleteModal.title')}
        message={t('deleteModal.message', { name: itemToDelete?.name })}
        confirmButtonText={t('deleteModal.confirm')}
        cancelButtonText={t('deleteModal.cancel')}
        darkMode={true}
      />
      </div>
  );
}
