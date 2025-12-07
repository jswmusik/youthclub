'use client';

import { useState, useEffect, useRef } from 'react';
import { messengerApi } from '../../../../lib/messenger-api';
import { ConversationDetail as ConversationDetailType, Message } from '../../../../types/messenger';
import MessageBubble from '../message/MessageBubble';
import MessageComposer from '../message/MessageComposer';

interface ConversationDetailProps {
    conversationId: number;
    onBack?: () => void; // For mobile
    isAdmin?: boolean;
}

export default function ConversationDetail({ conversationId, onBack, isAdmin }: ConversationDetailProps) {
    const [detail, setDetail] = useState<ConversationDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Fetch Logic
    const loadData = async () => {
        try {
            const res = await messengerApi.getConversationDetail(conversationId);
            setDetail(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Initial Load & Polling (Every 5s for active chat)
    useEffect(() => {
        setLoading(true);
        loadData();
        
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, [conversationId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (detail?.messages) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [detail?.messages.length, conversationId]);

    const handleSend = async (content: string, attachment?: File) => {
        // Optimistic UI update could go here
        await messengerApi.sendMessage({
            conversation_id: conversationId,
            content,
            attachment
        });
        loadData(); // Refresh immediately
    };

    if (loading && !detail) {
        return <div className="h-full flex items-center justify-center text-gray-400">Loading chat...</div>;
    }

    if (!detail) return null;

    // Check Broadcast Rules
    // If it's a broadcast source (admin side), or received broadcast (user side)
    const isBroadcast = detail.type === 'BROADCAST' || detail.type === 'SYSTEM';
    // Admins can reply to their OWN broadcasts (technically adds to thread), 
    // but typically user cannot reply to a broadcast directly.
    const canReply = !isBroadcast || isAdmin;

    return (
        <div className="flex flex-col h-full bg-white md:rounded-r-2xl">
            {/* Header */}
            <div className="flex-shrink-0 h-16 border-b border-gray-200 flex items-center px-4 justify-between bg-white md:rounded-tr-2xl">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="md:hidden text-gray-500">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                    <div>
                        <h3 className="font-bold text-gray-800">{detail.subject}</h3>
                        <p className="text-xs text-gray-500">
                            {detail.participants.length} participants • {detail.type}
                        </p>
                    </div>
                </div>
                
                {/* Context Menu (Optional) */}
                <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 custom-scrollbar">
                {/* System Notice for Broadcasts */}
                {isBroadcast && (
                    <div className="flex justify-center mb-6">
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-medium">
                            📢 This is a one-way broadcast message.
                        </span>
                    </div>
                )}

                {detail.messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Composer or Action Area */}
            {canReply ? (
                <MessageComposer onSend={handleSend} />
            ) : (
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2">
                    <p className="text-sm text-gray-500">Replies are disabled for this conversation.</p>
                    <button 
                        onClick={() => alert("Redirect to create new DM with sender logic here")}
                        className="text-blue-600 font-bold text-sm hover:underline"
                    >
                        Contact Staff Directly
                    </button>
                </div>
            )}
        </div>
    );
}
