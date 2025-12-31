'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Course, ContentItem } from '@/types/learning';
import { CheckCircle, Circle, PlayCircle, FileText, Download, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
    course: Course;
    activeItemId: number | null;
    onSelectItem: (item: ContentItem) => void;
    completedItemIds: number[];
}

export default function CourseNavigation({ course, activeItemId, onSelectItem, completedItemIds }: Props) {
    const t = useTranslations('knowledgeAdmin.coursePlayer.navigation');
    // @ts-ignore - Assuming chapters exist on the course object from the detail API
    const chapters = course.chapters || [];
    
    // All chapters open by default
    const [openChapters, setOpenChapters] = useState<number[]>(chapters.map((c: any) => c.id));

    const toggleChapter = (chapterId: number) => {
        setOpenChapters(prev => 
            prev.includes(chapterId) 
                ? prev.filter(id => id !== chapterId)
                : [...prev, chapterId]
        );
    };

    return (
        <div className="h-full flex flex-col bg-[var(--dark-800)]">
            {/* Header with Progress */}
            <div className="p-4 sm:p-6 border-b border-[var(--dark-600)] bg-gradient-to-br from-[var(--dark-700)] to-[var(--dark-800)]">
                <h2 className="font-bold text-base sm:text-lg text-[var(--brand-light)] truncate mb-3" title={course.title}>
                    {course.title}
                </h2>
                <div className="flex items-center gap-3">
                    <div className="flex-1 bg-[var(--dark-600)] rounded-full h-2.5 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] h-full rounded-full transition-all duration-500" 
                            style={{ width: `${course.user_progress?.percent_completed || 0}%` }}
                        />
                    </div>
                    <span className="font-bold text-[var(--brand-primary)] min-w-[3rem] text-right text-sm">
                        {course.user_progress?.percent_completed || 0}%
                    </span>
                </div>
                {course.user_progress?.status === 'COMPLETED' && (
                    <div className="mt-3 flex items-center gap-2 text-[var(--brand-green)] text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">{t('courseCompleted')}</span>
                    </div>
                )}
            </div>

            {/* Chapters List */}
            <div className="flex-1 overflow-auto">
                {chapters.map((chapter: any) => {
                    const isOpen = openChapters.includes(chapter.id);
                    const completedCount = chapter.items?.filter((item: ContentItem) => 
                        completedItemIds.includes(item.id)
                    ).length || 0;
                    const totalCount = chapter.items?.length || 0;
                    
                    return (
                        <div key={chapter.id} className="border-b border-[var(--dark-600)]">
                            {/* Chapter Header */}
                            <button
                                onClick={() => toggleChapter(chapter.id)}
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--dark-700)] transition-all"
                            >
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isOpen ? 'bg-[var(--brand-primary)]/20' : 'bg-[var(--dark-600)]'}`}>
                                    {isOpen ? (
                                        <ChevronDown className={`w-4 h-4 ${isOpen ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-light)]/50'}`} />
                                    ) : (
                                        <ChevronRight className={`w-4 h-4 ${isOpen ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-light)]/50'}`} />
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="font-semibold text-sm text-[var(--brand-light)]">{chapter.title}</h3>
                                    <p className="text-xs text-[var(--brand-light)]/50 mt-0.5">
                                        {completedCount}/{totalCount} {t('completed')}
                                    </p>
                                </div>
                                {completedCount === totalCount && totalCount > 0 && (
                                    <CheckCircle className="w-5 h-5 text-[var(--brand-green)]" />
                                )}
                            </button>

                            {/* Chapter Items */}
                            {isOpen && (
                                <div className="pb-2">
                                    {chapter.items?.map((item: ContentItem) => {
                                        const isActive = item.id === activeItemId;
                                        const isCompleted = completedItemIds.includes(item.id);

                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => onSelectItem(item)}
                                                className={`
                                                    w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-all duration-200 border-l-4
                                                    ${isActive 
                                                        ? 'bg-gradient-to-r from-[var(--brand-primary)]/20 to-transparent border-[var(--brand-primary)] text-[var(--brand-light)]' 
                                                        : 'border-transparent hover:bg-[var(--dark-700)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)]'
                                                    }
                                                `}
                                            >
                                                {/* Status Icon */}
                                                <div className="flex-shrink-0">
                                                    {isCompleted ? (
                                                        <CheckCircle className="w-5 h-5 text-[var(--brand-green)]" />
                                                    ) : isActive ? (
                                                        <Circle className="w-5 h-5 text-[var(--brand-primary)] fill-[var(--brand-primary)]" />
                                                    ) : (
                                                        <Circle className="w-5 h-5 text-[var(--dark-500)]" />
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-medium line-clamp-2 text-sm ${isActive ? 'font-semibold' : ''} ${isCompleted && !isActive ? 'text-[var(--brand-light)]/50' : ''}`}>
                                                        {item.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        {item.type === 'VIDEO' && (
                                                            <span className="flex items-center gap-1 text-xs text-[var(--brand-red)]">
                                                                <PlayCircle className="w-3.5 h-3.5" />
                                                            </span>
                                                        )}
                                                        {item.type === 'TEXT' && (
                                                            <span className="flex items-center gap-1 text-xs text-[var(--brand-purple)]">
                                                                <FileText className="w-3.5 h-3.5" />
                                                            </span>
                                                        )}
                                                        {item.type === 'FILE' && (
                                                            <span className="flex items-center gap-1 text-xs text-[var(--brand-green)]">
                                                                <Download className="w-3.5 h-3.5" />
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-[var(--brand-light)]/40">{item.estimated_duration} min</span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
