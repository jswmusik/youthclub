'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import api from '@/lib/api';
import { EventRegistration, RegistrationStatus } from '@/types/event';
import Toast from '../Toast';
import ConfirmationModal from '../ConfirmationModal';
import { getMediaUrl } from '@/app/utils';
import { CheckCircle, XCircle, Clock, Users, ChevronLeft, ChevronRight, User } from 'lucide-react';

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
        if (key !== 'page') {
            params.set('page', '1');
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    const fetchRegistrations = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            
            const page = searchParams.get('page') || '1';
            const statusFilter = searchParams.get('status') || '';
            const currentFilter = statusFilter || 'ALL';
            
            params.set('event', eventId.toString());
            
            if (currentFilter === 'ALL' || currentFilter === '') {
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
            setToast({ 
                message: `Registration ${confirmationModal.action === 'approve' ? 'approved' : 'rejected'} successfully`, 
                type: 'success', 
                isVisible: true 
            });
            
            setConfirmationModal({
                isVisible: false,
                action: null,
                registration: null,
                isLoading: false,
            });
            
            setTimeout(() => {
                fetchRegistrations();
            }, 500);
        } catch (error: any) {
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

    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter);
        if (newFilter === 'ALL') {
            updateUrl('status', '');
        } else if (newFilter === 'PENDING') {
            updateUrl('status', '');
            updateUrl('page', '1');
        } else {
            updateUrl('status', newFilter);
        }
    };

    const filteredList = registrations.filter(r => {
        if (filter === 'ALL') return true;
        if (filter === 'PENDING') return r.status === 'PENDING_GUARDIAN' || r.status === 'PENDING_ADMIN';
        return r.status === filter;
    });

    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    
    const effectiveTotal = filter === 'PENDING' || filter === 'ALL' 
        ? filteredList.length 
        : totalCount;
    const totalPages = Math.ceil(effectiveTotal / pageSize);
    
    const paginatedRegistrations = (filter === 'PENDING' || filter === 'ALL')
        ? filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize)
        : filteredList;

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; text: string; border: string }> = {
            APPROVED: { bg: 'bg-[var(--brand-green)]/20', text: 'text-[var(--brand-green)]', border: 'border-[var(--brand-green)]/30' },
            WAITLIST: { bg: 'bg-[var(--brand-peach)]/20', text: 'text-[var(--brand-peach)]', border: 'border-[var(--brand-peach)]/30' },
            PENDING_GUARDIAN: { bg: 'bg-[var(--brand-blue)]/20', text: 'text-[var(--brand-blue)]', border: 'border-[var(--brand-blue)]/30' },
            PENDING_ADMIN: { bg: 'bg-[var(--brand-purple)]/20', text: 'text-[var(--brand-purple)]', border: 'border-[var(--brand-purple)]/30' },
            REJECTED: { bg: 'bg-[var(--brand-red)]/20', text: 'text-[var(--brand-red)]', border: 'border-[var(--brand-red)]/30' },
            CANCELLED: { bg: 'bg-[var(--dark-600)]', text: 'text-[var(--brand-light)]/50', border: 'border-[var(--dark-500)]' },
            ATTENDED: { bg: 'bg-[var(--brand-green)]/20', text: 'text-[var(--brand-green)]', border: 'border-[var(--brand-green)]/30' },
        };

        const style = styles[status] || { bg: 'bg-[var(--dark-600)]', text: 'text-[var(--brand-light)]/50', border: 'border-[var(--dark-500)]' };

        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    const getInitials = (first?: string | null, last?: string | null) => {
        const firstInitial = first?.charAt(0)?.toUpperCase() || '';
        const lastInitial = last?.charAt(0)?.toUpperCase() || '';
        return firstInitial + lastInitial || '?';
    };

    if (loading) {
        return (
            <div className="py-12 text-center">
                <div className="w-10 h-10 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[var(--brand-light)]/50">Loading participants...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                    {['ALL', 'APPROVED', 'WAITLIST', 'PENDING'].map(f => (
                        <button
                            key={f}
                            onClick={() => handleFilterChange(f)}
                            className={`px-4 py-2 text-sm rounded-xl font-medium transition-all ${
                                filter === f 
                                    ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] shadow-lg shadow-[var(--brand-primary)]/20' 
                                    : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-light)]'
                            }`}
                        >
                            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--brand-light)]/50">
                    <Users className="w-4 h-4" />
                    <span>Total: <span className="font-bold text-[var(--brand-light)]">{totalCount}</span></span>
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block bg-[var(--dark-700)]/50 rounded-xl border border-[var(--dark-500)] overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--dark-500)] bg-[var(--dark-600)]/30">
                            <th className="text-left px-6 py-4 text-[10px] uppercase font-semibold text-[var(--brand-light)]/40 tracking-wider">User</th>
                            <th className="text-left px-6 py-4 text-[10px] uppercase font-semibold text-[var(--brand-light)]/40 tracking-wider">Date</th>
                            <th className="text-left px-6 py-4 text-[10px] uppercase font-semibold text-[var(--brand-light)]/40 tracking-wider">Status</th>
                            <th className="text-right px-6 py-4 text-[10px] uppercase font-semibold text-[var(--brand-light)]/40 tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedRegistrations.map((reg, index) => (
                            <tr 
                                key={reg.id} 
                                className={`border-b border-[var(--dark-500)]/50 hover:bg-[var(--dark-600)]/30 transition-colors ${
                                    index === paginatedRegistrations.length - 1 ? 'border-b-0' : ''
                                }`}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                                            {reg.user_detail?.avatar ? (
                                                <img src={getMediaUrl(reg.user_detail.avatar) || ''} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-white font-bold text-sm">
                                                    {getInitials(reg.user_detail?.first_name, reg.user_detail?.last_name)}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-[var(--brand-light)]">
                                                {reg.user_detail?.first_name} {reg.user_detail?.last_name}
                                            </div>
                                            <div className="text-xs text-[var(--brand-light)]/50">{reg.user_detail?.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-[var(--brand-light)]">
                                        {new Date(reg.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-[var(--brand-light)]/50">
                                        {new Date(reg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {getStatusBadge(reg.status)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {(reg.status === 'PENDING_ADMIN' || reg.status === 'WAITLIST') && (
                                            <button
                                                onClick={() => handleApproveClick(reg)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--brand-green)]/20 text-[var(--brand-green)] border border-[var(--brand-green)]/30 hover:bg-[var(--brand-green)]/30 transition-colors"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Approve
                                            </button>
                                        )}
                                        {(reg.status === 'PENDING_GUARDIAN') && (
                                            <span className="text-xs text-[var(--brand-light)]/40 italic flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                Waiting for parent
                                            </span>
                                        )}
                                        {reg.status !== 'REJECTED' && reg.status !== 'CANCELLED' && reg.status !== 'ATTENDED' && (
                                            <button
                                                onClick={() => handleRejectClick(reg)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30 hover:bg-[var(--brand-red)]/30 transition-colors"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                Reject
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {paginatedRegistrations.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-16 text-center">
                                    <User className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-4" />
                                    <p className="text-[var(--brand-light)]/50">No participants found in this category.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
                {paginatedRegistrations.map((reg) => (
                    <div 
                        key={reg.id} 
                        className="bg-[var(--dark-700)]/50 rounded-xl border border-[var(--dark-500)] p-4"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {reg.user_detail?.avatar ? (
                                    <img src={getMediaUrl(reg.user_detail.avatar) || ''} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white font-bold">
                                        {getInitials(reg.user_detail?.first_name, reg.user_detail?.last_name)}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="font-semibold text-[var(--brand-light)]">
                                            {reg.user_detail?.first_name} {reg.user_detail?.last_name}
                                        </div>
                                        <div className="text-xs text-[var(--brand-light)]/50 truncate">{reg.user_detail?.email}</div>
                                    </div>
                                    {getStatusBadge(reg.status)}
                                </div>
                                <div className="mt-2 text-xs text-[var(--brand-light)]/40">
                                    Registered: {new Date(reg.created_at).toLocaleDateString()} at {new Date(reg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                                
                                {/* Actions */}
                                <div className="mt-3 flex items-center gap-2">
                                    {(reg.status === 'PENDING_ADMIN' || reg.status === 'WAITLIST') && (
                                        <button
                                            onClick={() => handleApproveClick(reg)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--brand-green)]/20 text-[var(--brand-green)] border border-[var(--brand-green)]/30"
                                        >
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            Approve
                                        </button>
                                    )}
                                    {(reg.status === 'PENDING_GUARDIAN') && (
                                        <span className="text-xs text-[var(--brand-light)]/40 italic flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            Waiting for parent
                                        </span>
                                    )}
                                    {reg.status !== 'REJECTED' && reg.status !== 'CANCELLED' && reg.status !== 'ATTENDED' && (
                                        <button
                                            onClick={() => handleRejectClick(reg)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30"
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            Reject
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {paginatedRegistrations.length === 0 && (
                    <div className="py-16 text-center">
                        <User className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-4" />
                        <p className="text-[var(--brand-light)]/50">No participants found in this category.</p>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                    <div className="text-sm text-[var(--brand-light)]/50">
                        Page <span className="font-semibold text-[var(--brand-light)]">{currentPage}</span> of <span className="font-semibold text-[var(--brand-light)]">{totalPages}</span>
                        <span className="ml-2 text-[var(--brand-light)]/30">({effectiveTotal} total)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => updateUrl('page', (currentPage - 1).toString())}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--dark-700)] text-[var(--brand-light)]/60 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-light)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Prev</span>
                        </button>
                        
                        {/* Page Numbers */}
                        <div className="hidden sm:flex items-center gap-1">
                            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => updateUrl('page', pageNum.toString())}
                                        className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${
                                            pageNum === currentPage 
                                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                                : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-light)]'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            disabled={currentPage >= totalPages}
                            onClick={() => updateUrl('page', (currentPage + 1).toString())}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--dark-700)] text-[var(--brand-light)]/60 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-light)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <span className="hidden sm:inline">Next</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
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
                darkMode={true}
            />
            
            <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} darkMode={true} />
        </div>
    );
}
