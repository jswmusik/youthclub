'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation'; // Import hooks
import { messengerApi } from '../../../lib/messenger-api';
import { ConversationList as ConversationListType } from '../../../types/messenger';
import TwoColumnLayout from './layouts/TwoColumnLayout';
import ThreeColumnLayout from './layouts/ThreeColumnLayout';

interface MessengerManagerProps {
    role: 'ADMIN' | 'YOUTH' | 'GUARDIAN';
    scope?: 'GLOBAL' | 'MUNICIPALITY' | 'CLUB'; // Useful for Admins context
}

export default function MessengerManager({ role, scope }: MessengerManagerProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    
    // Read ?threadId= from URL
    const initialThreadId = searchParams.get('threadId') 
        ? parseInt(searchParams.get('threadId')!) 
        : null;

    const [conversations, setConversations] = useState<ConversationListType[]>([]);
    const [selectedThreadId, setSelectedThreadId] = useState<number | null>(initialThreadId);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // 'ALL', 'YOUTH', 'GUARDIAN', 'SYSTEM', 'GROUP'
    const [searchQuery, setSearchQuery] = useState('');

    const fetchConversations = useCallback(async () => {
        try {
            const res = await messengerApi.getConversations(1, filter, searchQuery);
            setConversations(res.data.results);
        } catch (error) {
            console.error("Failed to load conversations", error);
        } finally {
            setLoading(false);
        }
    }, [filter, searchQuery]);

    // Initial Load & Polling (Simple Real-time MVP)
    useEffect(() => {
        fetchConversations();
        
        // Poll every 15 seconds to keep inbox fresh
        const interval = setInterval(fetchConversations, 15000);
        return () => clearInterval(interval);
    }, [fetchConversations]);

    // Handle deep linking: If URL has threadId, select it once conversations are loaded
    useEffect(() => {
        if (initialThreadId && conversations.length > 0) {
            // Verify it exists in list (optional, but good UX)
            const exists = conversations.find(c => c.id === initialThreadId);
            if (exists) {
                setSelectedThreadId(initialThreadId);
            }
        }
    }, [initialThreadId, conversations.length]); // Run when ID changes or list loads

    const handleSelectThread = (id: number) => {
        setSelectedThreadId(id);
        // Update URL to reflect selected thread for better UX and bookmarking
        if (id) {
            router.replace(`${pathname}?threadId=${id}`, { scroll: false });
        } else {
            router.replace(pathname, { scroll: false });
        }
    };
    
    const handleConversationCreated = (conversationId: number) => {
        // Ensure the conversation is selected
        setSelectedThreadId(conversationId);
        // Update URL
        router.replace(`${pathname}?threadId=${conversationId}`, { scroll: false });
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
                searchQuery={searchQuery}
                onSetSearchQuery={setSearchQuery}
                onRefresh={handleRefresh}
                scope={scope}
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
            searchQuery={searchQuery}
            onSetSearchQuery={setSearchQuery}
            onConversationCreated={handleConversationCreated}
        />
    );
}
