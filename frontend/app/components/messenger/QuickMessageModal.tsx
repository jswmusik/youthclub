'use client';

import { useState, useEffect } from 'react';
import { messengerApi } from '../../../lib/messenger-api';
import Toast from '../../components/Toast';

interface QuickMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipientId: number;
    recipientName: string;
    onSuccess?: (conversationId?: number) => void; // Optional callback after successful send, passes conversation ID
    onError?: (errorMsg: string) => void; // Optional callback for errors
}

export default function QuickMessageModal({
    isOpen,
    onClose,
    recipientId,
    recipientName,
    onSuccess,
    onError
}: QuickMessageModalProps) {
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const [conversationId, setConversationId] = useState<number | null>(null);
    const [isExistingConversation, setIsExistingConversation] = useState(false);
    const [checkingConversation, setCheckingConversation] = useState(false);
    
    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    // Check if conversation exists when modal opens
    useEffect(() => {
        if (isOpen && recipientId) {
            setCheckingConversation(true);
            messengerApi.checkConversationExists(recipientId)
                .then((result) => {
                    setIsExistingConversation(result.exists);
                    if (result.exists && result.conversationId) {
                        setConversationId(result.conversationId);
                    }
                })
                .catch((err) => {
                    console.error('Failed to check conversation:', err);
                    setIsExistingConversation(false);
                })
                .finally(() => {
                    setCheckingConversation(false);
                });
        } else {
            // Reset when modal closes
            setIsExistingConversation(false);
            setConversationId(null);
            setSubject('');
            setContent('');
            setAttachment(null);
        }
    }, [isOpen, recipientId]);

    if (!isOpen) return null;

    const handleSend = async () => {
        // Validate: Subject is required for new conversations
        if (!isExistingConversation && !subject.trim()) {
            setToast({ 
                message: "Subject is required for new conversations.", 
                type: 'warning', 
                isVisible: true 
            });
            return;
        }

        if (!content.trim() && !attachment) {
            setToast({ 
                message: "Please enter a message or attach an image.", 
                type: 'warning', 
                isVisible: true 
            });
            return;
        }

        setSending(true);
        try {
            // Start conversation and send message
            // For new conversations, subject is required (already validated above)
            // For existing conversations, send subject only if provided (will override old subject)
            const res = await messengerApi.sendMessage({
                recipient_id: recipientId,
                subject: isExistingConversation 
                    ? (subject.trim() || undefined)  // Optional for existing - only send if provided
                    : subject.trim(),                  // Required for new - always send
                content: content.trim() || undefined,
                attachment: attachment || undefined
            });
            
            // Backend returns {id: number, status: string}
            const conversationId = res.data?.id;
            if (conversationId) {
                setConversationId(conversationId);
            }

            // Clear form
            setSubject('');
            setContent('');
            setAttachment(null);
            
            // Close modal immediately
            onClose();
            
            // Call success callback if provided (parent will show toast and select conversation)
            if (onSuccess) {
                onSuccess(conversationId);
            }
        } catch (err: any) {
            console.error("Failed to send message", err);
            const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || "Could not send message.";
            setToast({ 
                message: errorMsg, 
                type: 'error', 
                isVisible: true 
            });
            // Also notify parent if callback provided
            if (onError) {
                onError(errorMsg);
            }
        } finally {
            setSending(false);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && !sending) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={handleBackdropClick}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Send Message</h2>
                        <p className="text-sm text-gray-500">To: {recipientName}</p>
                    </div>
                    <button 
                        onClick={onClose}
                        disabled={sending}
                        className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Message Input */}
                <div className="space-y-4">
                    {checkingConversation ? (
                        <div className="text-sm text-gray-500">Checking conversation...</div>
                    ) : (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Subject {isExistingConversation ? '(Optional - will update existing subject)' : '(Required)'}
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder={isExistingConversation 
                                    ? "Leave empty to keep current subject, or enter new subject to update"
                                    : "e.g., Question about event registration"}
                                className={`w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 ${
                                    !isExistingConversation && !subject.trim() ? 'border-red-300' : ''
                                }`}
                                disabled={sending}
                                required={!isExistingConversation}
                            />
                            {!isExistingConversation && (
                                <p className="text-xs text-red-600 mt-1">Subject is required for new conversations</p>
                            )}
                            {isExistingConversation && (
                                <p className="text-xs text-gray-500 mt-1">Enter a new subject to override the current one</p>
                            )}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Message</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Type your message here..."
                            rows={6}
                            className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            disabled={sending}
                        />
                    </div>

                    {/* Attachment */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Attachment (Optional)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                            disabled={sending}
                        />
                        {attachment && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                                <span>📎 {attachment.name}</span>
                                <button
                                    onClick={() => setAttachment(null)}
                                    className="text-red-500 hover:text-red-700"
                                    disabled={sending}
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        disabled={sending}
                        className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={sending || checkingConversation || (!content.trim() && !attachment) || (!isExistingConversation && !subject.trim())}
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {sending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Sending...</span>
                            </>
                        ) : (
                            'Send Message'
                        )}
                    </button>
                </div>
            </div>
            
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
