'use client';

import { Message } from '../../../../types/messenger';
import { format } from 'date-fns'; // Make sure you have date-fns installed, or use standard Intl

interface MessageBubbleProps {
    message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
    const isMe = message.is_me;

    return (
        <div className={`flex w-full mb-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
                
                {/* Avatar (Only for others) */}
                {!isMe && (
                    <div className="flex-shrink-0">
                        {message.sender.avatar_url ? (
                            <img 
                                src={message.sender.avatar_url} 
                                alt={message.sender.first_name} 
                                className="w-8 h-8 rounded-full bg-gray-200 object-cover"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
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

                    <div className={`
                        px-4 py-2 rounded-2xl text-sm shadow-sm
                        ${isMe 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}
                    `}>
                        {message.attachment && (
                            <div className="mb-2">
                                <img 
                                    src={message.attachment} 
                                    alt="Attachment" 
                                    className="max-w-full rounded-lg max-h-48 object-cover" 
                                />
                            </div>
                        )}
                        <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>

                    {/* Metadata (Time + Read Status) */}
                    <div className="flex items-center gap-1 mt-1 mx-1">
                        <span className="text-[10px] text-gray-400">
                            {format(new Date(message.created_at), 'HH:mm')}
                        </span>
                        {isMe && message.read_status?.is_read && (
                            <span className="text-[10px] text-blue-600 font-bold">Read</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
