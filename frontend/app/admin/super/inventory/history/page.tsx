'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { inventoryApi, Item } from '@/lib/inventory-api';
import LendingHistoryTable from '@/app/components/inventory/LendingHistoryTable';
import { BarChart3, ChevronUp, Package, Users, CheckCircle, Clock, Filter, Search, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function SuperInventoryHistoryPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [sessions, setSessions] = useState([]);
    const [items, setItems] = useState<Item[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [analytics, setAnalytics] = useState<HistoryAnalytics | null>(null);
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
    const [filtersExpanded, setFiltersExpanded] = useState(true);
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
    }, []);

    useEffect(() => {
        loadHistory();
        loadAnalytics();
    }, [searchParams]);

    const loadItems = async () => {
        try {
            // Load all items for the filter dropdown
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
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link href="/admin/super/inventory">
                    <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Inventory
                    </Button>
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Lending History</h1>
                    <p className="text-gray-500 mt-1">See who borrowed items and when across all clubs.</p>
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
                                        <CardTitle className="text-sm font-medium text-gray-500 h-4 bg-gray-200 rounded w-24"></CardTitle>
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
                                    <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.active}</div>
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
                        <div className="relative md:col-span-4 lg:col-span-3">
                            <Label htmlFor="search-history" className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Search</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    id="search-history"
                                    placeholder="Search by item or borrower..."
                                    className="pl-9 bg-gray-50 border-0"
                                    value={search}
                                    onChange={e => updateUrl('search', e.target.value)}
                                />
                            </div>
                        </div>
                        
                        {/* Club Filter */}
                        <div className="md:col-span-2 lg:col-span-2">
                            <Label htmlFor="club-filter" className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Club</Label>
                            <select
                                id="club-filter"
                                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                                value={selectedClubId}
                                onChange={e => updateUrl('club', e.target.value)}
                            >
                                <option value="">All Clubs</option>
                                {clubs.map((club) => (
                                    <option key={club.id} value={club.id}>
                                        {club.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Item Filter */}
                        <div className="md:col-span-2 lg:col-span-2">
                            <Label htmlFor="item-filter" className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Item</Label>
                            <select
                                id="item-filter"
                                className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#4D4DA4]"
                                value={selectedItemId || ''}
                                onChange={e => updateUrl('item', e.target.value)}
                            >
                                <option value="">All Items</option>
                                {items.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Start Date */}
                        <div className="md:col-span-2 lg:col-span-2">
                            <Label htmlFor="start-date" className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Start Date</Label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    id="start-date"
                                    type="date"
                                    className="pl-9 bg-gray-50 border-0"
                                    value={startDate}
                                    onChange={e => updateUrl('start_date', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* End Date */}
                        <div className="md:col-span-2 lg:col-span-2">
                            <Label htmlFor="end-date" className="text-xs font-semibold text-gray-500 uppercase mb-1 block">End Date</Label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    id="end-date"
                                    type="date"
                                    className="pl-9 bg-gray-50 border-0"
                                    value={endDate}
                                    onChange={e => updateUrl('end_date', e.target.value)}
                                    min={startDate || undefined}
                                />
                            </div>
                        </div>

                        {/* Clear Button */}
                        <div className="md:col-span-2 lg:col-span-1 flex items-end">
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
                        No history found.
                    </CardContent>
                </Card>
            ) : (
                <LendingHistoryTable sessions={sessions} />
            )}

            {/* Pagination */}
            {(() => {
                const totalPages = Math.ceil(totalCount / pageSize);
                if (totalPages <= 1) return null;
                
                return (
                    <div className="flex items-center justify-center gap-2 py-4">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={currentPage === 1} 
                            onClick={() => updateUrl('page', (currentPage - 1).toString())}
                            className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        >
                            Prev
                        </Button>
                        <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={currentPage >= totalPages} 
                            onClick={() => updateUrl('page', (currentPage + 1).toString())}
                            className="text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        >
                            Next
                        </Button>
                    </div>
                );
            })()}
        </div>
    );
}

