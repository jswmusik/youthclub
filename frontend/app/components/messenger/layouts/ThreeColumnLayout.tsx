'use client';

import { ConversationList as ConversationListType } from '../../../../types/messenger';
import ConversationList from '../conversation/ConversationList';
import ConversationDetail from '../conversation/ConversationDetail';
import BroadcastComposerModal from '../broadcast/BroadcastComposerModal';
import { useState } from 'react';

interface ThreeColumnLayoutProps {
    conversations: ConversationListType[];
    selectedThreadId: number | null;
    onSelectThread: (id: number) => void;
    loading: boolean;
    filter: string;
    onSetFilter: (filter: string) => void;
    onRefresh: () => void;
}

export default function ThreeColumnLayout({
    conversations,
    selectedThreadId,
    onSelectThread,
    loading,
    filter,
    onSetFilter,
    onRefresh
}: ThreeColumnLayoutProps) {
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);

    // Basic Folders as per Spec 5.3
    const filters = [
        { id: 'ALL', label: 'All Messages' },
        { id: 'YOUTH', label: 'Youth' },
        { id: 'GUARDIAN', label: 'Guardians' },
        { id: 'SYSTEM', label: 'System / HQ' },
    ];

    // Filter logic (Client-side for MVP, Server-side for scale)
    // For MVP, we assume the API returns everything and we filter here, 
    // or you pass the filter prop to the API in Manager.
    // Let's assume client-side filtering for simplicity now:
    const filteredConversations = conversations.filter(c => {
        if (filter === 'ALL') return true;
        // In reality, we'd check c.type or c.participants roles here
        // For now, return all or mock logic
        return true; 
    });

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
            
            {/* COL 1: Filters & Tools */}
            <div className="hidden md:flex flex-col w-64 border-r border-gray-200 bg-gray-50 p-4">
                <button 
                    onClick={() => setShowBroadcastModal(true)}
                    className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-blue-700 transition-colors mb-6 flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    New Broadcast
                </button>

                <nav className="space-y-1">
                    {filters.map(f => (
                        <button
                            key={f.id}
                            onClick={() => onSetFilter(f.id)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                filter === f.id 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* COL 2: List */}
            <div className={`
                flex-shrink-0 w-full md:w-80 border-r border-gray-200 flex flex-col bg-white
                ${selectedThreadId ? 'hidden md:flex' : 'flex'}
            `}>
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Inbox</h3>
                    <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {filteredConversations.length}
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <ConversationList 
                        conversations={filteredConversations}
                        selectedId={selectedThreadId}
                        onSelect={onSelectThread}
                    />
                </div>
            </div>

            {/* COL 3: Detail */}
            <div className={`
                flex-1 flex flex-col bg-gray-50
                ${!selectedThreadId ? 'hidden md:flex' : 'flex'}
            `}>
                {selectedThreadId ? (
                    <ConversationDetail 
                        conversationId={selectedThreadId} 
                        onBack={() => onSelectThread(0 as any)}
                        isAdmin={true} 
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        Select a conversation
                    </div>
                )}
            </div>

            {/* Broadcast Modal */}
            {showBroadcastModal && (
                <BroadcastComposerModal
                    onClose={() => setShowBroadcastModal(false)}
                    onSuccess={() => {
                        onRefresh(); // Refresh list to see the new broadcast thread
                        // Optionally trigger toast here
                    }}
                    // You might want to pass initialScope based on the user's actual role/context here if available
                    // initialScope="CLUB"
                />
            )}
        </div>
    );
}
