// frontend/types/messenger.ts

import { User } from './user'; // Assuming you have a base User type

export interface MessageSender {
    id: number;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    role?: string; // Optional, useful for admins
}

export type ReactionType = 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD' | 'ANGRY';

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
    reaction_count?: number;
    reaction_breakdown?: Record<ReactionType, number>;
    user_reaction?: ReactionType | null;
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
        sender_avatar?: string | null;
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
        interests?: number[]; // List of IDs
        
        // New Fields
        age_min?: number;
        age_max?: number;
        groups?: number[]; // List of Group IDs. If set, overrides other filters.
    };
}

export interface SendMessagePayload {
    conversation_id?: number;
    recipient_id?: number; // For new DMs
    subject?: string; // Optional subject for new conversations
    content?: string;
    attachment?: File;
}
