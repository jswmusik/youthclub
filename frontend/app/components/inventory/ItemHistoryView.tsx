'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { inventoryApi, Item } from '@/lib/inventory-api';
import LendingHistoryTable from '@/app/components/inventory/LendingHistoryTable';
import { BarChart3, ChevronDown, Package, Users, CheckCircle, Clock, Filter } from 'lucide-react';

interface HistoryAnalytics {
  total_borrowed: number;
  borrowed_male: number;
  borrowed_female: number;
  borrowed_other: number;
  returned: number;
  active: number;
}

interface ItemHistoryViewProps {
  itemId: string;
  basePath: string;
}

export default function ItemHistoryView({ itemId, basePath }: ItemHistoryViewProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [item, setItem] = useState<Item | null>(null);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [itemLoading, setItemLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [analytics, setAnalytics] = useState<HistoryAnalytics | null>(null);
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    
    // Get filter values from URL
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;

    useEffect(() => {
        loadItem();
    }, [itemId]);

    useEffect(() => {
        if (item) {
            loadHistory();
            loadAnalytics();
        }
    }, [item, searchParams]);

    const loadItem = async () => {
        try {
            setItemLoading(true);
            const data = await inventoryApi.getItem(itemId);
            setItem(data);
        } catch (err) {
            console.error('Failed to load item', err);
        } finally {
            setItemLoading(false);
        }
    };

    const loadHistory = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            
            // Always filter by this item
            params.append('item', itemId);
            
            // Add filters from URL
            if (search) params.append('search', search);
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
            // Load analytics filtered by this item
            const data = await inventoryApi.getHistoryAnalytics(Number(itemId));
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

    const buildUrlWithParams = (path: string) => {
        const params = new URLSearchParams();
        const page = searchParams.get('page');
        const searchParam = searchParams.get('search');
        const category = searchParams.get('category');
        const status = searchParams.get('status');
        const club = searchParams.get('club');
        
        if (page && page !== '1') params.set('page', page);
        if (searchParam) params.set('search', searchParam);
        if (category) params.set('category', category);
        if (status) params.set('status', status);
        if (club) params.set('club', club);
        
        const queryString = params.toString();
        return queryString ? `${path}?${queryString}` : path;
    };

    if (itemLoading) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500">Loading item details...</p>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-800">Item not found.</p>
                </div>
                <Link href={buildUrlWithParams(basePath)} className="text-blue-600 hover:text-blue-800 font-medium">
                    ← Back to Inventory
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Lending History</h1>
                    <p className="text-slate-500">
                        History for <span className="font-semibold text-slate-700">{item.title}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link 
                        href={`${basePath}/view/${item.id}?${searchParams.toString()}`}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        Back to Item
                    </Link>
                </div>
            </div>

            {/* Analytics Dashboard - Collapsible */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Analytics Header */}
                <button
                    onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <BarChart3 className="w-5 h-5 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-700">Analytics Dashboard</span>
                    </div>
                    <ChevronDown 
                        className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${analyticsExpanded ? 'rotate-180' : ''}`}
                    />
                </button>

                {/* Analytics Cards - Collapsible */}
                <div 
                    className={`border-t border-gray-200 transition-all duration-300 ease-in-out ${
                        analyticsExpanded 
                            ? 'max-h-[500px] opacity-100' 
                            : 'max-h-0 opacity-0'
                    } overflow-hidden`}
                >
                    {analyticsLoading ? (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="bg-gray-50 p-5 rounded-lg border border-gray-200 animate-pulse">
                                    <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
                                    <div className="h-10 bg-gray-200 rounded w-16"></div>
                                </div>
                            ))}
                        </div>
                    ) : analytics ? (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Total Items Borrowed */}
                            <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Borrowed</h3>
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <Package className="w-5 h-5 text-blue-600" />
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{analytics.total_borrowed}</p>
                            </div>

                            {/* Demographics - Combined */}
                            <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-purple-300 hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Demographics</h3>
                                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-purple-600" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Male:</span>
                                        <span className="text-lg font-bold text-indigo-600">{analytics.borrowed_male}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Female:</span>
                                        <span className="text-lg font-bold text-pink-600">{analytics.borrowed_female}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Other:</span>
                                        <span className="text-lg font-bold text-purple-600">{analytics.borrowed_other}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Returned */}
                            <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-green-300 hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Returned</h3>
                                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-green-600">{analytics.returned}</p>
                            </div>

                            {/* Active */}
                            <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-orange-300 hover:shadow-sm transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Active</h3>
                                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-orange-600" />
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-orange-600">{analytics.active}</p>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Filters - Collapsible */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Filters Header */}
                <button
                    onClick={() => setFiltersExpanded(!filtersExpanded)}
                    className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-700">Filters</span>
                    </div>
                    <ChevronDown 
                        className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`}
                    />
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
                                    placeholder="Search by borrower..." 
                                    className="w-full border rounded p-2 text-sm bg-gray-50"
                                    value={search}
                                    onChange={(e) => updateUrl('search', e.target.value)}
                                />
                            </div>

                            {/* Start Date */}
                            <div className="w-48">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                                <input
                                    type="date"
                                    className="w-full border rounded p-2 text-sm bg-gray-50"
                                    value={startDate}
                                    onChange={(e) => updateUrl('start_date', e.target.value)}
                                />
                            </div>

                            {/* End Date */}
                            <div className="w-48">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                                <input
                                    type="date"
                                    className="w-full border rounded p-2 text-sm bg-gray-50"
                                    value={endDate}
                                    onChange={(e) => updateUrl('end_date', e.target.value)}
                                    min={startDate || undefined}
                                />
                            </div>

                            {/* Clear Filters */}
                            <div className="flex items-end">
                                <button
                                    onClick={clearFilters}
                                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Table */}
            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading history...</div>
            ) : (
                <LendingHistoryTable sessions={sessions} />
            )}

            {/* Pagination Controls */}
            {(() => {
                const totalPages = Math.ceil(totalCount / pageSize);
                
                if (totalPages <= 1) return null;
                
                return (
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
                );
            })()}
        </div>
    );
}

