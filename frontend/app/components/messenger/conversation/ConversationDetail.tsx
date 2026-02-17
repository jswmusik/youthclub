'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { messengerApi } from '../../../../lib/messenger-api';
import { ConversationDetail as ConversationDetailType, Message } from '../../../../types/messenger';
import MessageBubble from '../message/MessageBubble';
import MessageComposer from '../message/MessageComposer';
import ConfirmationModal from '../../../components/ConfirmationModal';
import TypingIndicator from '../message/TypingIndicator';
import { useToast } from '../../../../hooks/useToast';
import { useWebSocket } from '../../../../hooks/useWebSocket';

interface ConversationDetailProps {
    conversationId: number;
    onBack?: () => void; // For mobile
    isAdmin?: boolean;
    onRefresh?: () => void; // Callback to refresh conversation list
    darkMode?: boolean;
}

export default function ConversationDetail({ conversationId, onBack, isAdmin, onRefresh, darkMode = false }: ConversationDetailProps) {
    const t = useTranslations('messages');
    const [detail, setDetail] = useState<ConversationDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const topRef = useRef<HTMLDivElement>(null);
    
    // Track which messages have been marked as read to avoid duplicate API calls
    const markedAsReadRef = useRef<Set<number>>(new Set());
    
    // Confirmation modal states
    const [showHideModal, setShowHideModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    // Toast
    const { success, error, info } = useToast();

    // WebSocket for real-time updates
    const handleNewMessage = useCallback((message: Message) => {
        setDetail(prev => {
            if (!prev) return prev;
            // Check if message already exists
            if (prev.messages.some(m => m.id === message.id)) return prev;
            return {
                ...prev,
                messages: [...prev.messages, message]
            };
        });
        // Scroll to bottom for new messages
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        // Refresh conversation list
        if (onRefresh) {
            onRefresh();
        }
    }, [onRefresh]);

    const { isConnected, typingUsers, sendTyping } = useWebSocket(conversationId, {
        onNewMessage: handleNewMessage
    });

    // Convert typing users map to array of names for display
    const typingUserNames = useMemo(() => {
        const names = Array.from(typingUsers.values()).map(u => u.name);
        if (names.length > 0) {
            console.log('ConversationDetail: typingUserNames updated:', names);
        }
        return names;
    }, [typingUsers]);

    // Mark messages as read when they scroll into view
    const markMessagesAsRead = useCallback(async (messageIds: number[]) => {
        // Filter out already marked messages
        const newMessageIds = messageIds.filter(id => !markedAsReadRef.current.has(id));
        if (newMessageIds.length === 0) return;
        
        // Add to marked set immediately to prevent duplicate calls
        newMessageIds.forEach(id => markedAsReadRef.current.add(id));
        
        try {
            await messengerApi.markMessagesRead(conversationId, newMessageIds);
            // Update local state to reflect read status
            setDetail(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    messages: prev.messages.map(m => 
                        newMessageIds.includes(m.id) && !m.is_me
                            ? { ...m, read_status: { is_read: true, read_at: new Date().toISOString() } }
                            : m
                    )
                };
            });
            // Refresh conversation list to update unread counts
            if (onRefresh) {
                onRefresh();
            }
        } catch (err) {
            // Remove from marked set on error so it can be retried
            newMessageIds.forEach(id => markedAsReadRef.current.delete(id));
            console.error('Failed to mark messages as read:', err);
        }
    }, [conversationId, onRefresh]);

    // Fetch Logic - loads newest messages (page 1)
    const loadData = async () => {
        try {
            const res = await messengerApi.getConversationDetail(conversationId, 1, 50);
            setDetail(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Load older messages (previous pages)
    const loadMoreMessages = async () => {
        if (!detail?.pagination?.has_previous || loadingMore) return;
        
        setLoadingMore(true);
        try {
            const nextPage = (detail.pagination?.page || 1) + 1;
            const res = await messengerApi.getConversationDetail(conversationId, nextPage, 50);
            
            // Prepend older messages to the beginning
            setDetail(prev => {
                if (!prev) return res.data;
                
                // Get existing message IDs to avoid duplicates
                const existingIds = new Set(prev.messages.map(m => m.id));
                const newMessages = res.data.messages.filter(m => !existingIds.has(m.id));
                
                return {
                    ...prev,
                    messages: [...newMessages, ...prev.messages],
                    pagination: res.data.pagination
                };
            });
        } catch (err) {
            console.error('Failed to load more messages:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    // Reset marked messages when conversation changes
    useEffect(() => {
        markedAsReadRef.current = new Set();
    }, [conversationId]);

    // Initial Load & Polling (Every 10s for active chat - reduced from 5s)
    useEffect(() => {
        setLoading(true);
        loadData();
        
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, [conversationId]);

    // Intersection Observer for scroll-based read marking
    useEffect(() => {
        if (!detail?.messages || !messagesContainerRef.current) return;
        
        const observer = new IntersectionObserver(
            (entries) => {
                const visibleUnreadMessageIds: number[] = [];
                
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const messageId = parseInt(entry.target.getAttribute('data-message-id') || '0');
                        const isUnread = entry.target.getAttribute('data-is-unread') === 'true';
                        
                        if (messageId && isUnread) {
                            visibleUnreadMessageIds.push(messageId);
                        }
                    }
                });
                
                if (visibleUnreadMessageIds.length > 0) {
                    markMessagesAsRead(visibleUnreadMessageIds);
                }
            },
            {
                root: messagesContainerRef.current,
                rootMargin: '0px',
                threshold: 0.5 // Message is considered "seen" when 50% visible
            }
        );
        
        // Observe all message elements
        const messageElements = messagesContainerRef.current.querySelectorAll('[data-message-id]');
        messageElements.forEach(el => observer.observe(el));
        
        return () => observer.disconnect();
    }, [detail?.messages, markMessagesAsRead]);

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

    // Close menu when clicking outside
    // Note: We use a small timeout to prevent the menu from closing immediately after opening on touch devices
    useEffect(() => {
        if (!showMenu) return;
        
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        
        // Delay adding the listener to prevent immediate closure on touch devices
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside, { passive: true });
        }, 100);
        
        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showMenu]);

    const handleHideClick = () => {
        setShowMenu(false);
        setShowHideModal(true);
    };

    const handleHideConfirm = async () => {
        setShowHideModal(false);
        setActionLoading(true);
        try {
            await messengerApi.hideConversation(conversationId);
            success('Conversation hidden from inbox');
            // Refresh conversation list
            if (onRefresh) {
                onRefresh();
            }
            // Navigate back
            if (onBack) {
                onBack();
            }
        } catch (err: any) {
            console.error(err);
            error(err?.response?.data?.error || t('conversationDetail.failedToHide'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteClick = () => {
        setShowMenu(false);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        setShowDeleteModal(false);
        setActionLoading(true);
        try {
            await messengerApi.deleteConversation(conversationId);
            success('Conversation permanently deleted');
            // Refresh conversation list
            if (onRefresh) {
                onRefresh();
            }
            // Navigate back
            if (onBack) {
                onBack();
            }
        } catch (err: any) {
            console.error(err);
            error(err?.response?.data?.error || t('conversationDetail.failedToDelete'));
        } finally {
            setActionLoading(false);
        }
    };

    if (loading && !detail) {
        return <div className={`h-full flex items-center justify-center ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-400'}`}>Loading chat...</div>;
    }

    if (!detail) return null;

    // Check Broadcast Rules
    // If it's a broadcast source (admin side), or received broadcast (user side)
    const isBroadcast = detail.type === 'BROADCAST' || detail.type === 'SYSTEM';
    // Admins can reply to their OWN broadcasts (technically adds to thread), 
    // but typically user cannot reply to a broadcast directly.
    const canReply = !isBroadcast || isAdmin;

    return (
        <div className={`flex flex-col h-full md:rounded-r-xl min-h-0 max-w-full overflow-hidden max-h-full w-full ${
            darkMode ? 'bg-[var(--dark-800)]' : 'bg-white'
        }`}>
            {/* Header - Not fixed on mobile anymore, relative positioning */}
            <div className={`flex-shrink-0 h-14 sm:h-16 border-b flex items-center px-3 sm:px-4 md:px-4 justify-between md:rounded-tr-xl min-w-0 w-full ${
                darkMode 
                    ? 'border-[var(--dark-500)] bg-[var(--dark-700)]' 
                    : 'border-[#4D4DA4]/15 bg-white'
            }`}>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 w-full">
                    {onBack && (
                        <button 
                            onClick={onBack} 
                            className={`md:hidden flex-shrink-0 touch-manipulation p-1.5 -ml-1 ${
                                darkMode 
                                    ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] active:text-[var(--brand-primary)]' 
                                    : 'text-gray-600 hover:text-gray-800 active:text-gray-900'
                            }`}
                            aria-label="Back to inbox"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                    <div className="min-w-0 flex-1 overflow-hidden">
                        <h3 className={`font-semibold text-base sm:text-lg truncate leading-tight ${
                            darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
                        }`}>
                            {detail.subject || t('noSubject')}
                        </h3>
                        <p className={`text-xs sm:text-sm truncate mt-0.5 ${
                            darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'
                        }`}>
                            {detail.participants.length} {detail.participants.length === 1 ? t('participant') : t('participants')} • {t(`conversationType.${detail.type}`)}
                        </p>
                    </div>
                </div>
                
                {/* Context Menu */}
                <div className="relative flex-shrink-0" ref={menuRef}>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(prev => !prev);
                        }}
                        disabled={actionLoading}
                        className={`disabled:opacity-50 touch-manipulation p-2 -mr-1 ${
                            darkMode 
                                ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] active:text-[var(--brand-primary)]' 
                                : 'text-gray-500 hover:text-gray-700 active:text-gray-900'
                        }`}
                        aria-label="Conversation options"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>
                    
                    {/* Dropdown Menu - Inline positioned */}
                    {showMenu && (
                        <>
                            {/* Backdrop for closing */}
                            <div 
                                className="fixed inset-0 z-[60]" 
                                onClick={() => setShowMenu(false)}
                            />
                            <div 
                                className={`fixed md:absolute top-[6.5rem] md:top-full right-4 md:right-0 md:mt-1 w-48 rounded-lg py-1 shadow-xl z-[61] ${
                                    darkMode 
                                        ? 'bg-[var(--dark-600)] border border-[var(--dark-400)]' 
                                        : 'bg-white border border-[#4D4DA4]/15'
                                }`}
                            >
                                <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={handleHideClick}
                                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:opacity-70 ${
                                        darkMode 
                                            ? 'text-[var(--brand-light)] hover:bg-[var(--dark-500)] active:bg-[var(--dark-500)]' 
                                            : 'text-gray-700 hover:bg-[#EBEBFE] active:bg-[#EBEBFE]'
                                    }`}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.367 5.19m-6.176-6.176L3 3z" />
                                    </svg>
                                    {t('conversationDetail.hideConversation')}
                                </button>
                                <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={handleDeleteClick}
                                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:opacity-70 ${
                                        darkMode 
                                            ? 'text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 active:bg-[var(--brand-red)]/10' 
                                            : 'text-red-600 hover:bg-red-50 active:bg-red-50'
                                    }`}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    {t('conversationDetail.deletePermanently')}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Messages Area - ensure proper scrolling on mobile */}
            {/* Add bottom padding on mobile to account for fixed input */}
            <div 
                ref={messagesContainerRef}
                className={`flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar min-h-0 pb-20 md:pb-0 w-full overflow-x-hidden ${
                    darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'
                }`}
            >
                {/* Load More Button - at top for older messages */}
                {detail.pagination?.has_previous && (
                    <div className="flex justify-center mb-4" ref={topRef}>
                        <button
                            onClick={loadMoreMessages}
                            disabled={loadingMore}
                            className={`px-4 py-2 text-sm rounded-full transition-colors disabled:opacity-50 ${
                                darkMode 
                                    ? 'bg-[var(--dark-600)] text-[var(--brand-light)] hover:bg-[var(--dark-500)]' 
                                    : 'bg-white text-[#4D4DA4] hover:bg-[#EBEBFE] border border-[#4D4DA4]/20'
                            }`}
                        >
                            {loadingMore ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    {t('conversationDetail.loadingMore') || 'Loading...'}
                                </span>
                            ) : (
                                t('conversationDetail.loadOlderMessages') || 'Load older messages'
                            )}
                        </button>
                    </div>
                )}

                {/* System Notice for Broadcasts */}
                {isBroadcast && (
                    <div className="flex justify-center mb-4 sm:mb-6">
                        <span className={`text-xs px-2 sm:px-3 py-1 rounded-full font-medium text-center ${
                            darkMode 
                                ? 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)]' 
                                : 'bg-yellow-100 text-yellow-800'
                        }`}>
                            {t('conversationDetail.broadcastNotice')}
                        </span>
                    </div>
                )}

                {detail.messages.map((msg) => {
                    // Determine if this message is unread for the current user
                    const isUnread = !msg.is_me && msg.read_status && !msg.read_status.is_read;
                    
                    return (
                        <div 
                            key={msg.id}
                            data-message-id={msg.id}
                            data-is-unread={isUnread ? 'true' : 'false'}
                        >
                            <MessageBubble 
                                message={msg}
                                darkMode={darkMode}
                                onReactionUpdate={(messageId, reactionData) => {
                                    // Update the message in the detail state
                                    setDetail(prev => {
                                        if (!prev) return prev;
                                        return {
                                            ...prev,
                                            messages: prev.messages.map(m => 
                                                m.id === messageId 
                                                    ? {
                                                        ...m,
                                                        reaction_count: reactionData.reaction_count,
                                                        reaction_breakdown: reactionData.reaction_breakdown,
                                                        user_reaction: reactionData.user_reaction
                                                    }
                                                    : m
                                            )
                                        };
                                    });
                                }}
                            />
                        </div>
                    );
                })}
                
                <div ref={bottomRef} />
            </div>

            {/* WebSocket Connection Status - subtle indicator */}
            {!isConnected && detail && (
                <div className={`text-center text-xs py-1 ${
                    darkMode ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/40' : 'bg-gray-100 text-gray-400'
                }`}>
                    Connecting to real-time updates...
                </div>
            )}

            {/* Composer or Action Area - Fixed at bottom on mobile, relative on desktop */}
            {canReply ? (
                <>
                    {/* Mobile: Fixed at bottom, full width, outside card */}
                    <div className={`md:hidden fixed bottom-0 left-0 right-0 z-30 w-screen max-w-screen overflow-x-hidden ${
                        darkMode 
                            ? 'bg-[var(--dark-800)]' 
                            : 'bg-white shadow-lg'
                    }`}>
                        {/* Typing Indicator - Mobile */}
                        {typingUserNames.length > 0 && (
                            <div className={`border-t ${darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/15'}`}>
                                <TypingIndicator users={typingUserNames} darkMode={darkMode} />
                            </div>
                        )}
                        <div className={`border-t ${darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/15'}`}>
                            <MessageComposer onSend={handleSend} onTyping={sendTyping} darkMode={darkMode} />
                        </div>
                    </div>
                    {/* Desktop: Relative inside card */}
                    <div className={`hidden md:block flex-shrink-0 ${
                        darkMode 
                            ? 'bg-[var(--dark-800)]' 
                            : 'bg-white'
                    }`}>
                        {/* Typing Indicator - Desktop */}
                        {typingUserNames.length > 0 && (
                            <div className={`border-t ${darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/15'}`}>
                                <TypingIndicator users={typingUserNames} darkMode={darkMode} />
                            </div>
                        )}
                        <div className={`border-t ${darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/15'}`}>
                            <MessageComposer onSend={handleSend} onTyping={sendTyping} darkMode={darkMode} />
                        </div>
                    </div>
                </>
            ) : (
                <div className={`flex-shrink-0 p-4 border-t flex flex-col items-center justify-center gap-2 ${
                    darkMode 
                        ? 'border-[var(--dark-500)] bg-[var(--dark-700)]' 
                        : 'border-[#4D4DA4]/15 bg-[#F8F7FE]'
                }`}>
                    <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>Replies are disabled for this conversation.</p>
                    <button 
                        onClick={() => info("Redirect to create new DM with sender logic here")}
                        className={`font-bold text-sm hover:underline transition-colors ${
                            darkMode 
                                ? 'text-[var(--brand-primary)] hover:text-[var(--brand-purple)]' 
                                : 'text-[#4D4DA4] hover:text-[#FF5485]'
                        }`}
                    >
                        Contact Staff Directly
                    </button>
                </div>
            )}

            {/* Hide Confirmation Modal */}
            <ConfirmationModal
                isVisible={showHideModal}
                onClose={() => setShowHideModal(false)}
                onConfirm={handleHideConfirm}
                title={t('conversationDetail.hideModal.title')}
                message={t('conversationDetail.hideModal.message')}
                confirmButtonText={t('conversationDetail.hideModal.confirm')}
                cancelButtonText={t('conversationDetail.hideModal.cancel')}
                isLoading={actionLoading}
                variant="warning"
                darkMode={darkMode}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isVisible={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteConfirm}
                title={t('conversationDetail.deleteModal.title')}
                message={t('conversationDetail.deleteModal.message')}
                confirmButtonText={t('conversationDetail.deleteModal.confirm')}
                cancelButtonText={t('conversationDetail.deleteModal.cancel')}
                isLoading={actionLoading}
                variant="danger"
                darkMode={darkMode}
            />

            {/* Toast Notification */}
        </div>
    );
}
