'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '../../../../hooks/useToast';

interface MessageComposerProps {
    onSend: (content: string, attachment?: File) => Promise<void>;
    onTyping?: (isTyping: boolean) => void;
    disabled?: boolean;
    darkMode?: boolean;
}

export default function MessageComposer({ onSend, onTyping, disabled, darkMode = false }: MessageComposerProps) {
    const t = useTranslations('messages');
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTypingRef = useRef(false);
    
    // Toast state
    const { success, error, info, warning } = useToast();

    // Handle typing indicator
    const handleTyping = useCallback(() => {
        if (!onTyping) return;
        
        // Send typing start if not already typing
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            onTyping(true);
        }
        
        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        
        // Set timeout to stop typing indicator after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            if (isTypingRef.current) {
                isTypingRef.current = false;
                onTyping(false);
            }
        }, 2000);
    }, [onTyping]);

    // Cleanup typing timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            // Send stop typing on unmount
            if (isTypingRef.current && onTyping) {
                onTyping(false);
            }
        };
    }, [onTyping]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if ((!text.trim() && !file) || sending) return;

        // Stop typing indicator when sending
        if (isTypingRef.current && onTyping) {
            isTypingRef.current = false;
            onTyping(false);
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        setSending(true);
        try {
            await onSend(text, file || undefined);
            setText('');
            setFile(null);
            // Textarea stays at fixed height, no need to reset
        } catch (err) {
            console.error(err);
            error(t('failedToSendMessage'));
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
        <div className={`p-3 sm:p-3 md:p-4 flex-shrink-0 md:shadow-none w-full max-w-full overflow-hidden flex flex-col min-w-0 ${
            darkMode ? 'bg-[var(--dark-800)]' : 'bg-white shadow-lg'
        }`}>
            {/* File Preview */}
            {file && (
                <div className={`flex items-center gap-2 mb-2 p-2 rounded-lg max-w-full min-w-0 flex-shrink-0 ${
                    darkMode ? 'bg-[var(--dark-700)]' : 'bg-[#F8F7FE]'
                }`}>
                    <span className={`text-xs truncate flex-1 min-w-0 ${
                        darkMode ? 'text-[var(--brand-light)]/80' : 'text-gray-600'
                    }`}>{file.name}</span>
                    <button 
                        onClick={() => setFile(null)}
                        className={`flex-shrink-0 touch-manipulation p-0.5 ${
                            darkMode 
                                ? 'text-[var(--brand-light)]/40 hover:text-[var(--brand-red)] active:text-[var(--brand-red)]' 
                                : 'text-gray-400 hover:text-red-500 active:text-red-700'
                        }`}
                        aria-label={t('removeFile')}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-1.5 sm:gap-2 items-end flex-shrink-0 w-full max-w-full min-w-0 overflow-x-hidden">
                {/* Attachment Button */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 sm:p-2.5 rounded-full transition-colors touch-manipulation flex-shrink-0 ${
                        darkMode 
                            ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] hover:bg-[var(--dark-600)] active:bg-[var(--dark-500)]' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-[#EBEBFE] active:bg-gray-200'
                    }`}
                    disabled={disabled || sending}
                    aria-label={t('attachFile')}
                >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

                {/* Text Area - Fixed height, no auto-resize */}
                {/* font-size: 16px prevents iOS from auto-zooming when input is focused */}
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        handleTyping();
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={t('typeMessage')}
                    className={`flex-1 border-0 rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-base transition-all resize-none h-[40px] max-h-[40px] min-h-[40px] overflow-y-auto overflow-x-hidden w-full max-w-full min-w-0 break-words ${
                        darkMode 
                            ? 'bg-[var(--dark-600)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-2 focus:ring-[var(--brand-primary)] focus:bg-[var(--dark-700)]' 
                            : 'bg-[#F8F7FE] focus:ring-2 focus:ring-[#4D4DA4] focus:bg-white'
                    }`}
                    rows={1}
                    disabled={disabled || sending}
                />

                {/* Send Button */}
                <button
                    type="submit"
                    disabled={(!text.trim() && !file) || disabled || sending}
                    className={`p-2.5 sm:p-3 rounded-full active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shadow-sm flex-shrink-0 touch-manipulation ${
                        darkMode 
                            ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-purple)] disabled:hover:bg-[var(--brand-primary)]' 
                            : 'bg-[#4D4DA4] text-white hover:bg-[#FF5485] disabled:hover:bg-[#4D4DA4]'
                    }`}
                    aria-label={t('sendMessage')}
                >
                    {sending ? (
                        <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${
                            darkMode ? 'border-[var(--dark-900)]' : 'border-white'
                        }`} />
                    ) : (
                        <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    )}
                </button>
            </form>
            
            {/* Toast Notification */}
        </div>
    );
}
