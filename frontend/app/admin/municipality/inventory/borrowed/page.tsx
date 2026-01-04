'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import api from '@/lib/api';
import { inventoryApi, Item } from '@/lib/inventory-api';
import LendingHistoryTable from '@/app/components/inventory/LendingHistoryTable';
import { 
    Clock, AlertCircle, Search, X, Package, ArrowLeft, ChevronUp, ChevronDown, 
    BarChart3, CheckCircle2, Users
} from 'lucide-react';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { useToast } from '../../../../../hooks/useToast';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

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

function BorrowedCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

function BorrowedTableRowSkeleton() {
  return (
    <tr className="border-b border-[var(--dark-600)]/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
          <Skeleton className="h-5 w-32" />
        </div>
      </td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-28" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-28" /></td>
      <td className="px-6 py-4"><Skeleton className="h-5 w-28" /></td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-9 w-24 rounded-xl" /></td>
    </tr>
  );
}

export default function MunicipalityBorrowedItemsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const t = useTranslations('inventoryAdmin.borrowed');
    
    const [sessions, setSessions] = useState([]);
    const [items, setItems] = useState<Item[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [returningItemId, setReturningItemId] = useState<number | null>(null);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const { success, error, info, warning } = useToast();
    
    // Filter state
    const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
    const [selectedItemId, setSelectedItemId] = useState(searchParams.get('item') || '');
    const [selectedClubId, setSelectedClubId] = useState(searchParams.get('club') || '');
    
    // Track initial values to detect actual user changes
    const initialSearchRef = useRef(searchParams.get('search') || '');
    const initialItemRef = useRef(searchParams.get('item') || '');
    const initialClubRef = useRef(searchParams.get('club') || '');
    const hasUserChangedFilters = useRef(false);
    
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;

    // Debounced filter update - only reset page when user actually changes filters
    useEffect(() => {
        const searchChanged = searchInput !== initialSearchRef.current;
        const itemChanged = selectedItemId !== initialItemRef.current;
        const clubChanged = selectedClubId !== initialClubRef.current;
        
        if (!searchChanged && !itemChanged && !clubChanged && !hasUserChangedFilters.current) {
            return;
        }
        
        hasUserChangedFilters.current = true;

        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (searchInput) params.set('search', searchInput); else params.delete('search');
            if (selectedItemId) params.set('item', selectedItemId); else params.delete('item');
            if (selectedClubId) params.set('club', selectedClubId); else params.delete('club');
            params.set('page', '1');
            router.replace(`${pathname}?${params.toString()}`);
            
            // Update refs to current values
            initialSearchRef.current = searchInput;
            initialItemRef.current = selectedItemId;
            initialClubRef.current = selectedClubId;
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput, selectedItemId, selectedClubId, pathname, router]);

    useEffect(() => {
        loadItems();
        loadClubs();
    }, []);

    useEffect(() => {
        loadBorrowedItems();
    }, [searchParams]);

    const loadItems = async () => {
        try {
            const data = await inventoryApi.getItems();
            const itemsList = Array.isArray(data) ? data : (data.results || []);
            setItems(itemsList);
        } catch (err) {
            console.error('Failed to load items for filter', err);
            setItems([]);
        }
    };

    const loadClubs = async () => {
        try {
            const data = await inventoryApi.getSelectableClubs();
            const clubsList = Array.isArray(data) ? data : (data.results || []);
            setClubs(clubsList);
        } catch (err) {
            console.error('Failed to load clubs for filter', err);
            setClubs([]);
        }
    };

    const loadBorrowedItems = async () => {
        setLoading(true);
        setShowSkeleton(true);
        const startTime = Date.now();
        
        try {
            const params = new URLSearchParams();
            params.append('status', 'ACTIVE');
            
            const search = searchParams.get('search');
            const item = searchParams.get('item');
            const club = searchParams.get('club');
            const page = searchParams.get('page') || '1';
            
            if (search) params.append('search', search);
            if (item) params.append('item', item);
            if (club) params.append('club', club);
            params.append('page', page);
            params.append('page_size', String(pageSize));
            
            const queryString = params.toString();
            const url = `/inventory/history/?${queryString}`;
            
            const res = await api.get(url);
            const data = res.data;
            
            if (Array.isArray(data)) {
                setSessions(data);
                setTotalCount(data.length);
            } else {
                setSessions(data.results || []);
                setTotalCount(data.count || 0);
            }
        } catch (err) {
            console.error(err);
            setSessions([]);
            setTotalCount(0);
        } finally {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
            
            setTimeout(() => {
                setLoading(false);
                setShowSkeleton(false);
            }, remaining);
        }
    };

    const handleReturnItem = async (itemId: number) => {
        setReturningItemId(itemId);
        setShowReturnModal(true);
    };

    const handleReturnConfirm = async () => {
        if (!returningItemId) return;
        
        try {
            await inventoryApi.returnItem(returningItemId);
            success(t('toast.itemReturned'));
            setShowReturnModal(false);
            setReturningItemId(null);
            loadBorrowedItems();
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || t('toast.failedToReturn');
            error(errorMessage);
        }
    };

    const clearFilters = () => {
        setSearchInput('');
        setSelectedItemId('');
        setSelectedClubId('');
        router.push(pathname);
    };

    const handlePageChange = (p: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', p.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    // Calculate overdue count
    const now = new Date();
    const overdueCount = sessions.filter((session: any) => {
        if (!session.due_at) return false;
        return new Date(session.due_at) < now;
    }).length;

    // Calculate analytics
    const analytics = {
        total_borrowed: sessions.length,
        overdue: overdueCount,
        on_time: sessions.length - overdueCount,
        active_loans: sessions.filter((s: any) => s.status === 'ACTIVE').length,
    };

    const selectArrowStyle = {
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.75rem center',
        backgroundSize: '1rem'
    };

    const hasFilters = searchInput || selectedItemId || selectedClubId;
    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="min-h-screen bg-[var(--dark-900)]">
            <div className="py-4 sm:py-8 px-0 space-y-6">
                {/* Navigation Header */}
                <div className="flex items-center gap-4 px-4 sm:px-0 mb-6">
                    <Link 
                        href="/admin/municipality/inventory"
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                                <Users className="w-5 h-5 text-[var(--dark-900)]" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
                        </div>
                        <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
                    </div>
                </div>

                {/* Analytics Dashboard */}
                {!showSkeleton && (
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                        <button 
                            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
                            className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[var(--dark-700)]/30 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                                    <BarChart3 className="h-4 w-4 text-[var(--brand-purple)]" />
                                </div>
                                <h3 className="text-sm font-semibold text-[var(--brand-light)]">{t('analyticsDashboard')}</h3>
                            </div>
                            {analyticsExpanded ? (
                                <ChevronUp className="h-4 w-4 text-[var(--brand-light)]/50" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-[var(--brand-light)]/50" />
                            )}
                        </button>
                        
                        <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
                            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                
                                {/* Total Borrowed */}
                                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                                            <Package className="h-5 w-5 text-[var(--dark-900)]" />
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.total')}</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_borrowed}</div>
                                </div>

                                {/* Overdue */}
                                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-red)]/50 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-[var(--brand-red)] flex items-center justify-center">
                                            <AlertCircle className="h-5 w-5 text-[var(--dark-900)]" />
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.overdue')}</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-red)]">{analytics.overdue}</div>
                                </div>

                                {/* On Time */}
                                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                                            <CheckCircle2 className="h-5 w-5 text-[var(--dark-900)]" />
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.onTime')}</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{analytics.on_time}</div>
                                </div>

                                {/* Active Loans */}
                                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                                            <Clock className="h-5 w-5 text-[var(--dark-900)]" />
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.active')}</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.active_loans}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Overdue Warning */}
                {!showSkeleton && overdueCount > 0 && (
                    <div className="bg-[var(--brand-red)]/10 rounded-none sm:rounded-xl border-y sm:border border-[var(--brand-red)]/30 px-4 py-4 mx-0 sm:mx-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--brand-red)]/20 flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="w-5 h-5 text-[var(--brand-red)]" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--brand-red)]">
                                    {t(overdueCount === 1 ? 'overdueWarning.itemOverdue' : 'overdueWarning.itemsOverdue', { count: overdueCount })}
                                </p>
                                <p className="text-xs text-[var(--brand-light)]/50 mt-0.5">{t('overdueWarning.highlightedMessage')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search & Filters */}
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 py-3">
                    <div className="flex flex-col gap-3">
                        {/* Search Row */}
                        <div className="flex items-center gap-3">
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
                        
                        {/* Filters Row */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="w-full sm:w-[160px]">
                                <select 
                                    className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                                    value={selectedClubId}
                                    onChange={e => setSelectedClubId(e.target.value)}
                                    style={selectArrowStyle}
                                >
                                    <option value="">{t('filters.allClubs')}</option>
                                    {clubs.map((club) => (
                                        <option key={club.id} value={club.id}>
                                            {club.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-full sm:w-[180px]">
                                <select 
                                    className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                                    value={selectedItemId}
                                    onChange={e => setSelectedItemId(e.target.value)}
                                    style={selectArrowStyle}
                                >
                                    <option value="">{t('filters.allItems')}</option>
                                    {items.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {hasFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="px-4 py-2 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-xl transition-all flex items-center gap-2"
                                >
                                    <X className="h-4 w-4" /> {t('filters.clear')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Bar */}
                {!showSkeleton && sessions.length > 0 && (
                    <div className="px-4 sm:px-0">
                        <p className="text-sm text-[var(--brand-light)]/50">
                            {t('statsBar.showing')} <span className="text-[var(--brand-primary)] font-semibold">{sessions.length}</span> {t('statsBar.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> {t('statsBar.borrowed')} {totalCount === 1 ? t('statsBar.item') : t('statsBar.items')}
                        </p>
                    </div>
                )}

                {/* Content */}
                {showSkeleton ? (
                    <>
                        {/* Mobile Cards Skeleton */}
                        <div className="flex flex-col md:hidden">
                            {[...Array(4)].map((_, i) => (
                                <BorrowedCardSkeleton key={i} />
                            ))}
                        </div>

                        {/* Desktop Table Skeleton */}
                        <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--dark-600)]">
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.item')}</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.borrower')}</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.timeOut')}</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.dueDate')}</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.timeIn')}</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
                                        <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...Array(5)].map((_, i) => (
                                        <BorrowedTableRowSkeleton key={i} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : sessions.length === 0 ? (
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-[var(--brand-light)]/30" />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.noBorrowedItems')}</h3>
                        <p className="text-[var(--brand-light)]/50 text-sm">{t('emptyState.allItemsReturned')}</p>
                    </div>
                ) : (
                    <LendingHistoryTable 
                        sessions={sessions} 
                        showReturnButton={true}
                        onReturnItem={handleReturnItem}
                    />
                )}

                {/* Pagination */}
                {!showSkeleton && totalPages > 1 && (
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

                {/* Return Confirmation Modal */}
                <ConfirmationModal
                    isVisible={showReturnModal}
                    onClose={() => {
                        setShowReturnModal(false);
                        setReturningItemId(null);
                    }}
                    onConfirm={handleReturnConfirm}
                    title={t('modals.returnItem.title')}
                    message={t('modals.returnItem.message')}
                    confirmButtonText={t('modals.returnItem.confirm')}
                    variant="info"
                    darkMode={true}
                />

            </div>
        </div>
    );
}
