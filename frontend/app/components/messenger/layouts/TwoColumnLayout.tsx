'use client';

import { useState } from 'react';
import { ConversationList as ConversationListType } from '../../../../types/messenger';
import ConversationList from '../conversation/ConversationList';
import ConversationDetail from '../conversation/ConversationDetail';

interface TwoColumnLayoutProps {
    conversations: ConversationListType[];
    selectedThreadId: number | null;
    onSelectThread: (id: number) => void;
    loading: boolean;
    onRefresh: () => void;
}

export default function TwoColumnLayout({
    conversations,
    selectedThreadId,
    onSelectThread,
    loading,
    onRefresh
}: TwoColumnLayoutProps) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768; // Simple check, usually use a hook

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
            
            {/* LEFT COLUMN: Inbox List */}
            {/* On Mobile: Hide this column if a thread is selected */}
            <div className={`
                flex-shrink-0 w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col
                ${selectedThreadId ? 'hidden md:flex' : 'flex'}
            `}>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="font-bold text-lg text-gray-800">Messages</h2>
                    <button onClick={onRefresh} className="text-gray-500 hover:text-blue-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Loading...</div>
                    ) : (
                        <ConversationList 
                            conversations={conversations}
                            selectedId={selectedThreadId}
                            onSelect={onSelectThread}
                        />
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: Conversation Detail */}
            {/* On Mobile: Hide this column if NO thread is selected */}
            <div className={`
                flex-1 flex flex-col bg-gray-50
                ${!selectedThreadId ? 'hidden md:flex' : 'flex'}
            `}>
                {selectedThreadId ? (
                    <ConversationDetail 
                        conversationId={selectedThreadId} 
                        onBack={() => onSelectThread(0)} // 0 or null to unselect
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 flex-col">
                        <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p>Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}
