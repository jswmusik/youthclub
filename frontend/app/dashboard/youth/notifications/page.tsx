// frontend/app/dashboard/youth/notifications/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '../../../components/NavBar';
import NotificationItem from '../../../components/notifications/NotificationItem';
import NotificationSidebar from '../../../components/notifications/NotificationSidebar';
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
    const router = useRouter();

    // 1. Fetch Data
    useEffect(() => {
        loadData();
    }, [filter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetchNotifications(filter);
            setNotifications(res.data.results || res.data);
        } catch (error) {
            console.error("Failed to fetch", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Logic Handlers
    const handleItemClick = async (notif: Notification) => {
        if (!notif.is_read) {
            try {
                // Optimistic Update
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                await markNotificationRead(notif.id);
            } catch (e) { console.error(e); }
        }
        if (notif.action_url) router.push(notif.action_url);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this notification?")) return;
        try {
            await deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (e) { console.error(e); }
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
                                loadData();
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
                            // REUSABLE ITEM COMPONENT
                            notifications.map((notif) => (
                                <NotificationItem 
                                    key={notif.id}
                                    notification={notif}
                                    onClick={handleItemClick}
                                    onDelete={handleDelete}
                                />
                            ))
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

