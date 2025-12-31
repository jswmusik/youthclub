'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import { ContentItem, ContentItemFormData, ContentType } from '@/types/learning';
import DarkRichTextEditor from '@/app/components/DarkRichTextEditor';
import { X, Video, FileText, Download, Clock, BookOpen } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ContentItemFormData) => Promise<void>;
    chapterId: number;
    initialData?: ContentItem;
    isSubmitting: boolean;
}

export default function ContentItemFormModal({ isOpen, onClose, onSubmit, chapterId, initialData, isSubmitting }: Props) {
    const t = useTranslations('knowledgeAdmin.courses.lessonModal');
    const { register, handleSubmit, setValue, watch, reset, control } = useForm<ContentItemFormData>({
        defaultValues: {
            type: 'VIDEO',
            estimated_duration: 5,
            order: 0,
            text_content: ''
        }
    });

    const selectedType = watch('type') as ContentType;
    const textContent = watch('text_content');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset({
                    title: initialData.title,
                    type: initialData.type,
                    estimated_duration: initialData.estimated_duration,
                    video_url: initialData.video_url,
                    text_content: initialData.text_content,
                    order: initialData.order,
                    chapter: chapterId
                });
            } else {
                reset({
                    title: '',
                    type: 'VIDEO',
                    estimated_duration: 5,
                    video_url: '',
                    text_content: '',
                    order: 99,
                    chapter: chapterId
                }, { keepDefaultValues: false });
            }
        }
    }, [isOpen, initialData, chapterId, reset]);

    const handleFormSubmit = async (data: ContentItemFormData) => {
        await onSubmit({ ...data, chapter: chapterId });
        onClose();
    };

    if (!isOpen) return null;

    const contentTypes = [
        { id: 'VIDEO', label: t('contentTypes.VIDEO.label'), icon: Video, description: t('contentTypes.VIDEO.description') },
        { id: 'TEXT', label: t('contentTypes.TEXT.label'), icon: FileText, description: t('contentTypes.TEXT.description') },
        { id: 'FILE', label: t('contentTypes.FILE.label'), icon: Download, description: t('contentTypes.FILE.description') },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative w-full max-w-full sm:max-w-3xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto bg-[var(--dark-800)] rounded-t-2xl sm:rounded-2xl border-t sm:border border-[var(--dark-600)] shadow-2xl">
                {/* Drag handle for mobile */}
                <div className="sm:hidden flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1 bg-[var(--dark-500)] rounded-full" />
                </div>

                {/* Header */}
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--brand-light)]">
                                {initialData ? t('title.edit') : t('title.add')}
                            </h2>
                            <p className="text-sm text-[var(--brand-light)]/50">{t('description')}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-[var(--dark-600)] hover:bg-[var(--dark-500)] flex items-center justify-center text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="p-4 sm:p-6 space-y-6">
                    {/* Title and Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2">
                                {t('fields.lessonTitle')} <span className="text-[var(--brand-red)]">*</span>
                            </label>
                            <input 
                                type="text"
                                {...register('title', { required: true })} 
                                placeholder={t('fields.titlePlaceholder')}
                                className="w-full h-11 px-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 outline-none focus:border-[var(--brand-primary)] transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4" /> {t('fields.duration')}
                            </label>
                            <input 
                                type="number"
                                {...register('estimated_duration')} 
                                className="w-full h-11 px-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-all"
                            />
                        </div>
                    </div>

                    {/* Content Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-3">
                            {t('fields.contentType')}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {contentTypes.map((type) => {
                                const Icon = type.icon;
                                const isSelected = selectedType === type.id;
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setValue('type', type.id as ContentType)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                                            isSelected 
                                                ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/50' 
                                                : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--dark-400)]'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                                            isSelected 
                                                ? 'bg-[var(--brand-primary)]/20' 
                                                : 'bg-[var(--dark-600)]'
                                        }`}>
                                            <Icon className={`w-5 h-5 ${isSelected ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-light)]/50'}`} />
                                        </div>
                                        <h4 className={`font-medium ${isSelected ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-light)]'}`}>
                                            {type.label}
                                        </h4>
                                        <p className="text-xs text-[var(--brand-light)]/40 mt-1">{type.description}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Video URL */}
                    {selectedType === 'VIDEO' && (
                        <div>
                            <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2 flex items-center gap-2">
                                <Video className="w-4 h-4" /> {t('video.youtubeUrl')}
                            </label>
                            <input 
                                type="text"
                                {...register('video_url')} 
                                placeholder={t('video.urlPlaceholder')}
                                className="w-full h-11 px-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 outline-none focus:border-[var(--brand-primary)] transition-all"
                            />
                            <p className="text-xs text-[var(--brand-light)]/40 mt-2">
                                {t('video.hint')}
                            </p>
                        </div>
                    )}

                    {/* Text Content */}
                    {selectedType === 'TEXT' && (
                        <div>
                            <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> {t('text.articleContent')}
                            </label>
                            <p className="text-xs text-[var(--brand-light)]/40 mb-3">
                                {t('text.hint')}
                            </p>
                            <div className="min-h-[300px]">
                                <DarkRichTextEditor 
                                    value={textContent || ''} 
                                    onChange={(val) => setValue('text_content', val)}
                                    minHeight="250px"
                                />
                            </div>
                        </div>
                    )}

                    {/* File Upload */}
                    {selectedType === 'FILE' && (
                        <div>
                            <label className="block text-sm font-medium text-[var(--brand-light)]/70 mb-2 flex items-center gap-2">
                                <Download className="w-4 h-4" /> {t('file.uploadFile')}
                            </label>
                            <div className="border-2 border-dashed border-[var(--dark-500)] rounded-xl p-6 text-center hover:border-[var(--brand-primary)]/50 transition-all">
                                <input 
                                    type="file" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if(file) setValue('file_upload', file);
                                    }}
                                    className="w-full text-[var(--brand-light)]/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[var(--brand-primary)] file:text-[var(--dark-900)] file:font-medium file:cursor-pointer hover:file:bg-[var(--brand-primary)]/90"
                                />
                                {initialData?.file_upload && (
                                    <p className="text-xs text-[var(--brand-green)] mt-3">
                                        {t('file.currentFileExists')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-4 border-t border-[var(--dark-600)]">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl text-[var(--brand-light)]/70 bg-[var(--dark-700)] border border-[var(--dark-500)] hover:bg-[var(--dark-600)] font-medium transition-all"
                        >
                            {t('actions.cancel')}
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-[var(--dark-900)]/30 border-t-[var(--dark-900)] rounded-full animate-spin" />
                                    {t('actions.saving')}
                                </>
                            ) : (
                                t('actions.saveLesson')
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
