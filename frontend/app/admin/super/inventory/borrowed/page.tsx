'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { inventoryApi, Item } from '@/lib/inventory-api';
import LendingHistoryTable from '@/app/components/inventory/LendingHistoryTable';
import { Clock, Filter, AlertCircle, ChevronDown, Search, X, Package, ChevronLeft, ChevronUp, BarChart3 } from 'lucide-react';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import Toast from '@/app/components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export default function SuperBorrowedItemsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [sessions, setSessions] = useState([]);
    const [items, setItems] = useState<Item[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [returningItemId, setReturningItemId] = useState<number | null>(null);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    // Get filter values from URL
    const search = searchParams.get('search') || '';
    const selectedItemId = searchParams.get('item') ? Number(searchParams.get('item')) : null;
    const selectedClubId = searchParams.get('club') || '';
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;

    useEffect(() => {
        loadItems();
        loadClubs();
        loadBorrowedItems();
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
        try {
            setLoading(true);
            const params = new URLSearchParams();
            
            // Always filter for ACTIVE status
            params.append('status', 'ACTIVE');
            
            // Add filters from URL
            if (search) params.append('search', search);
            if (selectedItemId) params.append('item', String(selectedItemId));
            if (selectedClubId) params.append('club', selectedClubId);
            
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

    const handleReturnItem = async (itemId: number) => {
        setReturningItemId(itemId);
        setShowReturnModal(true);
    };

    const handleReturnConfirm = async () => {
        if (!returningItemId) return;
        
        try {
            await inventoryApi.returnItem(returningItemId);
            setToast({ message: 'Item returned successfully', type: 'success' });
            setShowReturnModal(false);
            setReturningItemId(null);
            // Reload the list
            loadBorrowedItems();
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 'Failed to return item';
            setToast({ message: errorMessage, type: 'error' });
        }
    };

    const clearFilters = () => {
        router.push(pathname);
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
                    <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Currently Borrowed Items</h1>
                    <p className="text-gray-500 mt-1">View all items that are currently borrowed across all clubs.</p>
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

                        {/* Overdue */}
                        <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">Overdue</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{analytics.overdue}</div>
                            </CardContent>
                        </Card>

                        {/* On Time */}
                        <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">On Time</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{analytics.on_time}</div>
                            </CardContent>
                        </Card>

                        {/* Active Loans */}
                        <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">Active Loans</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-[#4D4DA4]">{analytics.active_loans}</div>
                            </CardContent>
                        </Card>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {/* Overdue Warning */}
            {overdueCount > 0 && (
                <Card className="border border-red-200 bg-red-50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-red-800">
                                {overdueCount} item{overdueCount !== 1 ? 's' : ''} {overdueCount !== 1 ? 'are' : 'is'} overdue
                            </p>
                            <p className="text-xs text-red-600 mt-1">Items highlighted in red are past their due date.</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <Card className="border border-gray-100 shadow-sm bg-white">
                <div className="p-4 space-y-4">
                    {/* Main Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        {/* Search - Takes more space on larger screens */}
                        <div className="relative md:col-span-4 lg:col-span-3">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Search</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input 
                                    placeholder="Search by item or borrower..." 
                                    className="pl-9 bg-gray-50 border-0"
                                    value={search}
                                    onChange={e => updateUrl('search', e.target.value)}
                                />
                            </div>
                        </div>
                        
                        {/* Club Filter */}
                        <div className="md:col-span-3 lg:col-span-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Club</label>
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

                        {/* Item Filter */}
                        <div className="md:col-span-3 lg:col-span-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Item</label>
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
                        Loading borrowed items...
                    </CardContent>
                </Card>
            ) : sessions.length === 0 ? (
                <Card className="border border-gray-100 shadow-sm bg-white">
                    <CardContent className="p-12 text-center text-gray-500">
                        No borrowed items found.
                    </CardContent>
                </Card>
            ) : (
                <LendingHistoryTable 
                    sessions={sessions} 
                    showReturnButton={true}
                    onReturnItem={handleReturnItem}
                />
            )}

            {/* Pagination Controls */}
            {(() => {
                const totalPages = Math.ceil(totalCount / pageSize);
                
                if (totalPages <= 1 && !loading) return null;
                
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

            {/* Return Confirmation Modal */}
            <ConfirmationModal
                isVisible={showReturnModal}
                onClose={() => {
                    setShowReturnModal(false);
                    setReturningItemId(null);
                }}
                onConfirm={handleReturnConfirm}
                title="Return Item"
                message="Are you sure you want to mark this item as returned? This action cannot be undone."
                confirmButtonText="Return Item"
                variant="info"
            />

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}

