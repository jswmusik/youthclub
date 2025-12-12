'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Paperclip, Send, Loader2 } from 'lucide-react';
import { messengerApi } from '../../../lib/messenger-api';
import Toast from '../../components/Toast';

// Shadcn
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    
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
            // Use conversationId from response, or fall back to existing one from state
            const returnedConversationId = res.data?.id;
            const finalConversationId = returnedConversationId || conversationId;
            
            if (finalConversationId) {
                setConversationId(finalConversationId);
            }

            // Clear form
            setSubject('');
            setContent('');
            setAttachment(null);
            
            // Show success toast
            setToast({ 
                message: "Message sent successfully!", 
                type: 'success', 
                isVisible: true 
            });
            
            // Call success callback if provided (parent will show toast and select conversation)
            // Pass the conversationId so parent can navigate to the thread
            if (onSuccess && finalConversationId) {
                onSuccess(finalConversationId);
            }
            
            // Close modal after showing success toast (Toast auto-dismisses after 3 seconds, but we close modal earlier)
            setTimeout(() => {
                onClose();
            }, 2000);
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
            onClick={handleBackdropClick}
        >
            <Card 
                className="w-full max-w-2xl shadow-2xl border border-gray-100 bg-white rounded-xl sm:rounded-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <CardHeader className="pb-4 bg-white border-b border-gray-100 px-5 sm:px-6 pt-5">
                    <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0 flex-1">
                            <CardTitle className="text-xl sm:text-2xl font-bold text-[#121213]">Send Message</CardTitle>
                            <p className="text-sm text-gray-500 mt-1 truncate">To: {recipientName}</p>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={onClose}
                            disabled={sending}
                            className="h-9 w-9 sm:h-10 sm:w-10 text-gray-400 hover:text-gray-600 hover:bg-gray-50 active:bg-gray-100 flex-shrink-0 touch-manipulation rounded-full"
                        >
                            <X className="h-5 w-5 sm:h-6 sm:w-6" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-5 bg-white p-5 sm:p-6">
                    {/* Message Input */}
                    {checkingConversation ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-[#4D4DA4]" />
                            <span className="ml-2 text-sm text-gray-500">Checking conversation...</span>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label className="text-sm sm:text-base font-semibold text-[#121213]">
                                    Subject {isExistingConversation ? <span className="text-gray-500 font-normal text-xs">(Optional)</span> : <span className="text-red-500">*</span>}
                                </Label>
                                <Input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder={isExistingConversation 
                                        ? "Leave empty to keep current subject, or enter new subject to update"
                                        : "e.g., Question about event registration"}
                                    className={`h-11 sm:h-12 text-sm sm:text-base bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-xl ${!isExistingConversation && !subject.trim() ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                                    disabled={sending}
                                    required={!isExistingConversation}
                                />
                                {!isExistingConversation && !subject.trim() && (
                                    <p className="text-xs text-red-600">Subject is required for new conversations</p>
                                )}
                                {isExistingConversation && (
                                    <p className="text-xs text-gray-500">Enter a new subject to override the current one</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm sm:text-base font-semibold text-[#121213]">Message</Label>
                                <Textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Type your message here..."
                                    rows={5}
                                    className="resize-none text-sm sm:text-base bg-gray-50 border-2 border-gray-200 focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4] rounded-xl min-h-[120px] p-3 sm:p-4"
                                    disabled={sending}
                                />
                            </div>

                            {/* Attachment */}
                            <div className="space-y-2">
                                <Label className="text-sm sm:text-base font-semibold text-[#121213] flex items-center gap-2">
                                    <Paperclip className="h-4 w-4 text-gray-500" />
                                    Attachment <span className="text-gray-500 font-normal text-xs">(Optional)</span>
                                </Label>
                                
                                {!attachment ? (
                                    <div className="relative">
                                        <Input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                                            className="hidden"
                                            disabled={sending}
                                            id="file-upload"
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className="flex flex-col items-center justify-center w-full h-24 sm:h-28 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:border-[#4D4DA4] hover:bg-[#EBEBFE]/20 active:bg-[#EBEBFE]/30 transition-all cursor-pointer group touch-manipulation"
                                        >
                                            <div className="flex flex-col items-center justify-center pt-3 pb-3 px-4">
                                                <div className="mb-2 p-2 rounded-full bg-[#EBEBFE]/50 group-hover:bg-[#EBEBFE] transition-colors">
                                                    <Paperclip className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 group-hover:text-[#4D4DA4] transition-colors" />
                                                </div>
                                                <p className="mb-0.5 text-xs sm:text-sm font-semibold text-gray-700 group-hover:text-[#4D4DA4] transition-colors text-center">
                                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                                </p>
                                                <p className="text-xs text-gray-500 text-center">
                                                    PNG, JPG, GIF up to 10MB
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 text-sm sm:text-base text-[#121213] bg-[#EBEBFE]/30 p-3 sm:p-4 rounded-xl border-2 border-[#EBEBFE]">
                                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#4D4DA4]/10 flex items-center justify-center">
                                            <Paperclip className="h-5 w-5 sm:h-6 sm:w-6 text-[#4D4DA4]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm truncate">{attachment.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {(attachment.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setAttachment(null)}
                                            disabled={sending}
                                            className="h-9 w-9 sm:h-10 sm:w-10 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0 touch-manipulation rounded-full"
                                        >
                                            <X className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Footer */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-100">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={sending}
                            className="flex-1 order-2 sm:order-1 h-11 sm:h-12 text-sm sm:text-base font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 touch-manipulation rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSend}
                            disabled={sending || checkingConversation || (!content.trim() && !attachment) || (!isExistingConversation && !subject.trim())}
                            className="flex-1 order-1 sm:order-2 h-11 sm:h-12 text-sm sm:text-base font-semibold bg-[#4D4DA4] hover:bg-[#FF5485] text-white gap-2 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-[#4D4DA4] touch-manipulation shadow-lg hover:shadow-xl"
                        >
                            {sending ? (
                                <>
                                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                                    <span>Send Message</span>
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
            
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
