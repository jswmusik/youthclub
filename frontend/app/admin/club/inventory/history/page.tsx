'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { inventoryApi, Item } from '@/lib/inventory-api';
import LendingHistoryTable from '@/app/components/inventory/LendingHistoryTable';
import { 
    BarChart3, ChevronUp, ChevronDown, Package, CheckCircle2, Clock, Search, X, Calendar, 
    ArrowLeft, UsersRound, History
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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

function HistoryCardSkeleton() {
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

function HistoryTableRowSkeleton() {
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
    </tr>
  );
}

interface HistoryAnalytics {
  total_borrowed: number;
  borrowed_male: number;
  borrowed_female: number;
  borrowed_other: number;
  returned: number;
  active: number;
}

export default function InventoryHistoryPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    
    const [sessions, setSessions] = useState([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [analytics, setAnalytics] = useState<HistoryAnalytics | null>(null);
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    
    // Filter state
    const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
    const [selectedItemId, setSelectedItemId] = useState(searchParams.get('item') || '');
    const [startDate, setStartDate] = useState(searchParams.get('start_date') || '');
    const [endDate, setEndDate] = useState(searchParams.get('end_date') || '');
    
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;

    // Debounced filter update
    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (searchInput) params.set('search', searchInput); else params.delete('search');
            if (selectedItemId) params.set('item', selectedItemId); else params.delete('item');
            if (startDate) params.set('start_date', startDate); else params.delete('start_date');
            if (endDate) params.set('end_date', endDate); else params.delete('end_date');
            params.set('page', '1');
            router.replace(`${pathname}?${params.toString()}`);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput, selectedItemId, startDate, endDate]);

    useEffect(() => {
        if (user?.assigned_club) {
            loadItems();
        }
    }, [user]);

    useEffect(() => {
        if (user?.assigned_club) {
            loadHistory();
            loadAnalytics();
        }
    }, [searchParams, user]);

    const loadItems = async () => {
        if (!user?.assigned_club) return;
        
        try {
            // Load items for the filter dropdown - only items from the admin's club
            const data = await inventoryApi.getClubItems(user.assigned_club.id);
            const itemsList = Array.isArray(data) ? data : (data.results || []);
            setItems(itemsList);
        } catch (err) {
            console.error('Failed to load items for filter', err);
            setItems([]);
        }
    };

    const loadHistory = async () => {
        setLoading(true);
        setShowSkeleton(true);
        const startTime = Date.now();
        
        try {
            const params = new URLSearchParams();
            
            const search = searchParams.get('search');
            const item = searchParams.get('item');
            const start = searchParams.get('start_date');
            const end = searchParams.get('end_date');
            const page = searchParams.get('page') || '1';
            
            if (search) params.append('search', search);
            if (item) params.append('item', item);
            if (start) params.append('start_date', start);
            if (end) params.append('end_date', end);
            params.append('page', page);
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
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
            
            setTimeout(() => {
                setLoading(false);
                setShowSkeleton(false);
            }, remaining);
        }
    };

    const loadAnalytics = async () => {
        try {
            setAnalyticsLoading(true);
            const data = await inventoryApi.getHistoryAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error("Failed to load history analytics", error);
            setAnalytics(null);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const clearFilters = () => {
        setSearchInput('');
        setSelectedItemId('');
        setStartDate('');
        setEndDate('');
        router.push(pathname);
    };

    const handlePageChange = (p: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', p.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const selectArrowStyle = {
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.75rem center',
        backgroundSize: '1rem'
    };

    const hasFilters = searchInput || selectedItemId || startDate || endDate;
    const totalPages = Math.ceil(totalCount / pageSize);

    if (!user?.assigned_club) {
        return (
            <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[var(--brand-light)]/60">Loading club data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--dark-900)]">
            <div className="py-4 sm:py-8 px-0 space-y-6">
                {/* Navigation Header */}
                <div className="flex items-center gap-4 px-4 sm:px-6 mb-6">
                    <Link 
                        href="/admin/club/inventory"
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                <History className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Lending History</h1>
                        </div>
                        <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">See who borrowed items and when.</p>
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
                                <h3 className="text-sm font-semibold text-[var(--brand-light)]">Analytics Dashboard</h3>
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
                                        <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Total</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_borrowed}</div>
                                </div>

                                {/* Demographics */}
                                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center">
                                            <UsersRound className="h-5 w-5 text-white" />
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Demographics</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[var(--brand-light)]/50">Male:</span>
                                            <span className="font-bold text-[var(--brand-light)]">{analytics.borrowed_male}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[var(--brand-light)]/50">Female:</span>
                                            <span className="font-bold text-[var(--brand-light)]">{analytics.borrowed_female}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[var(--brand-light)]/50">Other:</span>
                                            <span className="font-bold text-[var(--brand-light)]">{analytics.borrowed_other}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Returned */}
                                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center">
                                            <CheckCircle2 className="h-5 w-5 text-[var(--dark-900)]" />
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Returned</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{analytics.returned}</div>
                                </div>

                                {/* Active */}
                                <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[#38BDF8] flex items-center justify-center">
                                            <Clock className="h-5 w-5 text-white" />
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Active</span>
                                    </div>
                                    <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.active}</div>
                                </div>
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
                                placeholder="Search by item or borrower..." 
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
                            <div className="w-full sm:w-[180px]">
                                <select 
                                    className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                                    value={selectedItemId}
                                    onChange={e => setSelectedItemId(e.target.value)}
                                    style={selectArrowStyle}
                                >
                                    <option value="">All Items</option>
                                    {items.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 sm:flex-none sm:w-[150px]">
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40" />
                                    <input
                                        type="date"
                                        className="w-full h-10 pl-10 pr-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 sm:flex-none sm:w-[150px]">
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-light)]/40" />
                                    <input
                                        type="date"
                                        className="w-full h-10 pl-10 pr-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        min={startDate || undefined}
                                    />
                                </div>
                            </div>
                            {hasFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="px-4 py-2 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-xl transition-all flex items-center gap-2"
                                >
                                    <X className="h-4 w-4" /> Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Bar */}
                {!showSkeleton && sessions.length > 0 && (
                    <div className="px-4 sm:px-6">
                        <p className="text-sm text-[var(--brand-light)]/50">
                            Showing <span className="text-[var(--brand-primary)] font-semibold">{sessions.length}</span> of <span className="text-[var(--brand-primary)] font-semibold">{totalCount}</span> {totalCount === 1 ? 'record' : 'records'}
                        </p>
                    </div>
                )}

                {/* Content */}
                {showSkeleton ? (
                    <>
                        {/* Mobile Cards Skeleton */}
                        <div className="flex flex-col md:hidden">
                            {[...Array(4)].map((_, i) => (
                                <HistoryCardSkeleton key={i} />
                            ))}
                        </div>

                        {/* Desktop Table Skeleton */}
                        <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden mx-6">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--dark-600)]">
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Item</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Borrower</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Time Out</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Due Date</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Time In</th>
                                        <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...Array(5)].map((_, i) => (
                                        <HistoryTableRowSkeleton key={i} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <LendingHistoryTable sessions={sessions} />
                )}

                {/* Pagination */}
                {!showSkeleton && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 py-4 px-4 sm:px-0">
                        <button 
                            disabled={currentPage === 1} 
                            onClick={() => handlePageChange(currentPage - 1)}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <div className="text-sm text-[var(--brand-light)]/50">
                            Page <span className="text-[var(--brand-primary)] font-semibold">{currentPage}</span> of <span className="text-[var(--brand-primary)] font-semibold">{totalPages}</span>
                        </div>
                        <button 
                            disabled={currentPage >= totalPages} 
                            onClick={() => handlePageChange(currentPage + 1)}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
