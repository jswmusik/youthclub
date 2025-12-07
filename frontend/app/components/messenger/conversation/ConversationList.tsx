'use client';

import { ConversationList as ConversationListType } from '../../../../types/messenger';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
    conversations: ConversationListType[];
    selectedId: number | null;
    onSelect: (id: number) => void;
}

export default function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
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
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                                    ${conv.type === 'SYSTEM' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}
                                `}>
                                    {conv.type === 'SYSTEM' ? '📢' : (conv.subject?.[0] || '#')}
                                </div>
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
