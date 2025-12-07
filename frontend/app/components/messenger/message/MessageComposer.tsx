'use client';

import { useState, useRef } from 'react';

interface MessageComposerProps {
    onSend: (content: string, attachment?: File) => Promise<void>;
    disabled?: boolean;
}

export default function MessageComposer({ onSend, disabled }: MessageComposerProps) {
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!text.trim() && !file) || sending) return;

        setSending(true);
        try {
            await onSend(text, file || undefined);
            setText('');
            setFile(null);
        } catch (err) {
            console.error(err);
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="p-4 bg-white border-t border-gray-200">
            {/* File Preview */}
            {file && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded-lg w-fit">
                    <span className="text-xs text-gray-600 truncate max-w-[200px]">{file.name}</span>
                    <button 
                        onClick={() => setFile(null)}
                        className="text-gray-400 hover:text-red-500"
                    >
                        ✕
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                {/* Attachment Button */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    disabled={disabled || sending}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                        if (e.target.files?.[0]) setFile(e.target.files[0]);
                    }}
                />

                {/* Text Area */}
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-100 border-0 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none max-h-32"
                    rows={1}
                    disabled={disabled || sending}
                />

                {/* Send Button */}
                <button
                    type="submit"
                    disabled={(!text.trim() && !file) || disabled || sending}
                    className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm"
                >
                    {sending ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    )}
                </button>
            </form>
        </div>
    );
}
