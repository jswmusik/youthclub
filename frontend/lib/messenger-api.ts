// frontend/lib/messenger-api.ts

import api from './api';
import { 
    ConversationList, 
    ConversationDetail, 
    SendMessagePayload, 
    BroadcastFilters 
} from '../types/messenger';

const BASE_URL = '/messenger';

export const messengerApi = {
    // --- Conversations ---
    
    getConversations: async (page = 1) => {
        return api.get<{ results: ConversationList[], count: number }>(`${BASE_URL}/conversations/?page=${page}`);
    },

    getConversationDetail: async (id: number) => {
        return api.get<ConversationDetail>(`${BASE_URL}/conversations/${id}/`);
    },

    startConversation: async (recipientId: number) => {
        // Starts a new empty thread or returns existing one
        return api.post<{ id: number; status: string }>(`${BASE_URL}/conversations/start/`, {
            recipient_id: recipientId
        });
    },

    // --- Messages ---

    sendMessage: async (data: SendMessagePayload) => {
        const formData = new FormData();
        
        if (data.content) formData.append('content', data.content);
        if (data.attachment) formData.append('attachment', data.attachment);
        
        // If replying to existing thread
        if (data.conversation_id) {
            return api.post(
                `${BASE_URL}/conversations/${data.conversation_id}/reply/`, 
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
        }
        
        // If starting new thread with initial message
        if (data.recipient_id) {
            formData.append('recipient_id', data.recipient_id.toString());
            return api.post(
                `${BASE_URL}/conversations/start/`, 
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
        }
        
        throw new Error("Must provide conversation_id or recipient_id");
    },

    // --- Broadcasts (Admin) ---

    estimateBroadcast: async (filters: BroadcastFilters) => {
        return api.post<{ count: number }>(`${BASE_URL}/broadcast/estimate/`, filters);
    },

    sendBroadcast: async (filters: BroadcastFilters, subject: string, content: string, attachment?: File) => {
        const formData = new FormData();
        
        // Flatten filters for FormData or send as JSON string if your backend expects it
        // Since our serializer expects 'target_level' etc at top level and 'filters' as dict:
        
        formData.append('target_level', filters.target_level);
        if (filters.target_id) formData.append('target_id', filters.target_id.toString());
        formData.append('recipient_type', filters.recipient_type);
        
        // Complex nested JSON filters
        if (filters.specific_filters) {
            formData.append('filters', JSON.stringify(filters.specific_filters));
        }

        formData.append('subject', subject);
        formData.append('content', content);
        if (attachment) formData.append('attachment', attachment);

        return api.post(`${BASE_URL}/broadcast/send/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // --- Inbox Utilities ---

    getUnreadCount: async () => {
        return api.get<{ count: number }>(`${BASE_URL}/inbox/unread_count/`);
    }
};
