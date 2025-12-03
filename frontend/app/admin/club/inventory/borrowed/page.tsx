'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { inventoryApi, Item } from '@/lib/inventory-api';
import LendingHistoryTable from '@/app/components/inventory/LendingHistoryTable';
import { Clock, Filter, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import Toast from '@/app/components/Toast';

export default function ClubBorrowedItemsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    
    const [sessions, setSessions] = useState([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [returningItemId, setReturningItemId] = useState<number | null>(null);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    // Get filter values from URL
    const search = searchParams.get('search') || '';
    const selectedItemId = searchParams.get('item') ? Number(searchParams.get('item')) : null;
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;

    useEffect(() => {
        if (user?.assigned_club) {
            loadItems();
            loadBorrowedItems();
        }
    }, [user]);

    useEffect(() => {
        if (user?.assigned_club) {
            loadBorrowedItems();
        }
    }, [searchParams, user]);

    const loadItems = async () => {
        if (!user?.assigned_club) return;
        
        try {
            const data = await inventoryApi.getClubItems(user.assigned_club.id);
            const itemsList = Array.isArray(data) ? data : (data.results || []);
            setItems(itemsList);
        } catch (err) {
            console.error('Failed to load items for filter', err);
            setItems([]);
        }
    };

    const loadBorrowedItems = async () => {
        if (!user?.assigned_club) return;
        
        try {
            setLoading(true);
            const params = new URLSearchParams();
            
            // Always filter for ACTIVE status
            params.append('status', 'ACTIVE');
            
            // Add filters from URL
            if (search) params.append('search', search);
            if (selectedItemId) params.append('item', String(selectedItemId));
            
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

    // Calculate overdue count
    const now = new Date();
    const overdueCount = sessions.filter((session: any) => {
        if (!session.due_at) return false;
        return new Date(session.due_at) < now;
    }).length;

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Currently Borrowed Items</h1>
                    <p className="text-slate-500">View all items that are currently borrowed.</p>
                </div>
                <div className="flex gap-2">
                    <Link 
                        href="/admin/club/inventory"
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        Back to Inventory
                    </Link>
                </div>
            </div>

            {/* Overdue Warning */}
            {overdueCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div>
                        <p className="text-sm font-semibold text-red-800">
                            {overdueCount} item{overdueCount !== 1 ? 's' : ''} {overdueCount !== 1 ? 'are' : 'is'} overdue
                        </p>
                        <p className="text-xs text-red-600 mt-1">Items highlighted in red are past their due date.</p>
                    </div>
                </div>
            )}

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
                    <svg 
                        className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
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
                                    placeholder="Search by item or borrower..." 
                                    className="w-full border rounded p-2 text-sm bg-gray-50"
                                    value={search}
                                    onChange={(e) => updateUrl('search', e.target.value)}
                                />
                            </div>

                            {/* Item Filter */}
                            <div className="w-64">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item</label>
                                <select 
                                    className="w-full border rounded p-2 text-sm bg-gray-50" 
                                    value={selectedItemId || ''} 
                                    onChange={(e) => updateUrl('item', e.target.value)}
                                >
                                    <option value="">All Items</option>
                                    {items.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.title}
                                        </option>
                                    ))}
                                </select>
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
                <div className="text-center py-12 text-slate-500">Loading borrowed items...</div>
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

