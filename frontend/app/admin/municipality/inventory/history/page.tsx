'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import api from '@/lib/api';
import { inventoryApi, Item } from '@/lib/inventory-api';
import LendingHistoryTable from '@/app/components/inventory/LendingHistoryTable';
import { BarChart3, ChevronUp, ChevronDown, Package, CheckCircle, Clock, Search, X, Calendar, ChevronLeft, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoryAnalytics {
  total_borrowed: number;
  borrowed_male: number;
  borrowed_female: number;
  borrowed_other: number;
  returned: number;
  active: number;
}

export default function MunicipalityInventoryHistoryPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const t = useTranslations('inventoryAdmin.globalHistory');
    
    const [sessions, setSessions] = useState([]);
    const [items, setItems] = useState<Item[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [analytics, setAnalytics] = useState<HistoryAnalytics | null>(null);
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    
    // Get filter values from URL
    const search = searchParams.get('search') || '';
    const selectedItemId = searchParams.get('item') ? Number(searchParams.get('item')) : null;
    const selectedClubId = searchParams.get('club') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;

    useEffect(() => {
        loadItems();
        loadClubs();
        loadHistory();
        loadAnalytics();
    }, []);

    useEffect(() => {
        loadHistory();
        loadAnalytics();
    }, [searchParams]);

    const loadItems = async () => {
        try {
            // Load all items from clubs in the municipality
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

    const loadHistory = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            
            // Add filters from URL
            if (search) params.append('search', search);
            if (selectedItemId) params.append('item', String(selectedItemId));
            if (selectedClubId) params.append('club', selectedClubId);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            
            // Add pagination
            params.append('page', String(currentPage));
            params.append('page_size', String(pageSize));
            
            const queryString = params.toString();
            const url = `/inventory/history/?${queryString}`;
            
            const res = await api.get(url);
            const data = res.data;
            
            // Handle paginated response
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
            setLoading(false);
        }
    };

    const loadAnalytics = async () => {
        try {
            setAnalyticsLoading(true);
            const clubId = selectedClubId ? Number(selectedClubId) : undefined;
            const data = await inventoryApi.getHistoryAnalytics(clubId);
            setAnalytics(data);
        } catch (error) {
            console.error("Failed to load history analytics", error);
            setAnalytics(null);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const updateUrl = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        // Reset page to 1 when filters change (except when changing page itself)
        if (key !== 'page') {
            params.set('page', '1');
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const clearFilters = () => {
        router.push(pathname);
    };

    return (
        <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-6 md:py-8 px-0 space-y-6">
            {/* Header */}
            <div className="px-4 sm:px-6 md:px-8">
                <Link href="/admin/municipality/inventory">
                    <button className="flex items-center gap-2 text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] transition-colors mb-4">
                        <ChevronLeft className="h-4 w-4" />
                        {t('backToInventory')}
                    </button>
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
                    <p className="text-[var(--brand-light)]/50 text-sm mt-1">{t('description')}</p>
                </div>
            </div>

            {/* Analytics Dashboard */}
            {!analyticsLoading && analytics && (
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
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                        <Package className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.totalBorrowed')}</span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_borrowed}</div>
                            </div>

                            {/* Demographics */}
                            <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-red)]/50 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-red)] to-[var(--brand-peach)] flex items-center justify-center">
                                        <UsersRound className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.demographics')}</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs sm:text-sm">
                                        <span className="text-[var(--brand-light)]/60">{t('analytics.male')}:</span>
                                        <span className="font-bold text-[var(--brand-light)]">{analytics.borrowed_male}</span>
                                    </div>
                                    <div className="flex justify-between text-xs sm:text-sm">
                                        <span className="text-[var(--brand-light)]/60">{t('analytics.female')}:</span>
                                        <span className="font-bold text-[var(--brand-light)]">{analytics.borrowed_female}</span>
                                    </div>
                                    <div className="flex justify-between text-xs sm:text-sm">
                                        <span className="text-[var(--brand-light)]/60">{t('analytics.other')}:</span>
                                        <span className="font-bold text-[var(--brand-light)]">{analytics.borrowed_other}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Returned */}
                            <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center">
                                        <CheckCircle className="h-5 w-5 text-[var(--dark-900)]" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.returned')}</span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.returned}</div>
                            </div>

                            {/* Active */}
                            <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[#38BDF8] flex items-center justify-center">
                                        <Clock className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('analytics.active')}</span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.active}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics Loading Skeleton */}
            {analyticsLoading && (
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                    <div className="px-4 sm:px-6 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] animate-pulse">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-[var(--dark-600)]" />
                                        <div className="h-4 w-20 bg-[var(--dark-600)] rounded" />
                                    </div>
                                    <div className="h-8 w-16 bg-[var(--dark-600)] rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] px-4 py-3">
                <div className="flex flex-col gap-3">
                    {/* Search Row */}
                    <div className="flex items-center gap-3">
                        <Search className="h-5 w-5 text-[var(--brand-light)]/40 flex-shrink-0" />
                        <input 
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            className="flex-1 bg-transparent text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none text-base"
                            value={search}
                            onChange={e => updateUrl('search', e.target.value)}
                        />
                        {search && (
                            <button 
                                onClick={() => updateUrl('search', '')}
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
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23EDEBF4' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 0.75rem center',
                                    backgroundSize: '12px'
                                }}
                                value={selectedClubId}
                                onChange={e => updateUrl('club', e.target.value)}
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
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23EDEBF4' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 0.75rem center',
                                    backgroundSize: '12px'
                                }}
                                value={selectedItemId || ''}
                                onChange={e => updateUrl('item', e.target.value)}
                            >
                                <option value="">{t('filters.allItems')}</option>
                                {items.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="w-full sm:w-[160px]">
                            <input
                                type="date"
                                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                                value={startDate}
                                onChange={e => updateUrl('start_date', e.target.value)}
                            />
                        </div>
                        
                        <div className="w-full sm:w-[160px]">
                            <input
                                type="date"
                                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                                value={endDate}
                                onChange={e => updateUrl('end_date', e.target.value)}
                                min={startDate || undefined}
                            />
                        </div>
                        
                        {(search || selectedClubId || selectedItemId || startDate || endDate) && (
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

            {/* History Table */}
            <div className="px-4 sm:px-6 md:px-8">
                {loading ? (
                    <div className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] p-12 text-center text-[var(--brand-light)]/50">
                        {t('loading')}
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] p-12 text-center text-[var(--brand-light)]/50">
                        {t('emptyState')}
                    </div>
                ) : (
                    <LendingHistoryTable sessions={sessions} />
                )}
            </div>

            {/* Pagination */}
            {(() => {
                const totalPages = Math.ceil(totalCount / pageSize);
                if (totalPages <= 1) return null;
                
                return (
                    <div className="flex items-center justify-center gap-3 py-4 px-4 sm:px-6 md:px-8">
                        <button 
                            disabled={currentPage === 1} 
                            onClick={() => updateUrl('page', (currentPage - 1).toString())}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {t('pagination.previous')}
                        </button>
                        <div className="text-sm text-[var(--brand-light)]/50">
                            {t('pagination.page')} <span className="text-[var(--brand-primary)] font-semibold">{currentPage}</span> {t('pagination.of')} <span className="text-[var(--brand-primary)] font-semibold">{totalPages}</span>
                        </div>
                        <button 
                            disabled={currentPage >= totalPages} 
                            onClick={() => updateUrl('page', (currentPage + 1).toString())}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {t('pagination.next')}
                        </button>
                    </div>
                );
            })()}
        </div>
    );
}

