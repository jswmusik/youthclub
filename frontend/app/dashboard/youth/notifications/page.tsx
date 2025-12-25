// frontend/app/dashboard/youth/notifications/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import NavBar from '../../../components/NavBar';
import YouthSidebar from '../../../components/youth/YouthSidebar';
import NotificationItem from '../../../components/notifications/NotificationItem';
import ConfirmationModal from '../../../components/ConfirmationModal';
import { NotificationsPageSkeleton } from '../../../components/ui/Skeleton';
import { 
    fetchNotifications, 
    markNotificationRead, 
    deleteNotification, 
    markAllNotificationsRead 
} from '../../../../lib/api';
import { Notification } from '../../../../types/notification';
import { Bell, X, Filter, Gift, Megaphone, Calendar, Newspaper, MessageSquare, CheckCheck } from 'lucide-react';
import YouthFooter from '../../../components/youth/YouthFooter';

// Minimum skeleton display time (in ms) for better UX
const MIN_LOADING_TIME = 400;

export default function NotificationPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<string>('ALL');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [notificationToDelete, setNotificationToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [minLoadingComplete, setMinLoadingComplete] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();

    // Minimum loading time for skeleton display
    useEffect(() => {
        const timer = setTimeout(() => {
            setMinLoadingComplete(true);
        }, MIN_LOADING_TIME);
        return () => clearTimeout(timer);
    }, []);

    // Filter options with icons
    const filterOptions = [
        { value: 'ALL', label: 'All', icon: Bell },
        { value: 'SYSTEM', label: 'System', icon: Megaphone },
        { value: 'REWARD', label: 'Rewards', icon: Gift },
        { value: 'EVENT', label: 'Events', icon: Calendar },
        { value: 'NEWS', label: 'News', icon: Newspaper },
        { value: 'POST', label: 'Posts', icon: MessageSquare },
    ];

    // Load data with pagination support
    const loadData = useCallback(async (pageNum: number, append: boolean = false) => {
        try {
            if (append) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }
            
            const res = await fetchNotifications(filter, pageNum);
            const newNotifications = res.data.results || res.data;
            
            if (append) {
                setNotifications(prev => [...prev, ...newNotifications]);
            } else {
                setNotifications(newNotifications);
            }
            
            // Check if there are more pages
            setHasMore(!!res.data.next);
        } catch (error) {
            console.error("Failed to fetch", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [filter]);

    // Reset and load first page when filter changes
    useEffect(() => {
        setPage(1);
        setHasMore(true);
        loadData(1, false);
    }, [filter, loadData]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    loadData(nextPage, true);
                }
            },
            { threshold: 0.1 }
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [hasMore, loadingMore, loading, page, loadData]);

    // Logic Handlers
    const handleItemClick = async (notif: Notification) => {
        if (!notif.is_read) {
            try {
                // Optimistic Update
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                await markNotificationRead(notif.id);
            } catch (e) { console.error(e); }
        }
        if (notif.action_url) {
            try {
                router.push(notif.action_url);
            } catch (error) {
                console.error('Navigation error:', error);
                try {
                    await deleteNotification(notif.id);
                    loadData(1, false);
                } catch (deleteError) {
                    console.error('Failed to delete invalid notification:', deleteError);
                }
            }
        }
    };

    const handleDeleteClick = (id: number) => {
        setNotificationToDelete(id);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!notificationToDelete) return;
        
        try {
            setIsDeleting(true);
            await deleteNotification(notificationToDelete);
            setNotifications(prev => prev.filter(n => n.id !== notificationToDelete));
            setShowDeleteModal(false);
            setNotificationToDelete(null);
        } catch (e) {
            console.error(e);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (e) {
            console.error(e);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;
    
    // Show skeleton while loading (with minimum display time)
    const showSkeleton = loading || !minLoadingComplete;

    return (
        <div className="min-h-screen bg-[var(--dark-900)]">
            <NavBar 
                darkMode={true}
                onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                showBackButton={true}
            />
            
            {/* Mobile Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsSidebarOpen(false)}
            />
            
            {/* Mobile Sidebar */}
            <aside 
                className={`fixed top-0 left-0 h-screen w-64 z-50 bg-[var(--dark-800)] transform transition-transform duration-300 md:hidden ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between p-4 border-b border-[var(--dark-600)]">
                    <h1 className="text-xl font-bold text-[var(--brand-primary)]">Menu</h1>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--brand-light)]/60 hover:bg-[var(--dark-700)]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto h-[calc(100vh-64px)]">
                    <YouthSidebar activePath={pathname} darkMode={true} />
                </div>
            </aside>
            
            {/* Main Layout */}
            <div className="pt-14 sm:pt-16">
                <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 relative">
                    {/* Desktop Sidebar */}
                    <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 bg-[var(--dark-900)] z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
                        <YouthSidebar activePath={pathname} darkMode={true} />
                    </aside>
                    
                    {/* Content wrapper with left margin for sidebar */}
                    <div className="md:ml-60">
                        <main className="flex-1 min-w-0 px-0 py-2 sm:p-4 md:p-6 pb-24 md:pb-6">
                            {showSkeleton ? (
                                <NotificationsPageSkeleton />
                            ) : (
                                <>
                                    {/* Header Section */}
                                    <div className="mb-4 sm:mb-6 px-4 sm:px-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                                            <div>
                                                <div className="flex items-center gap-2 sm:gap-3 mb-1">
                                                    <Bell className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--brand-primary)]" />
                                                    <h1 className="text-2xl sm:text-3xl md:text-4xl text-[var(--brand-light)] font-heading font-bold">
                                                        Notifications
                                                    </h1>
                                                </div>
                                                <p className="text-[var(--brand-light)]/60 text-sm pl-9">
                                                    {`${notifications.length} notification${notifications.length !== 1 ? 's' : ''}${unreadCount > 0 ? ` • ${unreadCount} unread` : ''}`}
                                                </p>
                                            </div>
                                            {unreadCount > 0 && (
                                                <button 
                                                    onClick={handleMarkAllRead}
                                                    className="inline-flex items-center gap-2 bg-[var(--brand-primary)] text-[var(--dark-900)] px-4 py-2.5 rounded-xl font-semibold hover:bg-[var(--brand-primary)]/90 transition-all shadow-lg shadow-[var(--brand-primary)]/20 text-sm"
                                                >
                                                    <CheckCheck className="w-4 h-4" />
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>

                                        {/* Filter Chips */}
                                        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] px-4 py-3 sm:p-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {filterOptions.map((opt) => {
                                                    const Icon = opt.icon;
                                                    const isActive = filter === opt.value;
                                                    return (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => setFilter(opt.value)}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                                isActive
                                                                    ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                                                                    : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 hover:bg-[var(--dark-600)] hover:text-[var(--brand-light)]'
                                                            }`}
                                                        >
                                                            <Icon className="w-3.5 h-3.5" />
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                                
                                                {filter !== 'ALL' && (
                                                    <button
                                                        onClick={() => setFilter('ALL')}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all ml-auto"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notifications List */}
                                    <div className="space-y-3">
                                        {notifications.length === 0 ? (
                                            <div className="text-center py-16 bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-dashed border-[var(--dark-500)]">
                                                <div className="max-w-sm mx-auto">
                                                    <div className="w-16 h-16 bg-[var(--dark-700)] rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <Bell className="w-8 h-8 text-[var(--brand-light)]/40" />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">No notifications</h3>
                                                    <p className="text-sm text-[var(--brand-light)]/60 mb-4">
                                                        {filter !== 'ALL' 
                                                            ? 'No notifications match this filter.' 
                                                            : 'You\'re all caught up!'}
                                                    </p>
                                                    {filter !== 'ALL' && (
                                                        <button
                                                            onClick={() => setFilter('ALL')}
                                                            className="inline-flex items-center gap-2 text-[var(--brand-primary)] font-semibold hover:underline"
                                                        >
                                                            Show all notifications
                                                            <span>→</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {notifications.map((notif) => (
                                                    <NotificationItem 
                                                        key={notif.id}
                                                        notification={notif}
                                                        onClick={handleItemClick}
                                                        onDelete={handleDeleteClick}
                                                        darkMode={true}
                                                    />
                                                ))}
                                                
                                                {/* Infinite Scroll Trigger */}
                                                <div ref={observerTarget} className="h-10 flex items-center justify-center">
                                                    {loadingMore && (
                                                        <div className="flex items-center gap-2 text-[var(--brand-light)]/60">
                                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--brand-primary)]"></div>
                                                            <span className="text-sm">Loading more...</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </main>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isVisible={showDeleteModal}
                onClose={() => {
                    if (!isDeleting) {
                        setShowDeleteModal(false);
                        setNotificationToDelete(null);
                    }
                }}
                onConfirm={handleDeleteConfirm}
                title="Delete Notification"
                message="Are you sure you want to delete this notification? This action cannot be undone."
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
                isLoading={isDeleting}
                variant="danger"
                darkMode={true}
            />
            
            {/* Footer */}
            <YouthFooter />
        </div>
    );
}
