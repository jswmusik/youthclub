'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { messengerApi } from '../../../../lib/messenger-api';
import { ConversationDetail as ConversationDetailType, Message } from '../../../../types/messenger';
import MessageBubble from '../message/MessageBubble';
import MessageComposer from '../message/MessageComposer';
import ConfirmationModal from '../../../components/ConfirmationModal';
import { useToast } from '../../../../hooks/useToast';

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
    const [showMenu, setShowMenu] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    
    // Confirmation modal states
    const [showHideModal, setShowHideModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    // Toast
    const { success, error, info } = useToast();

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
            <div className={`flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar min-h-0 pb-20 md:pb-0 w-full overflow-x-hidden ${
                darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'
            }`}>
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

                {detail.messages.map((msg) => (
                    <MessageBubble 
                        key={msg.id} 
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
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Composer or Action Area - Fixed at bottom on mobile, relative on desktop */}
            {canReply ? (
                <>
                    {/* Mobile: Fixed at bottom, full width, outside card */}
                    <div className={`md:hidden fixed bottom-0 left-0 right-0 z-30 border-t w-screen max-w-screen overflow-x-hidden ${
                        darkMode 
                            ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' 
                            : 'bg-white border-[#4D4DA4]/15 shadow-lg'
                    }`}>
                        <MessageComposer onSend={handleSend} darkMode={darkMode} />
                    </div>
                    {/* Desktop: Relative inside card */}
                    <div className={`hidden md:block flex-shrink-0 border-t ${
                        darkMode 
                            ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' 
                            : 'bg-white border-[#4D4DA4]/15'
                    }`}>
                        <MessageComposer onSend={handleSend} darkMode={darkMode} />
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
