'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { X, Paperclip, Send, Loader2, MessageSquare } from 'lucide-react';
import { messengerApi } from '../../../lib/messenger-api';
import { useToast } from '../../../hooks/useToast';

interface QuickMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipientId: number;
    recipientName: string;
    onSuccess?: (conversationId?: number) => void;
    onError?: (errorMsg: string) => void;
}

export default function QuickMessageModal({
    isOpen,
    onClose,
    recipientId,
    recipientName,
    onSuccess,
    onError,
}: QuickMessageModalProps) {
    const t = useTranslations('messages');
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const [conversationId, setConversationId] = useState<number | null>(null);
    const [isExistingConversation, setIsExistingConversation] = useState(false);
    const [checkingConversation, setCheckingConversation] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Toast state
    const { success, error, info, warning } = useToast();

    // Check if conversation exists when modal opens
    useEffect(() => {
        if (isOpen && recipientId) {
            setCheckingConversation(true);
            setPermissionError(null);
            messengerApi.checkConversationExists(recipientId)
                .then((result) => {
                    setIsExistingConversation(result.exists);
                    if (result.exists && result.conversationId) {
                        setConversationId(result.conversationId);
                    }
                    if (result.error) {
                        setPermissionError(result.error);
                        error(result.error);
                    }
                })
                .catch((err) => {
                    console.error('Failed to check conversation:', err);
                    setIsExistingConversation(false);
                    const errorMsg = err?.response?.data?.error || t('quickMessage.failedToCheckConversation');
                    setPermissionError(errorMsg);
                    error(errorMsg);
                })
                .finally(() => {
                    setCheckingConversation(false);
                });
        } else {
            setIsExistingConversation(false);
            setConversationId(null);
            setPermissionError(null);
            setSubject('');
            setContent('');
            setAttachment(null);
        }
    }, [isOpen, recipientId]);

    if (!isOpen) return null;

    const handleSend = async () => {
        if (!isExistingConversation && !subject.trim()) {
            warning(t('quickMessage.subjectRequired'));
            return;
        }

        if (!content.trim() && !attachment) {
            warning(t('quickMessage.messageOrAttachmentRequired'));
            return;
        }

        setSending(true);
        try {
            const res = await messengerApi.sendMessage({
                recipient_id: recipientId,
                subject: isExistingConversation 
                    ? (subject.trim() || undefined)
                    : subject.trim(),
                content: content.trim() || undefined,
                attachment: attachment || undefined
            });
            
            const returnedConversationId = res.data?.id;
            const finalConversationId = returnedConversationId || conversationId;
            
            if (finalConversationId) {
                setConversationId(finalConversationId);
            }

            setSubject('');
            setContent('');
            setAttachment(null);
            
            success(t('quickMessage.messageSentSuccess'));
            
            if (onSuccess && finalConversationId) {
                onSuccess(finalConversationId);
            }
            
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err: any) {
            console.error("Failed to send message", err);
            const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || t('quickMessage.couldNotSendMessage');
            error(errorMsg);
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4"
            onClick={handleBackdropClick}
        >
            <div 
                className="w-full h-full sm:h-auto sm:max-w-2xl bg-[var(--dark-800)] border-y sm:border border-[var(--dark-600)] shadow-2xl rounded-none sm:rounded-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 flex-shrink-0">
                    <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)]">{t('quickMessage.title')}</h2>
                            </div>
                            <p className="text-sm text-[var(--brand-light)]/50 ml-[52px] truncate">{t('quickMessage.to')} {recipientName}</p>
                        </div>
                        <button 
                            onClick={onClose}
                            disabled={sending}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--dark-600)] hover:bg-[var(--dark-500)] flex items-center justify-center transition-colors text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] flex-shrink-0"
                        >
                            <X className="h-5 w-5 sm:h-6 sm:w-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-5 bg-[var(--dark-800)] flex-1 overflow-y-auto min-h-0">
                    {/* Permission Error Message */}
                    {permissionError && (
                        <div className="rounded-xl p-4 bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30">
                            <p className="text-sm font-medium text-[var(--brand-red)]">{permissionError}</p>
                            <p className="text-xs mt-1 text-[var(--brand-red)]/80">{t('quickMessage.permissionError')}</p>
                        </div>
                    )}
                    
                    {/* Loading State */}
                    {checkingConversation ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-8 h-8 border-2 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin" />
                            <span className="ml-3 text-sm text-[var(--brand-light)]/60">{t('quickMessage.checkingConversation')}</span>
                        </div>
                    ) : (
                        <>
                            {/* Subject Field */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-[var(--brand-light)]">
                                    {t('quickMessage.subject')} {isExistingConversation 
                                        ? <span className="font-normal text-xs text-[var(--brand-light)]/50">{t('quickMessage.subjectOptional')}</span> 
                                        : <span className="text-[var(--brand-primary)]">*</span>
                                    }
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder={isExistingConversation 
                                        ? t('quickMessage.subjectPlaceholderUpdate')
                                        : t('quickMessage.subjectPlaceholderNew')}
                                    className={`w-full h-11 sm:h-12 px-4 rounded-xl bg-[var(--dark-700)] border-2 text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 outline-none transition-all duration-200 hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 ${
                                        !isExistingConversation && !subject.trim() 
                                            ? 'border-[var(--brand-red)]/50' 
                                            : 'border-[var(--dark-500)]'
                                    }`}
                                    disabled={sending}
                                />
                                {!isExistingConversation && !subject.trim() && (
                                    <p className="text-xs text-[var(--brand-red)]">{t('quickMessage.subjectRequiredNew')}</p>
                                )}
                            </div>

                            {/* Message Field */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-[var(--brand-light)]">{t('quickMessage.message')}</label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder={t('typeMessageHere')}
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 outline-none transition-all duration-200 hover:border-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 resize-none min-h-[120px]"
                                    disabled={sending}
                                />
                            </div>

                            {/* Attachment Field */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                                    <Paperclip className="h-4 w-4 text-[var(--brand-light)]/60" />
                                    {t('quickMessage.attachment')} <span className="font-normal text-xs text-[var(--brand-light)]/50">{t('quickMessage.optional')}</span>
                                </label>
                                
                                {!attachment ? (
                                    <div className="relative">
                                        <input
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
                                            className="flex flex-col items-center justify-center w-full h-24 sm:h-28 border-2 border-dashed border-[var(--dark-500)] bg-[var(--dark-700)] rounded-xl transition-all cursor-pointer group hover:border-[var(--brand-primary)] hover:bg-[var(--dark-600)]"
                                        >
                                            <div className="flex flex-col items-center justify-center py-3 px-4">
                                                <div className="mb-2 p-2 rounded-full bg-[var(--dark-600)] group-hover:bg-[var(--brand-primary)]/20 transition-colors">
                                                    <Paperclip className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--brand-light)]/60 group-hover:text-[var(--brand-primary)] transition-colors" />
                                                </div>
                                                <p className="mb-0.5 text-xs sm:text-sm font-semibold text-[var(--brand-light)]/80 group-hover:text-[var(--brand-primary)] transition-colors text-center">
                                                    <span className="font-semibold">{t('quickMessage.clickToUpload')}</span> {t('quickMessage.orDragAndDrop')}
                                                </p>
                                                <p className="text-xs text-[var(--brand-light)]/50 text-center">
                                                    {t('quickMessage.fileTypes')}
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-[var(--brand-primary)]/10 border-2 border-[var(--brand-primary)]/30">
                                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[var(--brand-primary)]/20 flex items-center justify-center">
                                            <Paperclip className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--brand-primary)]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-[var(--brand-light)] truncate">{attachment.name}</p>
                                            <p className="text-xs mt-0.5 text-[var(--brand-light)]/60">
                                                {(attachment.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAttachment(null)}
                                            disabled={sending}
                                            className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center text-[var(--brand-light)]/60 hover:text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-colors flex-shrink-0"
                                        >
                                            <X className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row gap-3 p-4 sm:p-6 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/30 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={sending}
                        className="flex-1 order-2 sm:order-1 h-11 sm:h-12 px-6 rounded-xl border-2 border-[var(--dark-500)] text-[var(--brand-light)]/70 font-medium hover:bg-[var(--dark-700)] hover:text-[var(--brand-light)] transition-all"
                    >
                        {t('quickMessage.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending || checkingConversation || !!permissionError || (!content.trim() && !attachment) || (!isExistingConversation && !subject.trim())}
                        className="flex-1 order-1 sm:order-2 h-11 sm:h-12 px-6 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold flex items-center justify-center gap-2 hover:bg-[var(--brand-purple)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending ? (
                            <>
                                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>{t('quickMessage.sending')}</span>
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                                <span>{t('quickMessage.sendMessage')}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
            
            {/* Toast Notification */}
        </div>
    );
}
