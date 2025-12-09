'use client';

import { useState } from 'react';
import { ConversationList as ConversationListType } from '../../../../types/messenger';
import ConversationList from '../conversation/ConversationList';
import ConversationDetail from '../conversation/ConversationDetail';
import AdminSearchModal from '../search/AdminSearchModal';
import Toast from '../../../components/Toast';

interface TwoColumnLayoutProps {
    conversations: ConversationListType[];
    selectedThreadId: number | null;
    onSelectThread: (id: number) => void;
    loading: boolean;
    onRefresh: () => void;
    searchQuery: string;
    onSetSearchQuery: (query: string) => void;
    onConversationCreated?: (conversationId: number) => void;
}

export default function TwoColumnLayout({
    conversations,
    selectedThreadId,
    onSelectThread,
    loading,
    onRefresh,
    searchQuery,
    onSetSearchQuery,
    onConversationCreated
}: TwoColumnLayoutProps) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768; // Simple check, usually use a hook
    const [showAdminSearchModal, setShowAdminSearchModal] = useState(false);
    
    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
            
            {/* LEFT COLUMN: Inbox List */}
            {/* On Mobile: Hide this column if a thread is selected */}
            <div className={`
                flex-shrink-0 w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col
                ${selectedThreadId ? 'hidden md:flex' : 'flex'}
            `}>
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="font-bold text-lg text-gray-800">Messages</h2>
                        <button onClick={onRefresh} className="text-gray-500 hover:text-blue-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Search Field */}
                    <div className="relative mb-3">
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
                    
                    <button 
                        onClick={() => setShowAdminSearchModal(true)}
                        className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Contact an Admin
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
                        onRefresh={onRefresh}
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
            
            {/* Admin Search Modal */}
            {showAdminSearchModal && (
                <AdminSearchModal
                    isOpen={showAdminSearchModal}
                    onClose={() => {
                        setShowAdminSearchModal(false);
                    }}
                    onMessageSent={(conversationId) => {
                        setToast({ 
                            message: "Message sent successfully!", 
                            type: 'success', 
                            isVisible: true 
                        });
                        // Close modal first
                        setShowAdminSearchModal(false);
                        // Refresh list to get the new conversation, then select it
                        if (conversationId) {
                            // Refresh and then select the conversation
                            onRefresh();
                            // Wait a bit for the refresh to complete, then select the conversation
                            setTimeout(() => {
                                onSelectThread(conversationId);
                                // Also notify parent if callback provided
                                if (onConversationCreated) {
                                    onConversationCreated(conversationId);
                                }
                            }, 800);
                        } else {
                            // If no conversation ID, just refresh
                            onRefresh();
                        }
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
