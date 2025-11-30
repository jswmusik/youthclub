// frontend/types/notification.ts

export interface Notification {
    id: number;
    category: 'SYSTEM' | 'REWARD' | 'EVENT' | 'NEWS' | 'POST';
    title: string;
    body: string;
    action_url: string | null;
    is_read: boolean;
    created_at: string;
}

