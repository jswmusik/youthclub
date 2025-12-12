'use client';

import { useState, useRef, useEffect } from 'react';
import { Message, ReactionType } from '../../../../types/messenger';
import { format } from 'date-fns';
import { getMediaUrl } from '../../../../app/utils';
import { messengerApi } from '../../../../lib/messenger-api';

interface MessageBubbleProps {
    message: Message;
    onReactionUpdate?: (messageId: number, reactionData: any) => void;
}

const REACTION_EMOJIS: Record<ReactionType, string> = {
    LIKE: '👍',
    LOVE: '❤️',
    LAUGH: '😂',
    WOW: '😮',
    SAD: '😢',
    ANGRY: '😠',
};

const REACTION_COLORS: Record<ReactionType, string> = {
    LIKE: 'text-blue-500',
    LOVE: 'text-red-500',
    LAUGH: 'text-yellow-500',
    WOW: 'text-yellow-500',
    SAD: 'text-blue-500',
    ANGRY: 'text-red-500',
};

export default function MessageBubble({ message, onReactionUpdate }: MessageBubbleProps) {
    const isMe = message.is_me;
    const [userReaction, setUserReaction] = useState<ReactionType | null>(message.user_reaction || null);
    const [reactionBreakdown, setReactionBreakdown] = useState<Record<ReactionType, number>>(
        message.reaction_breakdown || {} as Record<ReactionType, number>
    );
    const [totalReactions, setTotalReactions] = useState(message.reaction_count || 0);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);
    const messageRef = useRef<HTMLDivElement>(null);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Calculate picker position based on message position in viewport
    const getPickerPosition = (): 'above' | 'below' => {
        if (!messageRef.current) return 'above';
        
        const rect = messageRef.current.getBoundingClientRect();
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;
        const pickerHeight = 70;
        const minSpace = pickerHeight + 30;
        
        // If message is near the top of viewport (less than 250px from top), always show below
        if (spaceAbove < 250) {
            return 'below';
        }
        
        // If there's not enough space above but enough below, show below
        if (spaceAbove < minSpace && spaceBelow >= minSpace) {
            return 'below';
        }
        
        // Default to above if there's enough space
        return 'above';
    };

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
        <div className={`flex w-full mb-3 sm:mb-4 min-w-0 ${isMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] sm:max-w-[75%] min-w-0 ${isMe ? 'flex-row-reverse' : 'flex-row'} gap-1.5 sm:gap-2`}>
                
                {/* Avatar (Only for others) */}
                {!isMe && (
                    <div className="flex-shrink-0">
                        {message.sender.avatar_url ? (
                            <img 
                                src={getMediaUrl(message.sender.avatar_url) || ''} 
                                alt={message.sender.first_name} 
                                className="w-8 h-8 rounded-full bg-gray-200 object-cover border border-gray-200"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-[#EBEBFE] flex items-center justify-center text-[#4D4DA4] font-bold text-xs border border-[#EBEBFE]">
                                {message.sender.first_name[0]}
                            </div>
                        )}
                    </div>
                )}

                {/* Bubble Content */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    
                    {/* Name (Only in group contexts or for admins, usually skipped in 1:1 DMs if not me) */}
                    {!isMe && (
                        <span className="text-xs text-gray-500 mb-1 ml-1">
                            {message.sender.first_name} {message.sender.last_name}
                        </span>
                    )}

                    <div className="relative group" ref={messageRef}>
                        <div className={`
                            px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm shadow-sm relative break-words
                            ${isMe 
                                ? 'bg-[#4D4DA4] text-white rounded-tr-none' 
                                : 'bg-white text-[#121213] border border-gray-100 rounded-tl-none'}
                        `}>
                            {message.attachment && (
                                <div className="mb-1.5 sm:mb-2 -mx-1 sm:-mx-0">
                                    <img 
                                        src={message.attachment} 
                                        alt="Attachment" 
                                        className="max-w-full rounded-lg max-h-40 sm:max-h-48 object-cover w-full" 
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
                                    .map(([reactionType, count]) => (
                                        <span 
                                            key={reactionType}
                                            className="text-base leading-none"
                                            title={`${count} ${reactionType}`}
                                        >
                                            {REACTION_EMOJIS[reactionType as ReactionType]}
                                        </span>
                                    ))}
                            </div>
                        )}
                        
                        {/* Reaction Button - positioned on left of right-aligned bubbles, right of left-aligned bubbles, centered vertically */}
                        <button
                            onClick={handleReactionButtonClick}
                            className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 active:text-gray-800 opacity-60 hover:opacity-100 active:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-sm z-10 touch-manipulation ${
                                isMe 
                                    ? 'left-0 -translate-x-full sm:-translate-x-1/2' 
                                    : 'right-0 translate-x-full sm:translate-x-1/2'
                            }`}
                            title="Add reaction"
                            aria-label="Add reaction"
                        >
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>

                        {/* Reaction Picker - appears above or below message based on position */}
                        {showReactionPicker && (
                            <div 
                                ref={pickerRef}
                                className={`absolute ${isMe ? 'right-0' : 'left-0'} ${
                                    getPickerPosition() === 'above' 
                                        ? 'bottom-full mb-2' 
                                        : 'top-full mt-2'
                                } bg-white rounded-full shadow-lg border border-gray-200 p-1.5 flex items-center gap-0.5 z-50`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {(Object.keys(REACTION_EMOJIS) as ReactionType[]).map((reactionType) => (
                                    <button
                                        key={reactionType}
                                        onClick={() => handleReaction(reactionType)}
                                        className={`w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all text-xl ${
                                            userReaction === reactionType ? 'bg-[#EBEBFE] scale-110' : ''
                                        } ${isAnimating ? 'animate-bounce' : ''}`}
                                        title={reactionType}
                                    >
                                        {REACTION_EMOJIS[reactionType]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Metadata Row */}
                    <div className={`flex items-center gap-2 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {/* Time and Read Status */}
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">
                                {format(new Date(message.created_at), 'HH:mm')}
                            </span>
                            {isMe && message.read_status?.is_read && (
                                <span className="text-[10px] text-[#4D4DA4] font-bold">Read</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
