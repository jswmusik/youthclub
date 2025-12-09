'use client';

import { ConversationList as ConversationListType } from '../../../../types/messenger';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../../../context/AuthContext';
import { getMediaUrl } from '../../../../app/utils';

interface ConversationListProps {
    conversations: ConversationListType[];
    selectedId: number | null;
    onSelect: (id: number) => void;
}

export default function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
    const { user: currentUser } = useAuth();
    if (conversations.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 text-sm">
                No messages yet.
            </div>
        );
    }

    return (
        <ul className="divide-y divide-gray-100">
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
                    <li key={conv.id}>
                        <button
                            onClick={() => onSelect(conv.id)}
                            className={`w-full p-4 flex gap-3 text-left transition-colors hover:bg-gray-50 
                                ${isSelected ? 'bg-blue-50 hover:bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'}
                            `}
                        >
                            {/* Icon / Avatar Context */}
                            <div className="flex-shrink-0 mt-1">
                                {conv.type === 'SYSTEM' ? (
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-orange-100 text-orange-600">
                                        📢
                                    </div>
                                ) : conv.type === 'BROADCAST' ? (
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                ) : avatarUrl ? (
                                    <img 
                                        src={avatarUrl} 
                                        alt={avatarInitials || 'Avatar'}
                                        className="w-10 h-10 rounded-full object-cover bg-gray-200"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 font-semibold text-sm">
                                        {avatarInitials}
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className={`text-sm truncate pr-2 ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                        {conv.subject || 'No Subject'}
                                    </h4>
                                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                                        {conv.last_message?.created_at 
                                            ? formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: true })
                                            : ''}
                                    </span>
                                </div>
                                <p className={`text-xs truncate ${isUnread ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                                    {conv.last_message ? (
                                        <>
                                            <span className="text-gray-400 mr-1">{conv.last_message.sender_name}:</span>
                                            {conv.last_message.content}
                                        </>
                                    ) : (
                                        <span className="italic">No messages</span>
                                    )}
                                </p>
                            </div>

                            {/* Unread Badge */}
                            {isUnread && (
                                <div className="flex-shrink-0 self-center ml-2">
                                    <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-blue-600 rounded-full">
                                        {conv.unread_count}
                                    </span>
                                </div>
                            )}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
