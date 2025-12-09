// frontend/lib/messenger-api.ts

import api from './api';
import { 
    ConversationList, 
    ConversationDetail, 
    SendMessagePayload, 
    BroadcastFilters,
    ReactionType
} from '../types/messenger';

const BASE_URL = '/messenger';

export const messengerApi = {
    // --- Conversations ---
    
    getConversations: async (page = 1, filter?: string, search?: string) => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        if (filter && filter !== 'ALL') {
            params.append('filter', filter);
        }
        if (search && search.trim()) {
            params.append('search', search.trim());
        }
        return api.get<{ results: ConversationList[], count: number }>(`${BASE_URL}/conversations/?${params.toString()}`);
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

    checkConversationExists: async (recipientId: number) => {
        // Check if a conversation already exists with this recipient
        // Returns { exists: boolean, conversationId?: number }
        // We call startConversation without subject - if it's existing, it works; if new, it requires subject
        try {
            // Try to call startConversation with just recipient_id (no subject, no content)
            // If conversation exists, backend returns it without requiring subject
            // If conversation doesn't exist, backend requires subject and will error
            const formData = new FormData();
            formData.append('recipient_id', recipientId.toString());
            
            const res = await api.post<{ id: number; status: string }>(
                `${BASE_URL}/conversations/start/`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            
            // If we get a response, conversation exists
            if (res.data.status === 'existing') {
                return { exists: true, conversationId: res.data.id };
            }
            // If status is 'created', it means we created an empty conversation (shouldn't happen without subject)
            return { exists: false };
        } catch (err: any) {
            // If error is about subject being required (400), no conversation exists
            if (err?.response?.status === 400 && err?.response?.data?.error?.includes('Subject')) {
                return { exists: false };
            }
            // Other errors - log and assume no conversation exists
            console.error('Error checking conversation:', err);
            return { exists: false };
        }
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
            // Send subject if provided (required for new conversations, optional for existing)
            if (data.subject && data.subject.trim()) {
                formData.append('subject', data.subject.trim());
            }
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

    // --- Conversation Actions ---

    hideConversation: async (conversationId: number) => {
        return api.post<{ status: string; message: string }>(
            `${BASE_URL}/conversations/${conversationId}/hide/`
        );
    },

    deleteConversation: async (conversationId: number) => {
        return api.post<{ status: string; message: string }>(
            `${BASE_URL}/conversations/${conversationId}/delete/`
        );
    },

    // --- Inbox Utilities ---

    getUnreadCount: async () => {
        return api.get<{ count: number }>(`${BASE_URL}/inbox/unread_count/`);
    },

    searchUsers: async (query: string, userType?: 'YOUTH' | 'GUARDIAN' | 'STAFF') => {
        const params = new URLSearchParams({ q: query });
        if (userType) {
            params.append('user_type', userType);
        }
        return api.get<{ results: any[] }>(`${BASE_URL}/inbox/search_users/?${params.toString()}`);
    },
    
    searchAdmins: async (query: string) => {
        // For youth members to search admins they can contact
        const params = new URLSearchParams({ q: query });
        return api.get<{ results: any[] }>(`${BASE_URL}/inbox/search_admins/?${params.toString()}`);
    },
    
    // --- Message Reactions ---
    
    addMessageReaction: async (messageId: number, reactionType: ReactionType) => {
        return api.post<{
            message: string;
            reaction_type: ReactionType;
            reaction_count: number;
            reaction_breakdown: Record<ReactionType, number>;
            user_reaction: ReactionType;
        }>(`${BASE_URL}/messages/${messageId}/reaction/`, {
            reaction_type: reactionType
        });
    },
    
    updateMessageReaction: async (messageId: number, reactionType: ReactionType) => {
        return api.put<{
            message: string;
            reaction_type: ReactionType;
            reaction_count: number;
            reaction_breakdown: Record<ReactionType, number>;
            user_reaction: ReactionType;
        }>(`${BASE_URL}/messages/${messageId}/reaction/`, {
            reaction_type: reactionType
        });
    },
    
    removeMessageReaction: async (messageId: number, reactionType?: ReactionType) => {
        const config: any = {};
        if (reactionType) {
            config.data = { reaction_type: reactionType };
        }
        return api.delete<{
            message: string;
            reaction_count: number;
            reaction_breakdown: Record<ReactionType, number>;
            user_reaction: null;
        }>(`${BASE_URL}/messages/${messageId}/reaction/`, config);
    }
};
