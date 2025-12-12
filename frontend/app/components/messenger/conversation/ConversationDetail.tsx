'use client';

import { useState, useEffect, useRef } from 'react';
import { messengerApi } from '../../../../lib/messenger-api';
import { ConversationDetail as ConversationDetailType, Message } from '../../../../types/messenger';
import MessageBubble from '../message/MessageBubble';
import MessageComposer from '../message/MessageComposer';
import ConfirmationModal from '../../../components/ConfirmationModal';
import Toast from '../../../components/Toast';

interface ConversationDetailProps {
    conversationId: number;
    onBack?: () => void; // For mobile
    isAdmin?: boolean;
    onRefresh?: () => void; // Callback to refresh conversation list
}

export default function ConversationDetail({ conversationId, onBack, isAdmin, onRefresh }: ConversationDetailProps) {
    const [detail, setDetail] = useState<ConversationDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    
    // Confirmation modal states
    const [showHideModal, setShowHideModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

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

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
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
            setToast({ 
                message: 'Conversation hidden from inbox', 
                type: 'success', 
                isVisible: true 
            });
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
            setToast({ 
                message: err?.response?.data?.error || 'Failed to hide conversation', 
                type: 'error', 
                isVisible: true 
            });
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
            setToast({ 
                message: 'Conversation permanently deleted', 
                type: 'success', 
                isVisible: true 
            });
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
            setToast({ 
                message: err?.response?.data?.error || 'Failed to delete conversation', 
                type: 'error', 
                isVisible: true 
            });
        } finally {
            setActionLoading(false);
        }
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
        <div className="flex flex-col h-full bg-white md:rounded-r-xl min-h-0 max-w-full overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 min-h-[56px] sm:h-16 border-b border-gray-200 flex items-center px-2 sm:px-3 md:px-4 justify-between bg-white md:rounded-tr-xl min-w-0 max-w-full">
                <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-1">
                    {onBack && (
                        <button 
                            onClick={onBack} 
                            className="md:hidden text-gray-500 hover:text-gray-700 active:text-gray-900 flex-shrink-0 touch-manipulation p-1"
                            aria-label="Back to inbox"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                    <div className="min-w-0 flex-1 overflow-hidden">
                        <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate">
                            {detail.subject || 'No Subject'}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                            {detail.participants.length} {detail.participants.length === 1 ? 'participant' : 'participants'} • {detail.type}
                        </p>
                    </div>
                </div>
                
                {/* Context Menu */}
                <div className="relative flex-shrink-0" ref={menuRef}>
                    <button 
                        onClick={() => setShowMenu(!showMenu)}
                        disabled={actionLoading}
                        className="text-gray-400 hover:text-gray-600 active:text-gray-800 disabled:opacity-50 touch-manipulation p-1"
                        aria-label="Conversation options"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>
                    
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-2 w-44 sm:w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                            <button
                                onClick={handleHideClick}
                                disabled={actionLoading}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.367 5.19m-6.176-6.176L3 3z" />
                                </svg>
                                Hide Conversation
                            </button>
                            <button
                                onClick={handleDeleteClick}
                                disabled={actionLoading}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Permanently
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50 custom-scrollbar min-h-0">
                {/* System Notice for Broadcasts */}
                {isBroadcast && (
                    <div className="flex justify-center mb-4 sm:mb-6">
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 sm:px-3 py-1 rounded-full font-medium text-center">
                            📢 This is a one-way broadcast message.
                        </span>
                    </div>
                )}

                {detail.messages.map((msg) => (
                    <MessageBubble 
                        key={msg.id} 
                        message={msg}
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
                        onClick={() => setToast({ 
                            message: "Redirect to create new DM with sender logic here", 
                            type: 'info', 
                            isVisible: true 
                        })}
                        className="text-[#4D4DA4] font-bold text-sm hover:text-[#FF5485] hover:underline transition-colors"
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
                title="Hide Conversation"
                message="Hide this conversation? It will reappear when you receive a new message."
                confirmButtonText="Hide"
                cancelButtonText="Cancel"
                isLoading={actionLoading}
                variant="warning"
            />

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isVisible={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Conversation"
                message="Permanently delete this conversation? This action cannot be undone."
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
                isLoading={actionLoading}
                variant="danger"
            />

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
