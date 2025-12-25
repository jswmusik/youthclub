'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
    Search, CheckCircle, XCircle, Calendar, MapPin, Clock, 
    BarChart3, ChevronUp, ChevronLeft, ClipboardList, Users,
    AlertCircle, CheckCircle2, Hourglass, ListTodo
} from 'lucide-react';
import api from '@/lib/api';
import Toast from '../Toast';
import { getMediaUrl, getInitials } from '@/app/utils';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

// Swipeable Card Component
interface SwipeableCardProps {
    children: React.ReactNode;
    onApprove: () => void;
    onReject: () => void;
    onClick: () => void;
}

function SwipeableCard({ children, onApprove, onReject, onClick }: SwipeableCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [startX, setStartX] = useState(0);
    const [currentX, setCurrentX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const actionWidth = 140;
    const threshold = 50;

    const handleTouchStart = (e: React.TouchEvent) => {
        setStartX(e.touches[0].clientX);
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const diff = startX - e.touches[0].clientX;
        if (isOpen) {
            const newX = Math.max(-actionWidth, Math.min(0, -actionWidth + (startX - e.touches[0].clientX) * -1));
            setCurrentX(newX);
        } else {
            const newX = Math.max(-actionWidth, Math.min(0, -diff));
            setCurrentX(newX);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (isOpen) {
            if (currentX > -actionWidth + threshold) {
                setIsOpen(false);
                setCurrentX(0);
            } else {
                setCurrentX(-actionWidth);
            }
        } else {
            if (currentX < -threshold) {
                setIsOpen(true);
                setCurrentX(-actionWidth);
            } else {
                setCurrentX(0);
            }
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (!isOpen && Math.abs(currentX) < 5) {
            onClick();
        } else if (isOpen) {
            setIsOpen(false);
            setCurrentX(0);
        }
    };

    const handleApproveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onApprove();
        setIsOpen(false);
        setCurrentX(0);
    };

    const handleRejectClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onReject();
        setIsOpen(false);
        setCurrentX(0);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (cardRef.current && !cardRef.current.contains(e.target as Node) && isOpen) {
                setIsOpen(false);
                setCurrentX(0);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div ref={cardRef} className="relative overflow-hidden">
            {/* Action buttons (behind the card) */}
            <div className="absolute inset-y-0 right-0 flex items-stretch">
                <button
                    onClick={handleApproveClick}
                    className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-green)] text-white transition-all active:bg-[var(--brand-green)]/80"
                >
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-xs font-medium">Approve</span>
                </button>
                <button
                    onClick={handleRejectClick}
                    className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-red)] text-white transition-all active:bg-[var(--brand-red)]/80"
                >
                    <XCircle className="w-5 h-5" />
                    <span className="text-xs font-medium">Reject</span>
                </button>
            </div>

            {/* Swipeable card content */}
            <div
                className="relative bg-[var(--dark-700)] transition-transform duration-200 ease-out cursor-pointer"
                style={{ 
                    transform: `translateX(${isDragging ? currentX : (isOpen ? -actionWidth : 0)}px)`,
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handleClick}
            >
                {children}
                {/* Swipe hint indicator */}
                {!isOpen && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--brand-light)]/20 pointer-events-none">
                        <ChevronLeft className="w-4 h-4" />
                    </div>
                )}
            </div>
        </div>
    );
}

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

function ApplicationCardSkeleton() {
    return (
        <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
            <div className="flex items-start gap-3">
                <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-4 w-48" />
                    <div className="flex items-center gap-2 mt-2">
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ApplicationTableRowSkeleton() {
    return (
        <tr className="border-b border-[var(--dark-600)]/50">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-3 w-40" />
                    </div>
                </div>
            </td>
            <td className="px-6 py-4"><Skeleton className="h-5 w-40" /></td>
            <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
            <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
            <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-1">
                    <Skeleton className="w-9 h-9 rounded-lg" />
                    <Skeleton className="w-9 h-9 rounded-lg" />
                </div>
            </td>
        </tr>
    );
}

function ApplicationPageSkeleton() {
    return (
        <>
            {/* Mobile Cards Skeleton */}
            <div className="flex flex-col gap-3 md:hidden">
                {[...Array(4)].map((_, i) => (
                    <ApplicationCardSkeleton key={i} />
                ))}
            </div>

            {/* Desktop Table Skeleton */}
            <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--dark-600)]">
                            <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Applicant</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Event</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Applied</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Status</th>
                            <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(5)].map((_, i) => (
                            <ApplicationTableRowSkeleton key={i} />
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

interface ApplicationListProps {
    scope: 'SUPER' | 'MUNICIPALITY' | 'CLUB';
}

export default function ApplicationList({ scope }: ApplicationListProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [allRegistrations, setAllRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>(searchParams.get('status') || 'PENDING');
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
    const [toast, setToast] = useState({ message: '', type: 'success' as 'success'|'error', isVisible: false });

    const fetchRegistrations = useCallback(async () => {
        setLoading(true);
        setShowSkeleton(true);
        const startTime = Date.now();
        
        try {
            let url = `/registrations/?ordering=-created_at`;
            
            const res = await api.get(url);
            let data = Array.isArray(res.data) ? res.data : res.data.results || [];

            setAllRegistrations(data);
            setRegistrations(data);
        } catch (error) {
            console.error(error);
            setToast({ message: "Failed to load applications", type: 'error', isVisible: true });
        } finally {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
            
            setTimeout(() => {
                setLoading(false);
                setShowSkeleton(false);
            }, remaining);
        }
    }, []);

    useEffect(() => {
        fetchRegistrations();
    }, [fetchRegistrations]);

    // Update URL when filters change
    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (searchTerm) params.set('search', searchTerm); else params.delete('search');
            if (filterStatus !== 'PENDING') params.set('status', filterStatus); else params.delete('status');
            router.replace(`${pathname}?${params.toString()}`);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, filterStatus]);

    const handleAction = async (id: number, action: 'APPROVED' | 'REJECTED') => {
        try {
            await api.patch(`/registrations/${id}/`, { status: action });
            setToast({ message: `Application ${action.toLowerCase()}`, type: 'success', isVisible: true });
            
            // Optimistic Update
            setRegistrations(prev => prev.filter(r => r.id !== id));
            setAllRegistrations(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error(error);
            setToast({ message: "Action failed", type: 'error', isVisible: true });
        }
    };

    // Filter by status
    const statusFilteredList = allRegistrations.filter(r => {
        if (filterStatus === 'ALL') return true;
        if (filterStatus === 'PENDING') {
            return r.status === 'PENDING_ADMIN' || r.status === 'PENDING_GUARDIAN';
        }
        return r.status === filterStatus;
    });

    // Filter by search
    const filteredList = statusFilteredList.filter(r => 
        searchTerm === '' || 
        r.user_detail?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user_detail?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user_detail?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.event_detail?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const clearFilters = () => {
        setSearchTerm('');
        setFilterStatus('PENDING');
        router.push(pathname);
    };

    const hasFilters = searchTerm || filterStatus !== 'PENDING';

    // Calculate analytics
    const analytics = {
        total: allRegistrations.length,
        pending: allRegistrations.filter(r => r.status === 'PENDING_ADMIN' || r.status === 'PENDING_GUARDIAN').length,
        waitlist: allRegistrations.filter(r => r.status === 'WAITLIST').length,
        approved: allRegistrations.filter(r => r.status === 'APPROVED').length,
    };

    const getStatusBadgeClasses = (status: string) => {
        if (status.includes('PENDING')) return 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30';
        switch (status) {
            case 'APPROVED': return 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30';
            case 'WAITLIST': return 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border-[var(--brand-peach)]/30';
            case 'REJECTED': return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30';
            default: return 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border-[var(--dark-500)]';
        }
    };

    const selectArrowStyle = {
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.75rem center',
        backgroundSize: '1rem'
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                            <ClipboardList className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Application Queue</h1>
                    </div>
                    <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">Review and manage event registration applications.</p>
                </div>
            </div>

            {/* Analytics Dashboard */}
            {!showSkeleton && (
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                    {/* Header */}
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
                        <ChevronUp className={`h-4 w-4 text-[var(--brand-light)]/50 transition-transform duration-300 ${analyticsExpanded ? 'rotate-0' : 'rotate-180'}`} />
                    </button>
                    
                    {/* Content */}
                    <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            
                            {/* Total Applications */}
                            <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                        <ListTodo className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Total</span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total}</div>
                            </div>

                            {/* Pending */}
                            <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center">
                                        <AlertCircle className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Pending</span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.pending}</div>
                            </div>

                            {/* Waitlist */}
                            <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/50 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-red)] flex items-center justify-center">
                                        <Hourglass className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Waitlist</span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-peach)]">{analytics.waitlist}</div>
                            </div>

                            {/* Approved */}
                            <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center">
                                        <CheckCircle2 className="h-5 w-5 text-[var(--dark-900)]" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">Approved</span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{analytics.approved}</div>
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
                            placeholder="Search by name, email, or event..." 
                            className="flex-1 bg-transparent text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 outline-none text-base"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="text-[var(--brand-light)]/40 hover:text-[var(--brand-light)] transition-colors text-xl"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    
                    {/* Filters Row */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex flex-wrap gap-2">
                            {['PENDING', 'WAITLIST', 'APPROVED', 'ALL'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                        filterStatus === status 
                                            ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                            : 'bg-[var(--dark-700)] text-[var(--brand-light)]/60 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--brand-light)]'
                                    }`}
                                >
                                    {status === 'PENDING' ? 'Needs Action' : status.charAt(0) + status.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-xl transition-all"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            {!showSkeleton && filteredList.length > 0 && (
                <div className="px-4 sm:px-0">
                    <p className="text-sm text-[var(--brand-light)]/50">
                        Showing <span className="text-[var(--brand-primary)] font-semibold">{filteredList.length}</span> {filteredList.length === 1 ? 'application' : 'applications'}
                    </p>
                </div>
            )}

            {/* Content */}
            {showSkeleton ? (
                <ApplicationPageSkeleton />
            ) : filteredList.length === 0 ? (
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="w-8 h-8 text-[var(--brand-light)]/30" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">No applications found</h3>
                    <p className="text-[var(--brand-light)]/50 text-sm mb-6">
                        {hasFilters ? 'Try adjusting your search or filters.' : 'No pending applications at the moment.'}
                    </p>
                </div>
            ) : (
                <>
                    {/* Mobile Cards */}
                    <div className="flex flex-col gap-0 md:hidden">
                        {filteredList.map((reg) => (
                            <SwipeableCard
                                key={reg.id}
                                onClick={() => router.push(`/admin/${scope.toLowerCase()}/events/${reg.event}`)}
                                onApprove={() => handleAction(reg.id, 'APPROVED')}
                                onReject={() => handleAction(reg.id, 'REJECTED')}
                            >
                                <div className="border-y border-[var(--dark-600)] p-4">
                                    <div className="flex items-start gap-3">
                                        {/* Avatar */}
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                                            {reg.user_detail?.avatar ? (
                                                <img src={getMediaUrl(reg.user_detail.avatar) || ''} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-sm font-bold text-white">
                                                    {getInitials(reg.user_detail?.first_name, reg.user_detail?.last_name)}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-semibold text-[var(--brand-light)] truncate">
                                                {reg.user_detail?.first_name} {reg.user_detail?.last_name}
                                            </h3>
                                            <p className="text-xs text-[var(--brand-light)]/50 truncate">{reg.user_detail?.email}</p>
                                            
                                            {/* Event Info */}
                                            <div className="mt-2 space-y-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3 h-3 text-[var(--brand-primary)]" />
                                                    <Link 
                                                        href={`/admin/${scope.toLowerCase()}/events/${reg.event}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-xs font-medium text-[var(--brand-primary)] hover:text-[var(--brand-purple)] truncate"
                                                    >
                                                        {reg.event_detail?.title || `Event #${reg.event}`}
                                                    </Link>
                                                </div>
                                                {reg.event_detail?.location_name && (
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="w-3 h-3 text-[var(--brand-light)]/40" />
                                                        <span className="text-xs text-[var(--brand-light)]/50 truncate">{reg.event_detail.location_name}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Status & Date */}
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClasses(reg.status)}`}>
                                                    {reg.status.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs text-[var(--brand-light)]/40 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(reg.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SwipeableCard>
                        ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--dark-600)]">
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Applicant</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Event</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Applied</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Status</th>
                                    <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredList.map((reg, index) => (
                                    <tr 
                                        key={reg.id} 
                                        className={`${index !== filteredList.length - 1 ? 'border-b border-[var(--dark-600)]/50' : ''} hover:bg-[var(--dark-700)]/30 transition-colors cursor-pointer`}
                                        onClick={() => router.push(`/admin/${scope.toLowerCase()}/events/${reg.event}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center overflow-hidden">
                                                    {reg.user_detail?.avatar ? (
                                                        <img src={getMediaUrl(reg.user_detail.avatar) || ''} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs font-bold text-white">
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
                                            <Link 
                                                href={`/admin/${scope.toLowerCase()}/events/${reg.event}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="font-medium text-[var(--brand-primary)] hover:text-[var(--brand-purple)] block"
                                            >
                                                {reg.event_detail?.title || `Event #${reg.event}`}
                                            </Link>
                                            {reg.event_detail?.location_name && (
                                                <div className="text-xs text-[var(--brand-light)]/50 flex items-center gap-1 mt-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {reg.event_detail.location_name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-[var(--brand-light)]/70 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(reg.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClasses(reg.status)}`}>
                                                {reg.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div 
                                                className="flex items-center justify-end gap-1"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <button 
                                                    onClick={() => handleAction(reg.id, 'APPROVED')}
                                                    className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-green)] hover:bg-[var(--brand-green)]/10 transition-all"
                                                    title="Approve"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(reg.id, 'REJECTED')}
                                                    className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--brand-light)]/50 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all"
                                                    title="Reject"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} darkMode />
        </div>
    );
}
