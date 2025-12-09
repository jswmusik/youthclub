'use client';

import { ConversationList as ConversationListType } from '../../../../types/messenger';
import ConversationList from '../conversation/ConversationList';
import ConversationDetail from '../conversation/ConversationDetail';
import BroadcastComposerModal from '../broadcast/BroadcastComposerModal';
import UserSearchModal from '../search/UserSearchModal';
import Toast from '../../../components/Toast';
import { useState } from 'react';

interface ThreeColumnLayoutProps {
    conversations: ConversationListType[];
    selectedThreadId: number | null;
    onSelectThread: (id: number) => void;
    loading: boolean;
    filter: string;
    onSetFilter: (filter: string) => void;
    searchQuery: string;
    onSetSearchQuery: (query: string) => void;
    onRefresh: () => void;
    scope?: 'GLOBAL' | 'MUNICIPALITY' | 'CLUB';
}

export default function ThreeColumnLayout({
    conversations,
    selectedThreadId,
    onSelectThread,
    loading,
    filter,
    onSetFilter,
    searchQuery,
    onSetSearchQuery,
    onRefresh,
    scope = 'CLUB'
}: ThreeColumnLayoutProps) {
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    
    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    // Filter options
    const filters = [
        { id: 'ALL', label: 'All Messages' },
        { id: 'YOUTH', label: 'Youth' },
        { id: 'GUARDIAN', label: 'Guardians' },
        { id: 'GROUP', label: 'Groups' },
        { id: 'SYSTEM', label: 'System / HQ' },
    ];

    // Conversations are already filtered by backend, just use them directly
    const filteredConversations = conversations;

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
            
            {/* COL 1: Filters & Tools */}
            <div className="hidden md:flex flex-col w-64 border-r border-gray-200 bg-gray-50 p-4">
                <button 
                    onClick={() => setShowSearchModal(true)}
                    className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-indigo-700 transition-colors mb-3 flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Send Individual Message
                </button>
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
                <div className="p-4 border-b border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-gray-700">Inbox</h3>
                        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            {filteredConversations.length}
                        </span>
                    </div>
                    {/* Search Field */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSetSearchQuery(e.target.value)}
                            placeholder="Search conversations..."
                            className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSetSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
                    ) : (
                        <ConversationList 
                            conversations={filteredConversations}
                            selectedId={selectedThreadId}
                            onSelect={onSelectThread}
                        />
                    )}
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
                        onRefresh={onRefresh}
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
                        setToast({ 
                            message: "Broadcast sent successfully!", 
                            type: 'success', 
                            isVisible: true 
                        });
                    }}
                    onError={(errorMsg: string) => {
                        setToast({ 
                            message: errorMsg || "Failed to send broadcast.", 
                            type: 'error', 
                            isVisible: true 
                        });
                    }}
                    initialScope={scope}
                />
            )}

            {/* User Search Modal */}
            {showSearchModal && (
                <UserSearchModal
                    isOpen={showSearchModal}
                    onClose={() => {
                        setShowSearchModal(false);
                        onRefresh(); // Refresh list after sending message
                    }}
                    onMessageSent={() => {
                        setToast({ 
                            message: "Message sent successfully!", 
                            type: 'success', 
                            isVisible: true 
                        });
                    }}
                    onError={(errorMsg: string) => {
                        setToast({ 
                            message: errorMsg || "Failed to send message.", 
                            type: 'error', 
                            isVisible: true 
                        });
                    }}
                />
            )}
            
            {/* Toast Notification */}
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />
        </div>
    );
}
