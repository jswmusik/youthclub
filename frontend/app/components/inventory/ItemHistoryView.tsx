'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { inventoryApi, Item } from '@/lib/inventory-api';
import LendingHistoryTable from '@/app/components/inventory/LendingHistoryTable';
import { BarChart3, ChevronUp, Package, Users, CheckCircle, Clock, Search, X, ChevronLeft, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
    const [loading, setLoading] = useState(false);
    const [itemLoading, setItemLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [analytics, setAnalytics] = useState<HistoryAnalytics | null>(null);
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [isRedirecting, setIsRedirecting] = useState(false);
    
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
            setIsRedirecting(false); // Reset redirect flag when searchParams change
            loadHistory();
            loadAnalytics();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (!item || isRedirecting) return; // Don't load if item is not loaded yet or redirecting
        
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
            } else if (data && typeof data === 'object') {
                setSessions(data.results || []);
                setTotalCount(data.count || 0);
            } else {
                setSessions([]);
                setTotalCount(0);
            }
        } catch (err: any) {
            console.error('Error loading history:', err);
            const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Failed to load history';
            
            // If it's an "Invalid page" error and we're not on page 1, redirect to page 1
            if (err?.response?.status === 404 && (errorMsg.includes('Invalid page') || errorMsg.includes('page')) && currentPage > 1 && !isRedirecting) {
                console.log('Invalid page number, redirecting to page 1');
                setIsRedirecting(true);
                setLoading(false); // Stop loading before redirect
                // Use router.push directly to update URL and trigger reload
                const params = new URLSearchParams(searchParams.toString());
                params.set('page', '1');
                router.push(`${pathname}?${params.toString()}`);
                return; // Exit early, don't clear sessions
            }
            
            console.error('Error details:', errorMsg);
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
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-pulse text-gray-400">Loading item details...</div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Link href={buildUrlWithParams(basePath)}>
                        <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
                            <ChevronLeft className="h-4 w-4" />
                            Back to Inventory
                        </Button>
                    </Link>
                </div>
                <Card className="border border-red-200 bg-red-50">
                    <CardContent className="p-6">
                        <p className="text-red-800 font-medium">Item not found.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link href={buildUrlWithParams(`${basePath}/view/${item.id}`)}>
                    <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Item
                    </Button>
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Lending History</h1>
                    <p className="text-gray-500 mt-1">
                        History for <span className="font-semibold text-[#121213]">{item.title}</span>
                    </p>
                </div>
            </div>

            {/* Analytics */}
            <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-gray-500" />
                        <h3 className="text-sm font-semibold text-gray-500">Analytics</h3>
                    </div>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0 h-8">
                            <ChevronUp className={cn(
                                "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                                analyticsExpanded ? "rotate-0" : "rotate-180"
                            )} />
                            <span className="sr-only">Toggle Analytics</span>
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="space-y-2">
                    {analyticsLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                            {[1, 2, 3, 4].map((i) => (
                                <Card key={i} className="bg-[#EBEBFE]/30 border-none shadow-sm animate-pulse">
                                    <CardHeader className="pb-2">
                                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : analytics ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                            {/* Total Borrowed */}
                            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Total Borrowed</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.total_borrowed}</div>
                                </CardContent>
                            </Card>

                            {/* Demographics */}
                            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Demographics</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Male:</span>
                                            <span className="font-bold text-[#4D4DA4]">{analytics.borrowed_male}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Female:</span>
                                            <span className="font-bold text-[#4D4DA4]">{analytics.borrowed_female}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Other:</span>
                                            <span className="font-bold text-[#4D4DA4]">{analytics.borrowed_other}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Returned */}
                            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Returned</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">{analytics.returned}</div>
                                </CardContent>
                            </Card>

                            {/* Active */}
                            <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Active</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-[#FF5485]">{analytics.active}</div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : null}
                </CollapsibleContent>
            </Collapsible>

            {/* Filters */}
            <Card className="border border-gray-100 shadow-sm bg-white">
                <div className="p-4 space-y-4">
                    {/* Main Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        {/* Search - Takes more space on larger screens */}
                        <div className="relative md:col-span-5 lg:col-span-4">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Search</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input 
                                    placeholder="Search by borrower..." 
                                    className="pl-9 bg-gray-50 border-0"
                                    value={search}
                                    onChange={e => updateUrl('search', e.target.value)}
                                />
                            </div>
                        </div>
                        
                        {/* Start Date */}
                        <div className="md:col-span-3 lg:col-span-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">From Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    type="date"
                                    className="pl-9 bg-gray-50 border-0"
                                    value={startDate}
                                    onChange={e => updateUrl('start_date', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* End Date */}
                        <div className="md:col-span-3 lg:col-span-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">To Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    type="date"
                                    className="pl-9 bg-gray-50 border-0"
                                    value={endDate}
                                    onChange={e => updateUrl('end_date', e.target.value)}
                                    min={startDate || undefined}
                                />
                            </div>
                        </div>
                        
                        {/* Clear Button */}
                        <div className="md:col-span-1 lg:col-span-1 flex items-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="w-full h-9 text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
                            >
                                <X className="h-4 w-4" /> Clear
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* History Table */}
            {loading ? (
                <Card className="border border-gray-100 shadow-sm bg-white">
                    <CardContent className="p-12 text-center text-gray-500">
                        Loading history...
                    </CardContent>
                </Card>
            ) : sessions.length === 0 ? (
                <Card className="border border-gray-100 shadow-sm bg-white">
                    <CardContent className="p-12 text-center text-gray-500">
                        No history found for this item.
                    </CardContent>
                </Card>
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
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateUrl('page', (currentPage - 1).toString())}
                                disabled={currentPage === 1}
                                className="gap-2"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateUrl('page', (currentPage + 1).toString())}
                                disabled={currentPage >= totalPages}
                                className="gap-2"
                            >
                                Next
                                <ChevronLeft className="h-4 w-4 rotate-180" />
                            </Button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                                    <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
                                    <span className="font-medium">{totalCount}</span> results
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateUrl('page', (currentPage - 1).toString())}
                                    disabled={currentPage === 1}
                                    className="gap-2"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateUrl('page', (currentPage + 1).toString())}
                                    disabled={currentPage >= totalPages}
                                    className="gap-2"
                                >
                                    Next
                                    <ChevronLeft className="h-4 w-4 rotate-180" />
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

