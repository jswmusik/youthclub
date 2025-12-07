// frontend/app/dashboard/youth/notifications/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '../../../components/NavBar';
import NotificationItem from '../../../components/notifications/NotificationItem';
import NotificationSidebar from '../../../components/notifications/NotificationSidebar';
import ConfirmationModal from '../../../components/ConfirmationModal';
import { 
    fetchNotifications, 
    markNotificationRead, 
    deleteNotification, 
    markAllNotificationsRead 
} from '../../../../lib/api';
import { Notification } from '../../../../types/notification';

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
    const observerTarget = useRef<HTMLDivElement>(null);
    const router = useRouter();

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

    // 2. Logic Handlers
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
                // If navigation fails, try to delete the notification as it may point to a deleted resource
                try {
                    await deleteNotification(notif.id);
                    loadData(1, false); // Reload notifications from first page
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

    return (
        <div className="min-h-screen bg-gray-100">
            <NavBar />
            
            <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto p-4 lg:p-8">
                
                {/* REUSABLE SIDEBAR COMPONENT */}
                <aside className="lg:w-1/4">
                    <NotificationSidebar 
                        currentFilter={filter} 
                        onFilterChange={setFilter} 
                    />
                </aside>

                <main className="lg:w-3/4">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
                        <button 
                            onClick={async () => {
                                await markAllNotificationsRead();
                                loadData(1, false); // Reload from first page
                            }}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Mark all as read
                        </button>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center py-10 text-gray-400">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed text-gray-500">
                                No notifications found.
                            </div>
                        ) : (
                            <>
                                {/* REUSABLE ITEM COMPONENT */}
                                {notifications.map((notif) => (
                                    <NotificationItem 
                                        key={notif.id}
                                        notification={notif}
                                        onClick={handleItemClick}
                                        onDelete={handleDeleteClick}
                                    />
                                ))}
                                
                                {/* Infinite Scroll Trigger */}
                                <div ref={observerTarget} className="h-10 flex items-center justify-center">
                                    {loadingMore && (
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                            <span className="text-sm">Loading more...</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </main>
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
            />
        </div>
    );
}

