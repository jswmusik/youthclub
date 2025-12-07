// frontend/types/messenger.ts

import { User } from './user'; // Assuming you have a base User type

export interface MessageSender {
    id: number;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    role?: string; // Optional, useful for admins
}

export interface Message {
    id: number;
    sender: MessageSender;
    content: string;
    attachment?: string | null; // URL to image
    created_at: string; // ISO Date
    is_me: boolean;
    read_status?: {
        is_read: boolean;
        read_at: string | null;
    } | null;
}

export interface ConversationList {
    id: number;
    type: 'DM' | 'BROADCAST' | 'EVENT' | 'SYSTEM';
    subject: string;
    created_at: string;
    unread_count: number;
    is_broadcast_source: boolean;
    last_message?: {
        content: string;
        created_at: string;
        sender_name: string;
    } | null;
    participants: MessageSender[];
}

export interface ConversationDetail extends ConversationList {
    messages: Message[];
}

// For the Broadcast Composer
export interface BroadcastFilters {
    target_level: 'GLOBAL' | 'MUNICIPALITY' | 'CLUB';
    target_id?: number;
    recipient_type: 'YOUTH' | 'GUARDIAN' | 'BOTH' | 'ADMINS';
    specific_filters?: {
        gender?: string;
        grade?: number;
        interests?: number[];
    };
}

export interface SendMessagePayload {
    conversation_id?: number;
    recipient_id?: number; // For new DMs
    content?: string;
    attachment?: File;
}
