'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, BarChart3, ChevronUp, Eye, Edit, Trash2, Calendar, Clock, Users, Repeat, MapPin, ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { Event } from '@/types/event';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { useToast } from '../../../../hooks/useToast';

// Minimum loading time for skeleton display
const MIN_LOADING_TIME = 400;

// Swipeable Card Component
interface SwipeableCardProps {
    children: React.ReactNode;
    onEdit: () => void;
    onDelete: () => void;
    onClick: () => void;
}

function SwipeableCard({ children, onEdit, onDelete, onClick }: SwipeableCardProps) {
    const t = useTranslations('eventsAdmin');
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

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit();
        setIsOpen(false);
        setCurrentX(0);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete();
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
            <div className="absolute inset-y-0 right-0 flex items-stretch">
                <button
                    onClick={handleEditClick}
                    className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-blue)] text-white transition-all active:bg-[var(--brand-blue)]/80"
                >
                    <Edit className="w-5 h-5" />
                    <span className="text-xs font-medium">{t('actions.edit')}</span>
                </button>
                <button
                    onClick={handleDeleteClick}
                    className="w-[70px] flex flex-col items-center justify-center gap-1 bg-[var(--brand-red)] text-white transition-all active:bg-[var(--brand-red)]/80"
                >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-xs font-medium">{t('actions.delete')}</span>
                </button>
            </div>

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

function EventCardSkeleton() {
    return (
        <div className="bg-[var(--dark-700)] border-y border-[var(--dark-600)] p-4">
            <div className="flex items-start gap-3">
                <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <div className="flex items-center gap-2 mt-2">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-4 w-24 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function EventTableRowSkeleton() {
    return (
        <tr className="border-b border-[var(--dark-600)]/50">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-3 w-28" />
                    </div>
                </div>
            </td>
            <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
            <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
            <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
            <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
            <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-1">
                    <Skeleton className="w-9 h-9 rounded-lg" />
                    <Skeleton className="w-9 h-9 rounded-lg" />
                    <Skeleton className="w-9 h-9 rounded-lg" />
                </div>
            </td>
        </tr>
    );
}

function EventPageSkeleton() {
    const t = useTranslations('eventsAdmin');
    return (
        <>
            {/* Mobile Cards Skeleton */}
            <div className="flex flex-col gap-3 md:hidden">
                {[...Array(4)].map((_, i) => (
                    <EventCardSkeleton key={i} />
                ))}
            </div>

            {/* Desktop Table Skeleton */}
            <div className="hidden md:block bg-[var(--dark-800)] rounded-2xl border border-[var(--dark-600)] overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[var(--dark-600)]">
                            <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.event')}</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.date')}</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.recurring')}</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
                            <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.registrations')}</th>
                            <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(5)].map((_, i) => (
                            <EventTableRowSkeleton key={i} />
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

export default function SuperEventsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const t = useTranslations('eventsAdmin');

    const [events, setEvents] = useState<Event[]>([]);
    const [allEventsForAnalytics, setAllEventsForAnalytics] = useState<Event[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
    const [attendedCount, setAttendedCount] = useState(0);

    // Filter State
    const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
    const [recurringFilter, setRecurringFilter] = useState(searchParams.get('recurring') || '');

    // Track initial values to detect actual user changes
    const initialSearchRef = useRef(searchParams.get('search') || '');
    const initialStatusRef = useRef(searchParams.get('status') || '');
    const initialRecurringRef = useRef(searchParams.get('recurring') || '');
    const hasUserChangedFilters = useRef(false);

    // Delete
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
    const [deleteMode, setDeleteMode] = useState<'single' | 'future' | null>(null);
    const [deleting, setDeleting] = useState(false);
    const { success, error, info, warning } = useToast();

    useEffect(() => {
        fetchAllEventsForAnalytics();
        fetchAttendedCount();
    }, []);

    // Debounced Search/Filter Update - only reset page when user actually changes filters
    useEffect(() => {
        const searchChanged = searchInput !== initialSearchRef.current;
        const statusChanged = statusFilter !== initialStatusRef.current;
        const recurringChanged = recurringFilter !== initialRecurringRef.current;
        
        if (!searchChanged && !statusChanged && !recurringChanged && !hasUserChangedFilters.current) {
            return;
        }
        
        hasUserChangedFilters.current = true;

        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (searchInput) params.set('search', searchInput); else params.delete('search');
            if (statusFilter) params.set('status', statusFilter); else params.delete('status');
            if (recurringFilter) params.set('recurring', recurringFilter); else params.delete('recurring');
            params.set('page', '1');
            router.replace(`${pathname}?${params.toString()}`);
            
            // Update refs to current values
            initialSearchRef.current = searchInput;
            initialStatusRef.current = statusFilter;
            initialRecurringRef.current = recurringFilter;
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput, statusFilter, recurringFilter, searchParams, pathname, router]);

    useEffect(() => {
        fetchEvents();
    }, [searchParams]);

    const fetchAllEventsForAnalytics = async () => {
        try {
            let allEvents: Event[] = [];
            let page = 1;
            let totalCount = 0;
            const pageSize = 100;
            const maxPages = 100;

            while (page <= maxPages) {
                const params = new URLSearchParams();
                params.set('page', page.toString());
                params.set('page_size', pageSize.toString());

                const res: any = await api.get(`/events/?${params.toString()}`);
                const responseData: any = res?.data;

                if (!responseData) break;

                let pageEvents: Event[] = [];

                if (Array.isArray(responseData)) {
                    pageEvents = responseData;
                    allEvents = [...allEvents, ...pageEvents];
                    break;
                } else if (responseData.results && Array.isArray(responseData.results)) {
                    pageEvents = responseData.results;
                    allEvents = [...allEvents, ...pageEvents];

                    if (page === 1) {
                        totalCount = responseData.count || 0;
                    }

                    const hasNext = responseData.next !== null && responseData.next !== undefined;
                    const hasAllResults = totalCount > 0 && allEvents.length >= totalCount;
                    const gotEmptyPage = pageEvents.length === 0;

                    if (!hasNext || hasAllResults || gotEmptyPage) break;
                    page++;
                } else {
                    break;
                }
            }

            setAllEventsForAnalytics(allEvents);
        } catch (err) {
            console.error('Error fetching events for analytics:', err);
            setAllEventsForAnalytics([]);
        }
    };

    const fetchAttendedCount = async () => {
        try {
            let allRegistrations: any[] = [];
            let page = 1;
            const pageSize = 100;
            const maxPages = 100;

            while (page <= maxPages) {
                const params = new URLSearchParams();
                params.set('status', 'ATTENDED');
                params.set('page', page.toString());
                params.set('page_size', pageSize.toString());

                const res: any = await api.get(`/registrations/?${params.toString()}`);
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

                    const hasNext = responseData.next !== null && responseData.next !== undefined;
                    const gotEmptyPage = pageRegistrations.length === 0;

                    if (!hasNext || gotEmptyPage) break;
                    page++;
                } else {
                    break;
                }
            }

            const uniqueUsers = new Set(allRegistrations.map((r: any) => r.user));
            setAttendedCount(uniqueUsers.size);
        } catch (err) {
            console.error('Error fetching attended count:', err);
            setAttendedCount(0);
        }
    };

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setShowSkeleton(true);
        const startTime = Date.now();

        try {
            const search = searchParams.get('search') || '';
            const status = searchParams.get('status') || '';
            const recurringFilter = searchParams.get('recurring') || '';
            const page = searchParams.get('page') || '1';

            const validStatuses = ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'CANCELLED'];
            const validStatus = status && validStatuses.includes(status) ? status : '';

            let eventsData: Event[] = [];
            let pageNum = 1;
            const fetchPageSize = 100;
            const maxPages = 100;

            while (pageNum <= maxPages) {
                const params = new URLSearchParams();
                if (search && search.trim()) params.set('search', search.trim());
                if (validStatus) params.set('status', validStatus);
                params.set('page', pageNum.toString());
                params.set('page_size', fetchPageSize.toString());

                try {
                    const res: any = await api.get(`/events/?${params.toString()}`);
                    const responseData: any = res?.data;

                    if (!responseData) break;

                    let pageEvents: Event[] = [];

                    if (Array.isArray(responseData)) {
                        pageEvents = responseData;
                        eventsData = [...eventsData, ...pageEvents];
                        break;
                    } else if (responseData.results && Array.isArray(responseData.results)) {
                        pageEvents = responseData.results;
                        eventsData = [...eventsData, ...pageEvents];

                        const hasNext = responseData.next !== null && responseData.next !== undefined;
                        const gotEmptyPage = pageEvents.length === 0;

                        if (!hasNext || gotEmptyPage) break;
                        pageNum++;
                    } else {
                        break;
                    }
                } catch (error: any) {
                    console.error(`Error fetching events page ${pageNum}:`, error);
                    break;
                }
            }

            // Apply client-side filtering for recurring events
            if (recurringFilter === 'only') {
                const parentEventIds = new Set<number>();
                eventsData.forEach((e: Event) => {
                    if (e.is_recurring && !e.parent_event) {
                        parentEventIds.add(e.id);
                    }
                });

                eventsData = eventsData.filter((e: Event) => {
                    if (e.is_recurring && !e.parent_event) return true;
                    if (e.parent_event && parentEventIds.has(e.parent_event)) return true;
                    return false;
                });
            } else if (recurringFilter === 'exclude') {
                const parentEventIds = new Set<number>();
                eventsData.forEach((e: Event) => {
                    if (e.is_recurring && !e.parent_event) {
                        parentEventIds.add(e.id);
                    }
                });

                eventsData = eventsData.filter((e: Event) => {
                    if (e.is_recurring && !e.parent_event) return false;
                    if (e.parent_event && parentEventIds.has(e.parent_event)) return false;
                    return true;
                });
            }

            // Apply pagination after filtering
            const pageSize = 10;
            const currentPageNum = Number(page) || 1;
            const startIndex = (currentPageNum - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedEvents = eventsData.slice(startIndex, endIndex);

            if (paginatedEvents.length === 0 && currentPageNum > 1 && eventsData.length > 0) {
                const lastPage = Math.ceil(eventsData.length / pageSize);
                if (lastPage > 0) {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('page', lastPage.toString());
                    router.replace(`${pathname}?${params.toString()}`);
                    return;
                }
            }

            if (paginatedEvents.length === 0 && currentPageNum > 1 && eventsData.length === 0) {
                const params = new URLSearchParams(searchParams.toString());
                params.set('page', '1');
                router.replace(`${pathname}?${params.toString()}`);
                return;
            }

            setEvents(paginatedEvents);
            setTotalCount(eventsData.length);
        } catch (error: any) {
            console.error('Error fetching events:', error);
            setEvents([]);
            setTotalCount(0);
        } finally {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);

            setTimeout(() => {
                setLoading(false);
                setShowSkeleton(false);
            }, remaining);
        }
    }, [searchParams, pathname, router]);

    const buildUrlWithParams = (path: string) => {
        const params = new URLSearchParams();
        const page = searchParams.get('page') || '1';
        const search = searchParams.get('search');
        const status = searchParams.get('status');
        const recurring = searchParams.get('recurring');

        params.set('page', page);
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        if (recurring) params.set('recurring', recurring);

        const queryString = params.toString();
        return `${path}?${queryString}`;
    };

    const clearFilters = () => {
        setSearchInput('');
        setStatusFilter('');
        setRecurringFilter('');
        router.push(pathname);
    };

    const handleDeleteClick = (event: Event) => {
        setEventToDelete(event);
        setDeleteMode(null);
    };

    const handleDeleteConfirm = async () => {
        if (!eventToDelete) return;
        if (eventToDelete.parent_event && !deleteMode) return;

        setDeleting(true);
        try {
            if (deleteMode === 'future' && eventToDelete.parent_event) {
                await api.delete(`/events/${eventToDelete.id}/?delete_future=true`);
            } else {
                await api.delete(`/events/${eventToDelete.id}/`);
            }

            success(t('toast.eventDeleted'));
            await fetchEvents();
            await fetchAllEventsForAnalytics();

            setEventToDelete(null);
            setDeleteMode(null);
        } catch (error: any) {
            console.error('Error deleting event:', error);
            error(error.response?.data?.error || t('toast.failedToDelete'));
        } finally {
            setDeleting(false);
        }
    };

    // Calculate analytics
    const now = new Date();
    const analytics = {
        total_events: allEventsForAnalytics.length,
        upcoming_events: allEventsForAnalytics.filter((e: Event) => {
            const startDate = new Date(e.start_date);
            return startDate > now;
        }).length,
        total_attended: attendedCount,
    };

    const currentPage = Number(searchParams.get('page')) || 1;
    const pageSize = 10;
    const totalPages = Math.ceil(totalCount / pageSize);

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

    const hasFilters = searchInput || statusFilter || recurringFilter;

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'PUBLISHED': 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30',
            'DRAFT': 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30',
            'SCHEDULED': 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30',
            'CANCELLED': 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30',
        };
        return styles[status] || 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]';
    };

    const getStatusLabel = (status: string) => {
        const statusMap: Record<string, string> = {
            'PUBLISHED': t('status.published'),
            'DRAFT': t('status.draft'),
            'SCHEDULED': t('status.scheduled'),
            'CANCELLED': t('status.cancelled'),
        };
        return statusMap[status] || status;
    };

    return (
        <div className="py-4 sm:py-6 md:py-8 px-0 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
                    </div>
                    <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('subtitle')}</p>
                </div>
                <Link href={buildUrlWithParams("/admin/super/events/create")}>
                    <button className="flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-2.5 transition-all text-sm">
                        <Plus className="h-4 w-4" /> {t('createEvent')}
                    </button>
                </Link>
            </div>

            {/* Analytics Dashboard */}
            {!showSkeleton && (
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                    <button
                        onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
                        className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-[var(--dark-700)]/30 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)]/20 flex items-center justify-center">
                                <BarChart3 className="h-4 w-4 text-[var(--brand-purple)]" />
                            </div>
                            <h3 className="text-sm font-semibold text-[var(--brand-light)]">{t('analyticsDashboard')}</h3>
                        </div>
                        <ChevronUp className={`h-4 w-4 text-[var(--brand-light)]/50 transition-transform duration-300 ${analyticsExpanded ? 'rotate-0' : 'rotate-180'}`} />
                    </button>

                    <div className={`overflow-hidden transition-all duration-300 ${analyticsExpanded ? 'max-h-96' : 'max-h-0'}`}>
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 grid grid-cols-3 gap-3 sm:gap-4">

                            {/* Total Events */}
                            <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-purple)]/50 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                        <Calendar className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('total')}</span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{analytics.total_events}</div>
                            </div>

                            {/* Upcoming Events */}
                            <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-blue)]/50 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center">
                                        <Clock className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('upcoming')}</span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-blue)]">{analytics.upcoming_events}</div>
                            </div>

                            {/* Members Attended */}
                            <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/50 transition-all">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center">
                                        <Users className="h-5 w-5 text-[var(--dark-900)]" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium text-[var(--brand-light)]/70">{t('attended')}</span>
                                </div>
                                <div className="text-2xl sm:text-3xl font-bold text-[var(--brand-green)]">{analytics.total_attended}</div>
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
                            placeholder={t('searchPlaceholder')}
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
                        <div className="w-full sm:w-[160px]">
                            <select
                                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                style={selectArrowStyle}
                            >
                                <option value="">{t('filters.allStatuses')}</option>
                                <option value="DRAFT">{t('status.draft')}</option>
                                <option value="SCHEDULED">{t('status.scheduled')}</option>
                                <option value="PUBLISHED">{t('status.published')}</option>
                                <option value="CANCELLED">{t('status.cancelled')}</option>
                            </select>
                        </div>
                        <div className="w-full sm:w-[180px]">
                            <select
                                className="w-full h-10 px-3 bg-[var(--dark-700)] border-2 border-[var(--dark-500)] rounded-xl text-[var(--brand-light)] text-sm outline-none focus:border-[var(--brand-primary)] transition-colors appearance-none cursor-pointer"
                                value={recurringFilter}
                                onChange={e => setRecurringFilter(e.target.value)}
                                style={selectArrowStyle}
                            >
                                <option value="">{t('filters.allEvents')}</option>
                                <option value="only">{t('filters.onlyRecurring')}</option>
                                <option value="exclude">{t('filters.excludeRecurring')}</option>
                            </select>
                        </div>
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded-xl transition-all"
                            >
                                {t('filters.clearAll')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            {!showSkeleton && events.length > 0 && (
                <div className="px-4 sm:px-0">
                    <p className="text-sm text-[var(--brand-light)]/50">
                        {t('stats.showing', { count: events.length, total: totalCount })}
                    </p>
                </div>
            )}

            {/* Content */}
            {showSkeleton ? (
                <EventPageSkeleton />
            ) : events.length === 0 ? (
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 px-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-[var(--brand-light)]/30" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">{t('emptyState.noEventsFound')}</h3>
                    <p className="text-[var(--brand-light)]/50 text-sm mb-6">
                        {hasFilters ? t('emptyState.tryAdjustingFilters') : t('emptyState.getStarted')}
                    </p>
                    {!hasFilters && (
                        <Link href={buildUrlWithParams("/admin/super/events/create")}>
                            <button className="inline-flex items-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold rounded-xl px-6 py-3 transition-all">
                                <Plus className="h-4 w-4" /> {t('createEvent')}
                            </button>
                        </Link>
                    )}
                </div>
            ) : (
                <>
                    {/* Mobile Cards */}
                    <div className="flex flex-col gap-3 md:hidden">
                        {events.map((event) => (
                            <SwipeableCard
                                key={event.id}
                                onClick={() => router.push(buildUrlWithParams(`/admin/super/events/${event.id}`))}
                                onEdit={() => router.push(buildUrlWithParams(`/admin/super/events/edit/${event.id}`))}
                                onDelete={() => handleDeleteClick(event)}
                            >
                                <div className="border-y border-[var(--dark-600)] p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0">
                                            <Calendar className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-semibold text-[var(--brand-light)] truncate">
                                                {event.title}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <MapPin className="w-3 h-3 text-[var(--brand-light)]/40" />
                                                <span className="text-xs text-[var(--brand-light)]/50 truncate">{event.location_name}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(event.status)}`}>
                                                    {getStatusLabel(event.status)}
                                                </span>
                                                {(event.is_recurring || event.parent_event) && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30">
                                                        <Repeat className="w-3 h-3" />
                                                        {event.parent_event ? t('recurring.instance') : event.recurrence_pattern || t('recurring.recurring')}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1 text-xs text-[var(--brand-light)]/40">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(event.start_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {event.allow_registration && (
                                                <div className="flex items-center gap-2 mt-2 text-xs text-[var(--brand-light)]/60">
                                                    <Users className="w-3 h-3" />
                                                    <span>{event.confirmed_participants_count}/{event.max_seats === 0 ? '∞' : event.max_seats}</span>
                                                    {event.waitlist_count > 0 && (
                                                        <span className="px-1.5 py-0.5 rounded bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] text-xs">
                                                            +{event.waitlist_count} WL
                                                        </span>
                                                    )}
                                                </div>
                                            )}
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
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.event')}</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.date')}</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.recurring')}</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.status')}</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.registrations')}</th>
                                    <th className="text-right px-6 py-4 text-sm font-semibold text-[var(--brand-light)]/70">{t('tableHeaders.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map(event => (
                                    <tr key={event.id} className="border-b border-[var(--dark-600)]/50 hover:bg-[var(--dark-700)]/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0">
                                                    <Calendar className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-[var(--brand-light)] truncate max-w-xs">{event.title}</div>
                                                    <div className="flex items-center gap-1 text-xs text-[var(--brand-light)]/50 truncate max-w-xs">
                                                        <MapPin className="w-3 h-3" />
                                                        {event.location_name}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-[var(--brand-light)]/70">
                                                <Clock className="w-4 h-4" />
                                                <div>
                                                    <div>{new Date(event.start_date).toLocaleDateString()}</div>
                                                    <div className="text-xs text-[var(--brand-light)]/50">
                                                        {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {event.is_recurring || event.parent_event ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {event.is_recurring && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30">
                                                            <Repeat className="w-3 h-3" />
                                                            {event.recurrence_pattern || t('recurring.recurring')}
                                                        </span>
                                                    )}
                                                    {event.parent_event && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border border-[var(--brand-blue)]/30">
                                                            {t('recurring.instance')}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-[var(--brand-light)]/40">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(event.status)}`}>
                                                {getStatusLabel(event.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {event.allow_registration ? (
                                                <div className="flex items-center gap-2 text-sm text-[var(--brand-light)]/70">
                                                    <span className="font-medium">{event.confirmed_participants_count}</span>
                                                    <span className="text-[var(--brand-light)]/40">/</span>
                                                    <span>{event.max_seats === 0 ? '∞' : event.max_seats}</span>
                                                    {event.waitlist_count > 0 && (
                                                        <span className="px-1.5 py-0.5 rounded bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] text-xs">
                                                            +{event.waitlist_count} WL
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-[var(--brand-light)]/40">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href={buildUrlWithParams(`/admin/super/events/${event.id}`)}>
                                                    <button className="w-9 h-9 rounded-lg hover:bg-[var(--brand-primary)]/20 text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] flex items-center justify-center transition-all">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </Link>
                                                <Link href={buildUrlWithParams(`/admin/super/events/edit/${event.id}`)}>
                                                    <button className="w-9 h-9 rounded-lg hover:bg-[var(--brand-blue)]/20 text-[var(--brand-light)]/60 hover:text-[var(--brand-blue)] flex items-center justify-center transition-all">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                </Link>
                                                <button
                                                    onClick={() => handleDeleteClick(event)}
                                                    className="w-9 h-9 rounded-lg hover:bg-[var(--brand-red)]/20 text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] flex items-center justify-center transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
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

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-4 px-4 sm:px-0">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {t('pagination.prev')}
                    </button>
                    <span className="text-sm text-[var(--brand-light)]/50 px-2">
                        {t('pagination.page', { current: currentPage, total: totalPages })}
                    </span>
                    <button
                        disabled={currentPage >= totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {t('pagination.next')}
                    </button>
                </div>
            )}

            {/* Delete Confirmation Modal for Recurring Events */}
            {eventToDelete && (eventToDelete.parent_event || eventToDelete.is_recurring) && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--dark-800)] rounded-2xl shadow-2xl w-full max-w-md p-6 border border-[var(--dark-600)]">
                        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--brand-red)]/20">
                            <Trash2 className="w-6 h-6 text-[var(--brand-red)]" />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--brand-light)] text-center mb-3">
                            {t('deleteModal.recurringTitle')}
                        </h2>
                        <p className="text-[var(--brand-light)]/60 text-center mb-6">
                            {eventToDelete.parent_event
                                ? t('deleteModal.recurringInstanceMessage', { title: eventToDelete.title })
                                : t('deleteModal.recurringParentMessage', { title: eventToDelete.title })
                            }
                        </p>

                        {eventToDelete.parent_event && (
                            <div className="space-y-3 mb-6">
                                <button
                                    onClick={() => setDeleteMode('single')}
                                    className={`w-full px-4 py-3 text-left rounded-xl border-2 transition-colors ${deleteMode === 'single'
                                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                                            : 'border-[var(--dark-500)] hover:border-[var(--dark-400)]'
                                        }`}
                                >
                                    <div className="font-semibold text-[var(--brand-light)]">{t('deleteModal.deleteOnlyInstance')}</div>
                                    <div className="text-sm text-[var(--brand-light)]/50 mt-1">{t('deleteModal.deleteOnlyInstanceDesc')}</div>
                                </button>
                                <button
                                    onClick={() => setDeleteMode('future')}
                                    className={`w-full px-4 py-3 text-left rounded-xl border-2 transition-colors ${deleteMode === 'future'
                                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                                            : 'border-[var(--dark-500)] hover:border-[var(--dark-400)]'
                                        }`}
                                >
                                    <div className="font-semibold text-[var(--brand-light)]">{t('deleteModal.deleteFutureInstances')}</div>
                                    <div className="text-sm text-[var(--brand-light)]/50 mt-1">{t('deleteModal.deleteFutureInstancesDesc')}</div>
                                </button>
                            </div>
                        )}

                        {!eventToDelete.parent_event && eventToDelete.is_recurring && (
                            <p className="text-sm text-[var(--brand-light)]/60 text-center mb-6">
                                {t('deleteModal.deleteParentMessage')}
                            </p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setEventToDelete(null);
                                    setDeleteMode(null);
                                }}
                                disabled={deleting}
                                className="flex-1 px-4 py-2.5 text-[var(--brand-light)] bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl font-semibold hover:bg-[var(--dark-600)] transition-colors disabled:opacity-50"
                            >
                                {t('deleteModal.cancel')}
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={deleting || (eventToDelete.parent_event && !deleteMode)}
                                className="flex-1 px-4 py-2.5 text-white bg-[var(--brand-red)] rounded-xl font-semibold hover:bg-[var(--brand-red)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {deleting ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        {t('deleteModal.deleting')}
                                    </>
                                ) : (
                                    t('deleteModal.delete')
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Regular Delete Confirmation Modal */}
            {eventToDelete && !eventToDelete.parent_event && !eventToDelete.is_recurring && (
                <ConfirmationModal
                    isVisible={!!eventToDelete}
                    onClose={() => {
                        if (!deleting) {
                            setEventToDelete(null);
                            setDeleteMode(null);
                        }
                    }}
                    onConfirm={() => {
                        setDeleteMode('single');
                        handleDeleteConfirm();
                    }}
                    title={t('deleteModal.title')}
                    message={t('deleteModal.message', { title: eventToDelete.title })}
                    confirmButtonText={t('deleteModal.delete')}
                    cancelButtonText={t('deleteModal.cancel')}
                    isLoading={deleting}
                    variant="danger"
                    darkMode={true}
                />
            )}

            </div>
    );
}
