'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Message, ReactionType } from '../../../../types/messenger';
import { format } from 'date-fns';
import { getMediaUrl } from '../../../../app/utils';
import { messengerApi } from '../../../../lib/messenger-api';
import { ThumbsUp, Heart, Laugh, Zap, Frown, Angry } from 'lucide-react';

interface MessageBubbleProps {
    message: Message;
    onReactionUpdate?: (messageId: number, reactionData: any) => void;
    darkMode?: boolean;
}

const REACTION_ICONS: Record<ReactionType, React.ComponentType<{ className?: string }>> = {
    LIKE: ThumbsUp,
    LOVE: Heart,
    LAUGH: Laugh,
    WOW: Zap,
    SAD: Frown,
    ANGRY: Angry,
};

// Brand color mapping for reactions
const REACTION_COLORS: Record<ReactionType, string> = {
    LIKE: 'text-[var(--brand-sky)]',      // #A9CCFF - sky blue
    LOVE: 'text-[var(--brand-primary)]',  // #FFA8CD - pink
    LAUGH: 'text-[var(--brand-third)]',   // #EFFFAB - yellow-green
    WOW: 'text-[var(--brand-peach)]',     // #FFE2AE - peach/orange
    SAD: 'text-[var(--brand-purple)]',    // #B8A9FF - purple
    ANGRY: 'text-[var(--brand-red)]',     // #F46E6E - red
};

export default function MessageBubble({ message, onReactionUpdate, darkMode = false }: MessageBubbleProps) {
    const t = useTranslations('messages');
    const isMe = message.is_me;
    const [userReaction, setUserReaction] = useState<ReactionType | null>(message.user_reaction || null);
    const [reactionBreakdown, setReactionBreakdown] = useState<Record<ReactionType, number>>(
        message.reaction_breakdown || {} as Record<ReactionType, number>
    );
    const [totalReactions, setTotalReactions] = useState(message.reaction_count || 0);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});
    const pickerRef = useRef<HTMLDivElement>(null);
    const messageRef = useRef<HTMLDivElement>(null);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Calculate and apply picker position - positioned near message, constrained to viewport
    useEffect(() => {
        if (!showReactionPicker || !messageRef.current) {
            setPickerStyle({});
            return;
        }

        const messageRect = messageRef.current.getBoundingClientRect();
        const pickerHeight = 70;
        const pickerWidth = 280;
        const padding = 10;
        
        const spaceAbove = messageRect.top;
        const spaceBelow = window.innerHeight - messageRect.bottom;
        
        const style: React.CSSProperties = {
            position: 'fixed', // Fixed to viewport for proper positioning
            maxWidth: `min(280px, calc(100vw - ${padding * 2}px))`,
            zIndex: 9999,
        };
        
        // Determine vertical position based on message position in viewport
        if (spaceAbove < 250 || (spaceAbove < pickerHeight + padding && spaceBelow >= pickerHeight + padding)) {
            // Show below message
            style.top = `${messageRect.bottom + 8}px`;
            style.bottom = 'auto';
        } else {
            // Show above message
            style.bottom = `${window.innerHeight - messageRect.top + 8}px`;
            style.top = 'auto';
        }
        
        // Position horizontally - align to left edge of message, but ensure it stays within viewport
        if (isMe) {
            // For right-aligned messages, position near the left edge of the message bubble
            const leftPosition = messageRect.left - pickerWidth;
            if (leftPosition < padding) {
                // Not enough space on left, position at left edge of viewport
                style.left = `${padding}px`;
            } else {
                // Position near message bubble
                style.left = `${leftPosition}px`;
            }
            style.right = 'auto';
        } else {
            // For left-aligned messages, position at left edge of message bubble
            const leftPosition = messageRect.left;
            if (leftPosition + pickerWidth > window.innerWidth - padding) {
                // Would overflow right, shift left
                style.left = `${window.innerWidth - pickerWidth - padding}px`;
            } else {
                style.left = `${leftPosition}px`;
            }
            style.right = 'auto';
        }
        
        // Ensure picker doesn't go below viewport
        if (style.top && typeof style.top === 'string') {
            const topValue = parseFloat(style.top);
            if (topValue + pickerHeight > window.innerHeight - padding) {
                style.top = `${window.innerHeight - pickerHeight - padding}px`;
            }
        }
        
        setPickerStyle(style);
    }, [showReactionPicker, isMe]);

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                pickerRef.current && 
                !pickerRef.current.contains(event.target as Node) &&
                messageRef.current &&
                !messageRef.current.contains(event.target as Node)
            ) {
                setShowReactionPicker(false);
            }
        };

        if (showReactionPicker) {
            // Small delay to prevent immediate closing when opening
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 100);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showReactionPicker]);

    // Update state when message prop changes
    useEffect(() => {
        setUserReaction(message.user_reaction || null);
        setReactionBreakdown(message.reaction_breakdown || {} as Record<ReactionType, number>);
        setTotalReactions(message.reaction_count || 0);
    }, [message.user_reaction, message.reaction_breakdown, message.reaction_count]);

    const handleReaction = async (reactionType: ReactionType) => {
        const previousReaction = userReaction;
        const previousBreakdown = { ...reactionBreakdown };
        
        // Optimistic UI update
        if (previousReaction === reactionType) {
            // Remove reaction if clicking the same one
            setUserReaction(null);
            setReactionBreakdown(prev => ({
                ...prev,
                [reactionType]: Math.max(0, (prev[reactionType] || 0) - 1)
            }));
            setTotalReactions(prev => Math.max(0, prev - 1));
        } else {
            // Add or update reaction
            setUserReaction(reactionType);
            if (previousReaction) {
                // Remove previous reaction count
                setReactionBreakdown(prev => ({
                    ...prev,
                    [previousReaction]: Math.max(0, (prev[previousReaction] || 0) - 1)
                }));
            }
            // Add new reaction count
            setReactionBreakdown(prev => ({
                ...prev,
                [reactionType]: (prev[reactionType] || 0) + 1
            }));
            setTotalReactions(prev => previousReaction ? prev : prev + 1);
        }
        
        setIsAnimating(true);
        setShowReactionPicker(false);
        setTimeout(() => setIsAnimating(false), 300);

        try {
            if (previousReaction === reactionType) {
                // Remove reaction
                const response = await messengerApi.removeMessageReaction(message.id, reactionType);
                if (response.data) {
                    setReactionBreakdown(response.data.reaction_breakdown || {});
                    setTotalReactions(response.data.reaction_count || 0);
                    if (onReactionUpdate) {
                        onReactionUpdate(message.id, response.data);
                    }
                }
            } else if (previousReaction) {
                // Update reaction
                const response = await messengerApi.updateMessageReaction(message.id, reactionType);
                if (response.data) {
                    setReactionBreakdown(response.data.reaction_breakdown || {});
                    setTotalReactions(response.data.reaction_count || 0);
                    if (onReactionUpdate) {
                        onReactionUpdate(message.id, response.data);
                    }
                }
            } else {
                // Add new reaction
                const response = await messengerApi.addMessageReaction(message.id, reactionType);
                if (response.data) {
                    setReactionBreakdown(response.data.reaction_breakdown || {});
                    setTotalReactions(response.data.reaction_count || 0);
                    if (onReactionUpdate) {
                        onReactionUpdate(message.id, response.data);
                    }
                }
            }
        } catch (error: any) {
            // Revert on error
            setUserReaction(previousReaction);
            setReactionBreakdown(previousBreakdown);
            setTotalReactions(message.reaction_count || 0);
            console.error('Failed to update reaction:', error);
        }
    };

    const handleReactionButtonClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowReactionPicker(!showReactionPicker);
    };

    return (
        <div className={`flex w-full mb-3 sm:mb-4 md:mb-5 min-w-0 ${isMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] sm:max-w-[75%] md:max-w-[65%] min-w-0 ${isMe ? 'flex-row-reverse' : 'flex-row'} gap-1.5 sm:gap-2 md:gap-3`}>
                
                {/* Avatar (Only for others) */}
                {!isMe && (
                    <div className="flex-shrink-0">
                        {message.sender.avatar_url ? (
                            <img 
                                src={getMediaUrl(message.sender.avatar_url) || ''} 
                                alt={message.sender.first_name} 
                                className={`w-8 h-8 md:w-10 md:h-10 rounded-full object-cover ${
                                    darkMode 
                                        ? 'bg-[var(--dark-600)] border border-[var(--dark-400)]' 
                                        : 'bg-gray-200 border border-gray-200'
                                }`}
                            />
                        ) : (
                            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm ${
                                darkMode 
                                    ? 'bg-[var(--brand-secondary)]/20 text-[var(--brand-purple)] border border-[var(--dark-400)]' 
                                    : 'bg-[#EBEBFE] text-[#4D4DA4] border border-[#EBEBFE]'
                            }`}>
                                {message.sender.first_name[0]}
                            </div>
                        )}
                    </div>
                )}

                {/* Bubble Content */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    
                    {/* Name (Only in group contexts or for admins, usually skipped in 1:1 DMs if not me) */}
                    {!isMe && (
                        <span className={`text-xs md:text-sm mb-1 ml-1 ${
                            darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'
                        }`}>
                            {message.sender.first_name} {message.sender.last_name}
                        </span>
                    )}

                    <div className="relative group" ref={messageRef}>
                        <div className={`
                            px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 rounded-2xl text-sm sm:text-base md:text-base relative break-words
                            ${isMe 
                                ? darkMode 
                                    ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] rounded-tr-none' 
                                    : 'bg-[#4D4DA4] text-white rounded-tr-none'
                                : darkMode 
                                    ? 'bg-[var(--dark-700)] text-[var(--brand-light)] border border-[var(--dark-500)] rounded-tl-none' 
                                    : 'bg-white text-[#121213] border border-gray-100 rounded-tl-none shadow-sm'}
                        `}>
                            {message.attachment && (
                                <div className="mb-1.5 sm:mb-2 -mx-1 sm:-mx-0">
                                    <img 
                                        src={message.attachment} 
                                        alt="Attachment" 
                                        className="max-w-full rounded-lg max-h-40 sm:max-h-48 md:max-h-64 object-cover w-full" 
                                    />
                                </div>
                            )}
                            <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</p>
                        </div>
                        
                        {/* Reactions - positioned on top of bubble in bottom right corner */}
                        {totalReactions > 0 && (
                            <div className={`absolute bottom-0 ${isMe ? 'right-0' : 'left-0'} translate-y-1/2 flex items-center gap-1 z-10`}>
                                {Object.entries(reactionBreakdown)
                                    .filter(([_, count]) => count > 0)
                                    .sort(([_, a], [__, b]) => b - a)
                                    .map(([reactionType, count]) => {
                                        const IconComponent = REACTION_ICONS[reactionType as ReactionType];
                                        const colorClass = REACTION_COLORS[reactionType as ReactionType];
                                        return (
                                            <div
                                                key={reactionType}
                                                className={`${colorClass} flex items-center gap-0.5 backdrop-blur-sm rounded-full p-0.5 shadow-sm ${
                                                    darkMode ? 'bg-[var(--dark-700)]/90' : 'bg-white/90'
                                                }`}
                                                title={`${count} ${reactionType}`}
                                            >
                                                <IconComponent className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                {count > 1 && (
                                                    <span className="text-[10px] md:text-xs font-semibold leading-none">{count}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                        
                        {/* Reaction Button - positioned on left of right-aligned bubbles, right of left-aligned bubbles, centered vertically */}
                        <button
                            onClick={handleReactionButtonClick}
                            className={`absolute top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 active:opacity-100 transition-opacity backdrop-blur-sm rounded-full p-1 shadow-sm z-10 touch-manipulation ${
                                darkMode 
                                    ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] active:text-[var(--brand-primary)] bg-[var(--dark-700)]/90' 
                                    : 'text-gray-400 hover:text-gray-600 active:text-gray-800 bg-white/90'
                            } ${
                                isMe 
                                    ? 'left-0 -translate-x-full sm:-translate-x-1/2' 
                                    : 'right-0 translate-x-full sm:translate-x-1/2'
                            }`}
                            title="Add reaction"
                            aria-label="Add reaction"
                        >
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>

                        {/* Reaction Picker - fixed to left edge, vertically aligned with message */}
                        {showReactionPicker && (
                            <div 
                                ref={pickerRef}
                                className={`rounded-full shadow-lg p-1.5 md:p-2 flex items-center gap-0.5 md:gap-1 ${
                                    darkMode 
                                        ? 'bg-[var(--dark-700)] border border-[var(--dark-500)]' 
                                        : 'bg-white border border-gray-200'
                                }`}
                                style={pickerStyle}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {(Object.keys(REACTION_ICONS) as ReactionType[]).map((reactionType) => {
                                    const IconComponent = REACTION_ICONS[reactionType];
                                    const colorClass = REACTION_COLORS[reactionType];
                                    return (
                                        <button
                                            key={reactionType}
                                            onClick={() => handleReaction(reactionType)}
                                            className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full transition-all flex-shrink-0 ${
                                                darkMode 
                                                    ? userReaction === reactionType ? 'bg-[var(--brand-primary)]/20 scale-110' : 'hover:bg-[var(--dark-600)]'
                                                    : userReaction === reactionType ? 'bg-[#EBEBFE] scale-110' : 'hover:bg-gray-100'
                                            } ${isAnimating ? 'animate-bounce' : ''} ${colorClass}`}
                                            title={reactionType}
                                        >
                                            <IconComponent className="w-5 h-5 md:w-6 md:h-6" />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Metadata Row */}
                    <div className={`flex items-center gap-2 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {/* Time and Read Status */}
                        <div className="flex items-center gap-1">
                            <span className={`text-[10px] md:text-xs ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`}>
                                {format(new Date(message.created_at), 'HH:mm')}
                            </span>
                            {isMe && message.read_status?.is_read && (
                                <span className={`text-[10px] md:text-xs font-bold ${
                                    darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
                                }`}>{t('read')}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
