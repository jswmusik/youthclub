'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import api from '@/lib/api';
import { EventRegistration, RegistrationStatus } from '@/types/event';
import Toast from '../Toast';
import ConfirmationModal from '../ConfirmationModal';
import { getMediaUrl } from '@/app/utils';

interface ParticipantManagerProps {
    eventId: number;
}

export default function ParticipantManager({ eventId }: ParticipantManagerProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [filter, setFilter] = useState<string>('ALL');
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });
    const [confirmationModal, setConfirmationModal] = useState<{
        isVisible: boolean;
        action: 'approve' | 'reject' | null;
        registration: any | null;
        isLoading: boolean;
    }>({
        isVisible: false,
        action: null,
        registration: null,
        isLoading: false,
    });

    const updateUrl = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        // Reset to page 1 when filter changes (but not when changing page itself)
        if (key !== 'page') {
            params.set('page', '1');
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const fetchRegistrations = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            
            // Get filters from URL
            const page = searchParams.get('page') || '1';
            const statusFilter = searchParams.get('status') || '';
            const currentFilter = statusFilter || 'ALL';
            
            params.set('event', eventId.toString());
            
            // For ALL and PENDING filters, fetch all registrations (for client-side filtering/pagination)
            // For specific status filters, use server-side pagination
            if (currentFilter === 'ALL' || currentFilter === '') {
                // Fetch all registrations for ALL filter
                let allRegistrations: any[] = [];
                let pageNum = 1;
                const pageSize = 100;
                const maxPages = 100;
                
                while (pageNum <= maxPages) {
                    const pageParams = new URLSearchParams(params);
                    pageParams.set('page', pageNum.toString());
                    pageParams.set('page_size', pageSize.toString());
                    
                    const res: any = await api.get(`/registrations/?${pageParams.toString()}`);
                    const responseData: any = res?.data;
                    
                    if (!responseData) break;
                    
                    let pageRegistrations: any[] = [];
                    
                    if (Array.isArray(responseData)) {
                        pageRegistrations = responseData;
                        allRegistrations = [...allRegistrations, ...pageRegistrations];
                        break;
                    } else if (responseData.results && Array.isArray(responseData.results)) {
                        pageRegistrations = responseData.results;
                        allRegistrations = [...allRegistrations, ...pageRegistrations];
                        
                        if (pageNum === 1) {
                            setTotalCount(responseData.count || 0);
                        }
                        
                        const hasNext = responseData.next !== null && responseData.next !== undefined;
                        if (!hasNext || pageRegistrations.length === 0) break;
                        
                        pageNum++;
                    } else {
                        break;
                    }
                }
                
                setRegistrations(allRegistrations);
            } else {
                // Server-side pagination for specific status filters
                params.set('page', page);
                params.set('page_size', '10');
                params.set('status', statusFilter);

                const res = await api.get(`/registrations/?${params.toString()}`);
                const responseData = res?.data;
                
                let registrationsData: any[] = [];
                let count = 0;
                
                if (Array.isArray(responseData)) {
                    registrationsData = responseData;
                    count = responseData.length;
                } else if (responseData?.results && Array.isArray(responseData.results)) {
                    registrationsData = responseData.results;
                    count = responseData.count || responseData.results.length;
                }
                
                setRegistrations(registrationsData);
                setTotalCount(count);
            }
        } catch (error) {
            console.error(error);
            setToast({ message: "Failed to load participants", type: 'error', isVisible: true });
        } finally {
            setLoading(false);
        }
    }, [eventId, searchParams]);

    useEffect(() => {
        fetchRegistrations();
    }, [fetchRegistrations]);

    // Sync filter with URL params
    useEffect(() => {
        const urlFilter = searchParams.get('status') || 'ALL';
        if (urlFilter !== filter && urlFilter !== '') {
            setFilter(urlFilter === 'ALL' ? 'ALL' : urlFilter);
        }
    }, [searchParams]);

    const handleApproveClick = (reg: any) => {
        setConfirmationModal({
            isVisible: true,
            action: 'approve',
            registration: reg,
            isLoading: false,
        });
    };

    const handleRejectClick = (reg: any) => {
        setConfirmationModal({
            isVisible: true,
            action: 'reject',
            registration: reg,
            isLoading: false,
        });
    };

    const handleConfirmAction = async () => {
        if (!confirmationModal.registration || !confirmationModal.action) return;

        const newStatus = confirmationModal.action === 'approve' ? 'APPROVED' : 'REJECTED';
        
        setConfirmationModal(prev => ({ ...prev, isLoading: true }));

        try {
            const response = await api.patch(`/registrations/${confirmationModal.registration.id}/`, { status: newStatus });
            console.log('Update response:', response.data);
            setToast({ 
                message: `Registration ${confirmationModal.action === 'approve' ? 'approved' : 'rejected'} successfully`, 
                type: 'success', 
                isVisible: true 
            });
            
            // Close modal
            setConfirmationModal({
                isVisible: false,
                action: null,
                registration: null,
                isLoading: false,
            });
            
            // Refresh list after a short delay to ensure backend has processed
            // Preserve current page when refreshing
            setTimeout(() => {
                fetchRegistrations();
            }, 500);
        } catch (error: any) {
            console.error('Update error:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || "Update failed";
            setToast({ message: errorMessage, type: 'error', isVisible: true });
            setConfirmationModal(prev => ({ ...prev, isLoading: false }));
        }
    };

    const handleCancelAction = () => {
        setConfirmationModal({
            isVisible: false,
            action: null,
            registration: null,
            isLoading: false,
        });
    };

    // Handle filter changes
    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter);
        if (newFilter === 'ALL') {
            updateUrl('status', '');
        } else if (newFilter === 'PENDING') {
            // For PENDING, we'll filter client-side since backend doesn't support multiple statuses
            // Don't set status in URL, we'll filter client-side
            updateUrl('status', '');
            updateUrl('page', '1'); // Reset to page 1
        } else {
            updateUrl('status', newFilter);
        }
    };

    // Derived state for filtering (client-side for PENDING filter)
    const filteredList = registrations.filter(r => {
        if (filter === 'ALL') return true;
        if (filter === 'PENDING') return r.status === 'PENDING_GUARDIAN' || r.status === 'PENDING_ADMIN';
        return r.status === filter;
    });

    // Pagination logic
    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    
    // For PENDING and ALL filters, we need client-side pagination since we filter client-side
    // For other filters, use server-side pagination count
    const effectiveTotal = filter === 'PENDING' || filter === 'ALL' 
        ? filteredList.length 
        : totalCount;
    const totalPages = Math.ceil(effectiveTotal / pageSize);
    
    // Client-side pagination for PENDING and ALL filters
    const paginatedRegistrations = (filter === 'PENDING' || filter === 'ALL')
        ? filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize)
        : filteredList;

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            APPROVED: 'bg-green-100 text-green-800',
            WAITLIST: 'bg-orange-100 text-orange-800',
            PENDING_GUARDIAN: 'bg-yellow-100 text-yellow-800',
            PENDING_ADMIN: 'bg-blue-100 text-blue-800',
            REJECTED: 'bg-red-100 text-red-800',
            CANCELLED: 'bg-gray-100 text-gray-800',
            ATTENDED: 'bg-green-100 text-green-800',
        };

        return (
            <span className={`px-2 py-1 rounded text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    const getInitials = (first?: string | null, last?: string | null) => {
        const firstInitial = first?.charAt(0)?.toUpperCase() || '';
        const lastInitial = last?.charAt(0)?.toUpperCase() || '';
        return firstInitial + lastInitial || '?';
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b flex flex-wrap gap-2 items-center justify-between bg-gray-50">
                    <div className="flex gap-2">
                        {['ALL', 'APPROVED', 'WAITLIST', 'PENDING'].map(f => (
                            <button
                                key={f}
                                onClick={() => handleFilterChange(f)}
                                className={`px-3 py-1 text-sm rounded-lg font-medium transition ${
                                    filter === f ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {f.charAt(0) + f.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>
                    <div className="text-sm text-gray-500">
                        Total: <span className="font-bold text-gray-900">{totalCount}</span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">User</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {paginatedRegistrations.map((reg) => (
                            <tr key={reg.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {reg.user_detail?.avatar ? (
                                            <img 
                                                src={getMediaUrl(reg.user_detail.avatar) || ''} 
                                                className="w-10 h-10 rounded-full object-cover" 
                                                alt={`${reg.user_detail.first_name} ${reg.user_detail.last_name}`}
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-sm">
                                                {getInitials(reg.user_detail?.first_name, reg.user_detail?.last_name)}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-bold text-gray-900">
                                                {reg.user_detail?.first_name} {reg.user_detail?.last_name}
                                            </div>
                                            <div className="text-xs text-gray-500">{reg.user_detail?.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">
                                        {new Date(reg.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {new Date(reg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {getStatusBadge(reg.status)}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        {(reg.status === 'PENDING_ADMIN' || reg.status === 'WAITLIST') && (
                                            <button 
                                                onClick={() => handleApproveClick(reg)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded-md hover:bg-green-100 hover:text-green-900 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Approve
                                            </button>
                                        )}
                                        {(reg.status === 'PENDING_GUARDIAN') && (
                                            <span className="text-xs text-gray-400 italic">Waiting for parent</span>
                                        )}
                                        {reg.status !== 'REJECTED' && reg.status !== 'CANCELLED' && reg.status !== 'ATTENDED' && (
                                            <button 
                                                onClick={() => handleRejectClick(reg)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-md hover:bg-red-100 hover:text-red-900 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Reject
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {paginatedRegistrations.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500">
                                    No participants found in this category.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
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
            )}
            
            {/* Confirmation Modal */}
            <ConfirmationModal
                isVisible={confirmationModal.isVisible}
                onClose={handleCancelAction}
                onConfirm={handleConfirmAction}
                title={
                    confirmationModal.action === 'approve'
                        ? 'Approve Registration?'
                        : confirmationModal.action === 'reject'
                        ? 'Reject Registration?'
                        : 'Confirm Action'
                }
                message={
                    confirmationModal.registration && confirmationModal.action === 'approve'
                        ? `Are you sure you want to approve ${confirmationModal.registration.user_detail?.first_name} ${confirmationModal.registration.user_detail?.last_name}'s registration? They will receive a confirmed seat.`
                        : confirmationModal.registration && confirmationModal.action === 'reject'
                        ? `Are you sure you want to reject ${confirmationModal.registration.user_detail?.first_name} ${confirmationModal.registration.user_detail?.last_name}'s registration? This action cannot be undone.`
                        : 'Are you sure you want to proceed?'
                }
                confirmButtonText={confirmationModal.action === 'approve' ? 'Approve' : confirmationModal.action === 'reject' ? 'Reject' : 'Confirm'}
                cancelButtonText="Cancel"
                isLoading={confirmationModal.isLoading}
                variant={confirmationModal.action === 'reject' ? 'danger' : 'success'}
            />
            
            <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
        </div>
    );
}

