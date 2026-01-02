'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ConversationList as ConversationListType } from '../../../../types/messenger';
import { formatDistanceToNow } from 'date-fns';
import { enUS, sv, da, nb, fi, type Locale } from 'date-fns/locale';
import { useAuth } from '../../../../context/AuthContext';
import { getMediaUrl } from '../../../../app/utils';
import { messengerApi } from '../../../../lib/messenger-api';
import ConfirmationModal from '../../../components/ConfirmationModal';

// Map locale codes to date-fns locales
const localeMap: Record<string, Locale> = {
    en: enUS,
    sv: sv,
    da: da,
    nb: nb,
    fi: fi,
};

interface ConversationListProps {
    conversations: ConversationListType[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    onRefresh?: () => void;
    darkMode?: boolean;
}

// Modal state type
interface ModalState {
    isOpen: boolean;
    type: 'hide' | 'delete' | null;
    conversationId: number | null;
    conversationSubject: string;
}

// Swipeable conversation item component for mobile
interface SwipeableItemProps {
    children: React.ReactNode;
    onHide: () => void;
    onDelete: () => void;
    darkMode: boolean;
    conversationId: number;
    hideLabel: string;
    deleteLabel: string;
}

function SwipeableItem({ children, onHide, onDelete, darkMode, conversationId, hideLabel, deleteLabel }: SwipeableItemProps) {
    const [translateX, setTranslateX] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const startX = useRef(0);
    const currentX = useRef(0);
    const isDragging = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const ACTION_WIDTH = 160; // Width of action buttons revealed
    const THRESHOLD = 60; // Minimum swipe distance to reveal actions
    
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        // Only enable swipe on mobile (md breakpoint is 768px)
        if (window.innerWidth >= 768) return;
        
        startX.current = e.touches[0].clientX;
        currentX.current = e.touches[0].clientX;
        isDragging.current = true;
        setIsAnimating(false);
    }, []);
    
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging.current || window.innerWidth >= 768) return;
        
        currentX.current = e.touches[0].clientX;
        const diff = currentX.current - startX.current;
        
        // Only allow swiping left (negative diff)
        if (diff < 0) {
            // Limit the swipe to ACTION_WIDTH
            const newTranslate = Math.max(diff, -ACTION_WIDTH);
            setTranslateX(newTranslate);
        } else if (translateX < 0) {
            // Allow swiping back to close
            const newTranslate = Math.min(translateX + diff, 0);
            setTranslateX(newTranslate);
            startX.current = currentX.current;
        }
    }, [translateX]);
    
    const handleTouchEnd = useCallback(() => {
        if (!isDragging.current || window.innerWidth >= 768) return;
        
        isDragging.current = false;
        setIsAnimating(true);
        
        // If swiped past threshold, snap to open, otherwise snap closed
        if (translateX < -THRESHOLD) {
            setTranslateX(-ACTION_WIDTH);
        } else {
            setTranslateX(0);
        }
    }, [translateX]);
    
    const closeSwipe = useCallback(() => {
        setIsAnimating(true);
        setTranslateX(0);
    }, []);
    
    const handleHide = useCallback(() => {
        closeSwipe();
        onHide();
    }, [closeSwipe, onHide]);
    
    const handleDelete = useCallback(() => {
        closeSwipe();
        onDelete();
    }, [closeSwipe, onDelete]);
    
    return (
        <div className="relative overflow-hidden md:overflow-visible" ref={containerRef}>
            {/* Action buttons revealed on swipe - only visible on mobile */}
            <div 
                className="absolute right-0 top-0 bottom-0 flex items-stretch md:hidden"
                style={{ width: ACTION_WIDTH }}
            >
                <button
                    onClick={handleHide}
                    className={`flex-1 flex items-center justify-center transition-colors ${
                        darkMode 
                            ? 'bg-[var(--brand-secondary)] text-[var(--brand-light)] active:bg-[var(--brand-secondary)]/80' 
                            : 'bg-[#F8F7FE]0 text-white active:bg-gray-600'
                    }`}
                >
                    <div className="flex flex-col items-center gap-1">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.367 5.19m-6.176-6.176L3 3z" />
                        </svg>
                        <span className="text-xs font-medium">{hideLabel}</span>
                    </div>
                </button>
                <button
                    onClick={handleDelete}
                    className={`flex-1 flex items-center justify-center transition-colors ${
                        darkMode 
                            ? 'bg-[var(--brand-red)] text-white active:bg-[var(--brand-red)]/80' 
                            : 'bg-red-500 text-white active:bg-red-600'
                    }`}
                >
                    <div className="flex flex-col items-center gap-1">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="text-xs font-medium">{deleteLabel}</span>
                    </div>
                </button>
            </div>
            
            {/* Main content that slides */}
            <div
                className={`relative z-10 ${darkMode ? 'bg-[var(--dark-800)]' : 'bg-white'}`}
                style={{
                    transform: `translateX(${translateX}px)`,
                    transition: isAnimating ? 'transform 0.2s ease-out' : 'none',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </div>
        </div>
    );
}

export default function ConversationList({ conversations, selectedId, onSelect, onRefresh, darkMode = false }: ConversationListProps) {
    const t = useTranslations('messages');
    const locale = useLocale();
    const dateLocale = localeMap[locale] || enUS;
    const { user: currentUser } = useAuth();
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [modalState, setModalState] = useState<ModalState>({
        isOpen: false,
        type: null,
        conversationId: null,
        conversationSubject: ''
    });
    
    // Open confirmation modal for hide
    const openHideModal = (conversationId: number, subject: string) => {
        setModalState({
            isOpen: true,
            type: 'hide',
            conversationId,
            conversationSubject: subject || 'this conversation'
        });
    };
    
    // Open confirmation modal for delete
    const openDeleteModal = (conversationId: number, subject: string) => {
        setModalState({
            isOpen: true,
            type: 'delete',
            conversationId,
            conversationSubject: subject || 'this conversation'
        });
    };
    
    // Close modal
    const closeModal = () => {
        setModalState({
            isOpen: false,
            type: null,
            conversationId: null,
            conversationSubject: ''
        });
    };
    
    // Confirm hide action
    const handleHideConfirm = async () => {
        if (!modalState.conversationId || actionLoading) return;
        setActionLoading(modalState.conversationId);
        closeModal();
        try {
            await messengerApi.hideConversation(modalState.conversationId);
            onRefresh?.();
        } catch (err) {
            console.error('Failed to hide conversation:', err);
        } finally {
            setActionLoading(null);
        }
    };
    
    // Confirm delete action
    const handleDeleteConfirm = async () => {
        if (!modalState.conversationId || actionLoading) return;
        setActionLoading(modalState.conversationId);
        closeModal();
        try {
            await messengerApi.deleteConversation(modalState.conversationId);
            onRefresh?.();
        } catch (err) {
            console.error('Failed to delete conversation:', err);
        } finally {
            setActionLoading(null);
        }
    };
    if (conversations.length === 0) {
        return (
            <div className={`p-8 text-center text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                {t('noMessagesYet')}
            </div>
        );
    }

    return (
        <>
        <ul className={`min-w-0 max-w-full ${darkMode ? 'divide-y divide-[var(--dark-500)]' : 'divide-y divide-gray-100'}`}>
            {conversations.map((conv) => {
                const isSelected = selectedId === conv.id;
                const isUnread = conv.unread_count > 0;

                // Determine avatar to show
                let avatarUrl: string | null = null;
                let avatarInitials = '';
                let showGroupIcon = false;

                if (conv.type === 'BROADCAST') {
                    // Show group icon for broadcasts
                    showGroupIcon = true;
                } else if (conv.type === 'SYSTEM') {
                    // Keep emoji for system messages
                    showGroupIcon = false;
                } else if (conv.type === 'DM') {
                    // For DMs, find the other participant (not the current user)
                    const otherParticipant = conv.participants.find(p => p.id !== currentUser?.id);
                    if (otherParticipant) {
                        avatarUrl = otherParticipant.avatar_url ? getMediaUrl(otherParticipant.avatar_url) : null;
                        avatarInitials = `${otherParticipant.first_name?.[0] || ''}${otherParticipant.last_name?.[0] || ''}`.toUpperCase();
                    } else if (conv.last_message?.sender_avatar) {
                        // Fallback to last message sender avatar
                        avatarUrl = getMediaUrl(conv.last_message.sender_avatar) || null;
                    } else if (conv.last_message?.sender_name) {
                        // Fallback to last message sender initials
                        const names = conv.last_message.sender_name.split(' ');
                        avatarInitials = `${names[0]?.[0] || ''}${names[1]?.[0] || ''}`.toUpperCase();
                    } else {
                        // Final fallback to subject initial
                        avatarInitials = conv.subject?.[0]?.toUpperCase() || '#';
                    }
                } else {
                    // Default fallback
                    avatarInitials = conv.subject?.[0]?.toUpperCase() || '#';
                }

                return (
                    <li key={conv.id} className="min-w-0 max-w-full">
                        <SwipeableItem
                            conversationId={conv.id}
                            onHide={() => openHideModal(conv.id, conv.subject || '')}
                            onDelete={() => openDeleteModal(conv.id, conv.subject || '')}
                            darkMode={darkMode}
                            hideLabel={t('hide')}
                            deleteLabel={t('delete')}
                        >
                        <button
                            onClick={() => onSelect(conv.id)}
                            className={`w-full p-3 sm:p-4 flex gap-2 sm:gap-3 text-left transition-colors touch-manipulation min-w-0 max-w-full
                                ${darkMode 
                                    ? isSelected 
                                        ? 'bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/10 active:bg-[var(--brand-primary)]/20 border-l-4 border-[var(--brand-primary)]' 
                                        : 'hover:bg-[var(--dark-600)] active:bg-[var(--dark-500)] border-l-4 border-transparent'
                                    : isSelected 
                                        ? 'bg-[#EBEBFE]/50 hover:bg-[#EBEBFE]/50 active:bg-[#EBEBFE]/60 border-l-4 border-[#4D4DA4]' 
                                        : 'hover:bg-[#F8F7FE] active:bg-[#EBEBFE] border-l-4 border-transparent'
                                }
                            `}
                        >
                            {/* Icon / Avatar Context */}
                            <div className="flex-shrink-0 mt-1">
                                {conv.type === 'SYSTEM' ? (
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                                        darkMode ? 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)]' : 'bg-orange-100 text-orange-600'
                                    }`}>
                                        📢
                                    </div>
                                ) : conv.type === 'BROADCAST' ? (
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        darkMode ? 'bg-[var(--brand-purple)]/20 text-[var(--brand-purple)]' : 'bg-[#EBEBFE] text-[#4D4DA4]'
                                    }`}>
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                ) : avatarUrl ? (
                                    <img 
                                        src={avatarUrl} 
                                        alt={avatarInitials || 'Avatar'}
                                        className={`w-10 h-10 rounded-full object-cover ${
                                            darkMode ? 'bg-[var(--dark-600)] border border-[var(--dark-400)]' : 'bg-gray-200 border border-[#4D4DA4]/15'
                                        }`}
                                    />
                                ) : (
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                                        darkMode 
                                            ? 'bg-[var(--brand-secondary)]/20 text-[var(--brand-purple)] border border-[var(--dark-400)]' 
                                            : 'bg-[#EBEBFE] text-[#4D4DA4] border border-[#EBEBFE]'
                                    }`}>
                                        {avatarInitials}
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className={`text-sm truncate pr-2 ${
                                        darkMode 
                                            ? isUnread ? 'font-bold text-[var(--brand-light)]' : 'font-medium text-[var(--brand-light)]/80'
                                            : isUnread ? 'font-bold text-[#121213]' : 'font-medium text-gray-700'
                                    }`}>
                                        {conv.subject || t('noSubject')}
                                    </h4>
                                    <span className={`text-[10px] flex-shrink-0 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`}>
                                        {conv.last_message?.created_at 
                                            ? formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: true, locale: dateLocale })
                                            : ''}
                                    </span>
                                </div>
                                <p className={`text-xs truncate ${
                                    darkMode 
                                        ? isUnread ? 'text-[var(--brand-light)] font-medium' : 'text-[var(--brand-light)]/60'
                                        : isUnread ? 'text-[#121213] font-medium' : 'text-gray-500'
                                }`}>
                                    {conv.last_message ? (
                                        <>
                                            <span className={darkMode ? 'text-[var(--brand-light)]/40 mr-1' : 'text-gray-400 mr-1'}>{conv.last_message.sender_name}:</span>
                                            {conv.last_message.content}
                                        </>
                                    ) : (
                                        <span className="italic">{t('noMessages')}</span>
                                    )}
                                </p>
                            </div>

                            {/* Unread Badge */}
                            {isUnread && (
                                <div className="flex-shrink-0 self-center ml-2">
                                    <span className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full ${
                                        darkMode 
                                            ? 'text-[var(--dark-900)] bg-[var(--brand-primary)]' 
                                            : 'text-white bg-[#4D4DA4]'
                                    }`}>
                                        {conv.unread_count}
                                    </span>
                                </div>
                            )}
                        </button>
                        </SwipeableItem>
                    </li>
                );
            })}
            
        </ul>
        
        {/* Hide Confirmation Modal */}
        <ConfirmationModal
            isVisible={modalState.isOpen && modalState.type === 'hide'}
            onClose={closeModal}
            onConfirm={handleHideConfirm}
            title={t('hideConversation')}
            message={t('hideConversationMessage', { subject: modalState.conversationSubject })}
            confirmButtonText={t('hide')}
            cancelButtonText={t('cancel')}
            variant="warning"
            darkMode={darkMode}
        />
        
        {/* Delete Confirmation Modal */}
        <ConfirmationModal
            isVisible={modalState.isOpen && modalState.type === 'delete'}
            onClose={closeModal}
            onConfirm={handleDeleteConfirm}
            title={t('deleteConversation')}
            message={t('deleteConversationMessage', { subject: modalState.conversationSubject })}
            confirmButtonText={t('delete')}
            cancelButtonText={t('cancel')}
            variant="danger"
            darkMode={darkMode}
        />
        </>
    );
}
