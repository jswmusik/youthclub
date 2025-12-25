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
    darkMode?: boolean;
}

export default function TwoColumnLayout({
    conversations,
    selectedThreadId,
    onSelectThread,
    loading,
    onRefresh,
    searchQuery,
    onSetSearchQuery,
    onConversationCreated,
    darkMode = false
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
        <div className={`flex h-full md:rounded-2xl overflow-hidden max-h-full w-full md:max-w-6xl lg:max-w-7xl md:mx-auto overflow-x-hidden ${
            darkMode 
                ? 'bg-[var(--dark-800)] md:border md:border-[var(--dark-500)]' 
                : 'bg-white md:shadow-sm md:border md:border-gray-200'
        }`}>
            
            {/* LEFT COLUMN: Inbox List */}
            {/* On Mobile: Hide this column if a thread is selected */}
            <div className={`
                flex-shrink-0 w-full md:w-80 lg:w-96 flex flex-col h-full
                ${darkMode ? 'border-r border-[var(--dark-500)]' : 'border-r border-gray-200'}
                ${selectedThreadId ? 'hidden md:flex' : 'flex'}
            `}>
                <div className={`p-3 sm:p-4 border-b flex-shrink-0 ${
                    darkMode 
                        ? 'border-[var(--dark-500)] bg-[var(--dark-700)]' 
                        : 'border-gray-100 bg-gray-50'
                }`}>
                    <div className="flex justify-between items-center mb-3">
                        <h2 className={`font-bold text-lg ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>Messages</h2>
                        <button onClick={onRefresh} className={darkMode ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)]' : 'text-gray-500 hover:text-blue-600'}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Search Field */}
                    <div className="relative mb-3">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className={`h-4 w-4 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSetSearchQuery(e.target.value)}
                            placeholder="Search conversations..."
                            className={`block w-full pl-9 pr-3 py-2 text-sm rounded-lg transition-all ${
                                darkMode 
                                    ? 'bg-[var(--dark-600)] border border-[var(--dark-400)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)]' 
                                    : 'border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white'
                            }`}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSetSearchQuery('')}
                                className={`absolute inset-y-0 right-0 pr-3 flex items-center ${darkMode ? 'text-[var(--brand-light)]/40 hover:text-[var(--brand-light)]' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                    
                    <button 
                        onClick={() => setShowAdminSearchModal(true)}
                        className={`w-full font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ${
                            darkMode 
                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/80' 
                                : 'bg-[#4D4DA4] text-white shadow hover:bg-[#5D5DB4]'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Contact an Admin
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto min-h-0">
                    {loading ? (
                        <div className={`p-8 text-center ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-400'}`}>Loading...</div>
                    ) : (
                        <ConversationList 
                            conversations={conversations}
                            selectedId={selectedThreadId}
                            onSelect={onSelectThread}
                            onRefresh={onRefresh}
                            darkMode={darkMode}
                        />
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: Conversation Detail */}
            {/* On Mobile: Hide this column if NO thread is selected */}
            <div className={`
                flex-1 flex flex-col min-h-0 h-full
                ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-gray-50'}
                ${!selectedThreadId ? 'hidden md:flex' : 'flex'}
            `}>
                {selectedThreadId ? (
                    <ConversationDetail 
                        conversationId={selectedThreadId} 
                        onBack={() => onSelectThread(0)} // 0 or null to unselect
                        onRefresh={onRefresh}
                        darkMode={darkMode}
                    />
                ) : (
                    <div className={`flex-1 flex items-center justify-center flex-col ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`}>
                        <svg className={`w-16 h-16 mb-4 ${darkMode ? 'text-[var(--dark-500)]' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    darkMode={darkMode}
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
