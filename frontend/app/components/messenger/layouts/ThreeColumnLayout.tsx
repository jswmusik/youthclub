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
        <div className="flex flex-col md:flex-row h-full min-h-0 bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden border border-gray-100 max-w-full">
            
            {/* COL 1: Filters & Tools - Mobile: Horizontal, Desktop: Vertical */}
            <div className="flex md:flex-col md:w-64 border-b md:border-b-0 md:border-r border-gray-100 bg-[#EBEBFE]/30 p-2 sm:p-3 md:p-4 gap-2 md:gap-0 overflow-x-auto md:overflow-x-visible flex-shrink-0 min-w-0 max-w-full">
                {/* Mobile: Horizontal scrollable buttons */}
                <div className="flex md:flex-col gap-2 md:gap-0 md:min-w-0">
                    <button 
                        onClick={() => setShowSearchModal(true)}
                        className="flex-shrink-0 md:w-full bg-[#4D4DA4] hover:bg-[#FF5485] active:scale-95 text-white font-semibold py-2 px-3 sm:px-4 rounded-full transition-all mb-0 md:mb-3 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap touch-manipulation"
                    >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden xs:inline sm:hidden">Message</span>
                        <span className="hidden sm:inline md:hidden">Send Message</span>
                        <span className="hidden md:inline">Send Individual Message</span>
                    </button>
                    <button 
                        onClick={() => setShowBroadcastModal(true)}
                        className="flex-shrink-0 md:w-full bg-[#4D4DA4] hover:bg-[#FF5485] active:scale-95 text-white font-semibold py-2 px-3 sm:px-4 rounded-full transition-all mb-0 md:mb-6 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap touch-manipulation"
                    >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                        <span className="hidden xs:inline sm:hidden">Broadcast</span>
                        <span className="hidden sm:inline md:hidden">New Broadcast</span>
                        <span className="hidden md:inline">New Broadcast</span>
                    </button>
                </div>

                {/* Filters - Mobile: Horizontal tabs, Desktop: Vertical nav */}
                <nav className="flex md:flex-col gap-1 md:space-y-1 overflow-x-auto md:overflow-x-visible pb-1 sm:pb-2 md:pb-0">
                    {filters.map(f => (
                        <button
                            key={f.id}
                            onClick={() => onSetFilter(f.id)}
                            className={`flex-shrink-0 md:w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap touch-manipulation ${
                                filter === f.id 
                                    ? 'bg-white text-[#4D4DA4] shadow-sm border border-[#EBEBFE]' 
                                    : 'text-gray-600 hover:bg-white hover:text-[#121213] active:bg-white'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* COL 2: List */}
            <div className={`
                flex-shrink-0 w-full md:w-80 lg:w-96 border-r border-gray-100 flex flex-col bg-white min-w-0 max-w-full
                ${selectedThreadId ? 'hidden md:flex' : 'flex'}
            `}>
                <div className="p-3 sm:p-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex justify-between items-center mb-2 sm:mb-3">
                        <h3 className="font-bold text-[#121213] text-base sm:text-lg">Inbox</h3>
                        <span className="text-xs font-medium bg-[#EBEBFE] text-[#4D4DA4] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                            {filteredConversations.length}
                        </span>
                    </div>
                    {/* Search Field */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSetSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="block w-full pl-8 sm:pl-9 pr-8 sm:pr-9 py-1.5 sm:py-2 text-xs sm:text-sm border-0 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#4D4DA4] focus:bg-white transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSetSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-2.5 sm:pr-3 flex items-center text-gray-400 hover:text-gray-600 active:text-gray-800 touch-manipulation"
                            >
                                <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                    {loading ? (
                        <div className="p-6 sm:p-8 text-center text-gray-400 text-xs sm:text-sm">Loading...</div>
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
                flex-1 flex flex-col bg-gray-50 min-w-0 max-w-full
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
                    }}
                    onMessageSent={(conversationId) => {
                        setToast({ 
                            message: "Message sent successfully!", 
                            type: 'success', 
                            isVisible: true 
                        });
                        // Refresh list to get the new conversation
                        onRefresh();
                        // Select the conversation thread after refresh
                        if (conversationId) {
                            setTimeout(() => {
                                onSelectThread(conversationId);
                            }, 500);
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
