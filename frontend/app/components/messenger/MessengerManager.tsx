'use client';

import { useState, useEffect, useCallback } from 'react';
import { messengerApi } from '../../../lib/messenger-api';
import { ConversationList as ConversationListType } from '../../../types/messenger';
import TwoColumnLayout from './layouts/TwoColumnLayout';
import ThreeColumnLayout from './layouts/ThreeColumnLayout';

interface MessengerManagerProps {
    role: 'ADMIN' | 'YOUTH' | 'GUARDIAN';
    scope?: 'GLOBAL' | 'MUNICIPALITY' | 'CLUB'; // Useful for Admins context
}

export default function MessengerManager({ role, scope }: MessengerManagerProps) {
    const [conversations, setConversations] = useState<ConversationListType[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // 'ALL', 'UNREAD', 'SYSTEM', etc.

    const fetchConversations = useCallback(async () => {
        try {
            // In a real app, you might pass 'filter' to the API here
            const res = await messengerApi.getConversations();
            setConversations(res.data.results);
        } catch (error) {
            console.error("Failed to load conversations", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial Load & Polling (Simple Real-time MVP)
    useEffect(() => {
        fetchConversations();
        
        // Poll every 15 seconds to keep inbox fresh
        const interval = setInterval(fetchConversations, 15000);
        return () => clearInterval(interval);
    }, [fetchConversations]);

    const handleSelectThread = (id: number) => {
        setSelectedThreadId(id);
        // Optimistically mark as read in UI or trigger fetch?
        // Usually, the ConversationDetail component handles the "mark read" API call on mount.
    };

    const handleRefresh = () => {
        fetchConversations();
    };

    // Render the appropriate layout based on Role
    if (role === 'ADMIN') {
        return (
            <ThreeColumnLayout
                conversations={conversations}
                selectedThreadId={selectedThreadId}
                onSelectThread={handleSelectThread}
                loading={loading}
                filter={filter}
                onSetFilter={setFilter}
                onRefresh={handleRefresh}
            />
        );
    }

    // Default to 2-Column for Youth/Guardians
    return (
        <TwoColumnLayout
            conversations={conversations}
            selectedThreadId={selectedThreadId}
            onSelectThread={handleSelectThread}
            loading={loading}
            onRefresh={handleRefresh}
        />
    );
}
