'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { inventoryApi, Item } from '@/lib/inventory-api';
import LendingHistoryTable from '@/app/components/inventory/LendingHistoryTable';
import { BarChart3, ChevronUp, Package, CheckCircle, Clock, Search, X, Calendar, ChevronLeft, UsersRound } from 'lucide-react';
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

export default function MunicipalityInventoryHistoryPage() {
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
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link href="/admin/municipality/inventory">
                    <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Inventory
                    </Button>
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Lending History</h1>
                    <p className="text-gray-500 mt-1">See who borrowed items and when across all clubs in your municipality.</p>
                </div>
            </div>

            {/* Analytics */}
            <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded} className="space-y-2">
                <Card className="border-0 shadow-sm bg-gray-900">
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-gray-400" />
                            <h3 className="text-sm font-semibold text-white drop-shadow-[0_0_8px_rgba(77,77,164,0.6)]" style={{ textShadow: '0 0 8px rgba(255, 84, 133, 0.4), 0 0 12px rgba(77, 77, 164, 0.3)' }}>
                                Analytics Dashboard
                            </h3>
                        </div>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-9 p-0 h-8 text-gray-400 hover:text-white hover:bg-gray-800">
                                <ChevronUp className={cn(
                                    "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
                                    analyticsExpanded ? "rotate-0" : "rotate-180"
                                )} />
                                <span className="sr-only">Toggle Analytics</span>
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="transition-all duration-500 ease-in-out">
                        <CardContent className="p-4 sm:p-6 pt-3 transition-opacity duration-500 ease-in-out">
                            {analyticsLoading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                    {[1, 2, 3, 4].map((i) => (
                                        <Card key={i} className="bg-white/5 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-lg animate-pulse">
                                            <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                                                <div className="flex items-center gap-2 justify-center">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-700"></div>
                                                    <div className="h-4 bg-gray-700 rounded w-24"></div>
                                                </div>
                                                <div className="h-8 bg-gray-700 rounded w-16"></div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : analytics ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                    {/* Total Borrowed */}
                                    <Card className="bg-white/5 backdrop-blur-sm border border-[#4D4DA4]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                                        style={{
                                            boxShadow: '0 4px 20px rgba(77, 77, 164, 0.3), 0 0 20px rgba(255, 84, 133, 0.2)',
                                        }}>
                                        <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4D4DA4] to-[#FF5485] flex items-center justify-center shadow-lg"
                                                    style={{
                                                        boxShadow: '0 4px 15px rgba(77, 77, 164, 0.5), 0 0 20px rgba(255, 84, 133, 0.3)',
                                                    }}>
                                                    <Package className="h-5 w-5 text-white" />
                                                </div>
                                                <CardTitle className="text-sm font-medium text-white/90">Total Borrowed</CardTitle>
                                            </div>
                                            <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.total_borrowed}</div>
                                        </div>
                                    </Card>

                                    {/* Demographics */}
                                    <Card className="bg-white/5 backdrop-blur-sm border border-[#FF5485]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                                        style={{
                                            boxShadow: '0 4px 20px rgba(255, 84, 133, 0.3), 0 0 20px rgba(255, 84, 133, 0.2)',
                                        }}>
                                        <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5485] to-[#FF8FA3] flex items-center justify-center shadow-lg"
                                                    style={{
                                                        boxShadow: '0 4px 15px rgba(255, 84, 133, 0.5), 0 0 20px rgba(255, 143, 163, 0.3)',
                                                    }}>
                                                    <UsersRound className="h-5 w-5 text-white" />
                                                </div>
                                                <CardTitle className="text-sm font-medium text-white/90">Demographics</CardTitle>
                                            </div>
                                            <div className="w-full space-y-1.5 mt-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-white/70">Male:</span>
                                                    <span className="font-bold text-white">{analytics.borrowed_male}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-white/70">Female:</span>
                                                    <span className="font-bold text-white">{analytics.borrowed_female}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-white/70">Other:</span>
                                                    <span className="font-bold text-white">{analytics.borrowed_other}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Returned */}
                                    <Card className="bg-white/5 backdrop-blur-sm border border-[#10B981]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                                        style={{
                                            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3), 0 0 20px rgba(52, 211, 153, 0.2)',
                                        }}>
                                        <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#34D399] flex items-center justify-center shadow-lg"
                                                    style={{
                                                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.5), 0 0 20px rgba(52, 211, 153, 0.3)',
                                                    }}>
                                                    <CheckCircle className="h-5 w-5 text-white" />
                                                </div>
                                                <CardTitle className="text-sm font-medium text-white/90">Returned</CardTitle>
                                            </div>
                                            <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.returned}</div>
                                        </div>
                                    </Card>

                                    {/* Active */}
                                    <Card className="bg-white/5 backdrop-blur-sm border border-[#0EA5E9]/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden"
                                        style={{
                                            boxShadow: '0 4px 20px rgba(14, 165, 233, 0.3), 0 0 20px rgba(56, 189, 248, 0.2)',
                                        }}>
                                        <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] flex items-center justify-center shadow-lg"
                                                    style={{
                                                        boxShadow: '0 4px 15px rgba(14, 165, 233, 0.5), 0 0 20px rgba(56, 189, 248, 0.3)',
                                                    }}>
                                                    <Clock className="h-5 w-5 text-white" />
                                                </div>
                                                <CardTitle className="text-sm font-medium text-white/90">Active</CardTitle>
                                            </div>
                                            <div className="text-2xl sm:text-3xl font-bold text-white">{analytics.active}</div>
                                        </div>
                                    </Card>
                                </div>
                            ) : null}
                        </CardContent>
                    </CollapsibleContent>
                </Card>
            </Collapsible>

            {/* Filters */}
            <Card className="border border-gray-100 shadow-sm bg-white">
                <div className="px-6 py-4 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <Input 
                            placeholder="Search by item or borrower..." 
                            className="pl-9 bg-gray-50 border-0"
                            value={search}
                            onChange={e => updateUrl('search', e.target.value)}
                        />
                    </div>
                    <div className="w-full sm:w-[200px]">
                        <select 
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
                    <div className="w-full sm:w-[200px]">
                        <select 
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
                    <div className="relative w-full sm:w-[180px]">
                        <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            type="date"
                            className="pl-9 bg-gray-50 border-0"
                            value={startDate}
                            onChange={e => updateUrl('start_date', e.target.value)}
                        />
                    </div>
                    <div className="relative w-full sm:w-[180px]">
                        <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            type="date"
                            className="pl-9 bg-gray-50 border-0"
                            value={endDate}
                            onChange={e => updateUrl('end_date', e.target.value)}
                            min={startDate || undefined}
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="w-full sm:w-auto h-9 text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
                    >
                        <X className="h-4 w-4" /> Clear
                    </Button>
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

