'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { learningApi } from '@/lib/learning-api';
import { Course, ContentItem } from '@/types/learning';
import CourseNavigation from './CourseNavigation';
import ContentRenderer from './ContentRenderer';
import StarRating from './StarRating';
import { Menu, Star, X, BookOpen } from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import BackButton from '../BackButton';

interface Props {
    courseSlug: string;
    backUrl: string;
}

export default function CoursePlayerLayout({ courseSlug, backUrl }: Props) {
    const t = useTranslations('knowledgeAdmin.coursePlayer');
    const router = useRouter();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeItem, setActiveItem] = useState<ContentItem | null>(null);
    const [completedIds, setCompletedIds] = useState<number[]>([]);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [userRating, setUserRating] = useState<number>(0);
    const [isRating, setIsRating] = useState(false);
    const { success, error, info, warning } = useToast();

    useEffect(() => {
        loadCourse();
    }, [courseSlug]);

    const loadCourse = async () => {
        try {
            const res = await learningApi.getCourse(courseSlug);
            const data = res.data;
            setCourse(data);

            const completed: number[] = [];
            let foundActive = false;
            
            // @ts-ignore
            data.chapters?.forEach((chapter: any) => {
                chapter.items?.forEach((item: ContentItem) => {
                    if (item.is_completed) completed.push(item.id);
                    
                    if (!foundActive && !item.is_completed) {
                        setActiveItem(item);
                        foundActive = true;
                    }
                });
            });
            
            setCompletedIds(completed);
            
            if (!foundActive && data.chapters?.[0]?.items?.[0]) {
                // @ts-ignore
                setActiveItem(data.chapters[0].items[0]);
            }

            setUserRating(data.user_rating || 0);

        } catch (err) {
            console.error("Failed to load course", err);
            error(t('errors.failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

    const handleRateCourse = async (rating: number) => {
        if (!course) return;

        setIsRating(true);
        try {
            await learningApi.rateCourse(course.slug, rating);
            setUserRating(rating);
            success(t('rating.success'));
            
            const res = await learningApi.getCourse(course.slug);
            setCourse(res.data);
        } catch (err: any) {
            console.error("Failed to rate course", err);
            error(err.response?.data?.error || t('errors.failedToRate'));
        } finally {
            setIsRating(false);
        }
    };

    const handleMarkComplete = async () => {
        if (!activeItem || !course) return;

        try {
            const res = await learningApi.markItemComplete(course.slug, activeItem.id);
            
            setCompletedIds(prev => [...prev, activeItem.id]);
            success(t('lesson.completed'));
            
            const wasCompleted = course.user_progress?.status === 'COMPLETED';
            const newStatus = res.data.course_status;
            
            if (res.data.course_percent !== undefined) {
                setCourse(prev => prev ? {
                    ...prev,
                    user_progress: {
                        ...prev.user_progress!,
                        percent_completed: res.data.course_percent,
                        status: res.data.course_status
                    }
                } : null);
            }
            
            if (newStatus === 'COMPLETED' && !wasCompleted) {
                try {
                    const confetti = (await import('canvas-confetti')).default;
                    
                    const duration = 3000;
                    const animationEnd = Date.now() + duration;
                    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

                    function randomInRange(min: number, max: number) {
                        return Math.random() * (max - min) + min;
                    }

                    const interval: any = setInterval(function() {
                        const timeLeft = animationEnd - Date.now();

                        if (timeLeft <= 0) {
                            return clearInterval(interval);
                        }

                        const particleCount = 50 * (timeLeft / duration);
                        
                        confetti({
                            ...defaults,
                            particleCount,
                            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                        });
                        
                        confetti({
                            ...defaults,
                            particleCount,
                            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                        });
                        
                        confetti({
                            ...defaults,
                            particleCount,
                            origin: { x: randomInRange(0.4, 0.6), y: Math.random() - 0.2 }
                        });
                    }, 250);
                    
                    success(t('course.congratulations'));
                } catch (confettiError) {
                    console.log('Confetti not available:', confettiError);
                }
            }

        } catch (err) {
            console.error(err);
            error(t('errors.failedToUpdate'));
        }
    };

    const getNextItem = () => {
        if (!activeItem || !course) return null;
        // @ts-ignore
        const allItems: ContentItem[] = course.chapters?.flatMap((c: any) => c.items) || [];
        const currentIndex = allItems.findIndex(i => i.id === activeItem.id);
        if (currentIndex !== -1 && currentIndex < allItems.length - 1) {
            return allItems[currentIndex + 1];
        }
        return null;
    };

    const handleNext = () => {
        const next = getNextItem();
        if (next) setActiveItem(next);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
                    <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="text-[var(--brand-light)]/60 animate-pulse">{t('loading')}</div>
            </div>
        );
    }
    
    if (!course) {
        return (
            <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-[var(--brand-red)]" />
                </div>
                <div className="text-[var(--brand-red)] font-medium">{t('errors.notFound')}</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[var(--dark-900)]">
            {/* Top Bar */}
            <div className="bg-[var(--dark-800)] border-b border-[var(--dark-600)] px-4 py-3 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <BackButton 
                        href={backUrl}
                        label={t('backToCourses')}
                    />
                    <div className="h-6 w-px bg-[var(--dark-600)]" />
                    <h1 className="font-semibold text-[var(--brand-light)] truncate flex-1 text-sm sm:text-base">
                        {course.title}
                    </h1>
                    
                    {/* Desktop Rating */}
                    <div className="hidden sm:flex items-center gap-3 border-l border-[var(--dark-600)] pl-3">
                        {course.rating_avg !== null && course.rating_avg !== undefined && (
                            <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-[var(--brand-peach)] fill-[var(--brand-peach)]" />
                                <span className="text-sm font-medium text-[var(--brand-light)]">
                                    {course.rating_avg.toFixed(1)}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--brand-light)]/50">{t('rating.label')}:</span>
                            <StarRating
                                value={userRating}
                                onChange={handleRateCourse}
                                size="sm"
                                readOnly={isRating}
                            />
                        </div>
                    </div>
                    
                    {/* Mobile Menu Button */}
                    <button 
                        onClick={() => setMobileNavOpen(true)}
                        className="md:hidden w-10 h-10 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] flex items-center justify-center text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] transition-all"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Mobile Rating */}
                <div className="sm:hidden mt-3 pt-3 border-t border-[var(--dark-600)] flex items-center justify-between">
                    {course.rating_avg !== null && course.rating_avg !== undefined && (
                        <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-[var(--brand-peach)] fill-[var(--brand-peach)]" />
                            <span className="text-sm font-medium text-[var(--brand-light)]">
                                {course.rating_avg.toFixed(1)}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--brand-light)]/50">Rate:</span>
                        <StarRating
                            value={userRating}
                            onChange={handleRateCourse}
                            size="sm"
                            readOnly={isRating}
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                {/* Main Content */}
                <div className="flex-1 min-h-0 overflow-auto">
                    {activeItem ? (
                        <ContentRenderer 
                            item={activeItem}
                            isCompleted={completedIds.includes(activeItem.id)}
                            onMarkComplete={handleMarkComplete}
                            onNext={handleNext}
                            hasNext={!!getNextItem()}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full min-h-[500px] p-8">
                            <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mb-4">
                                <BookOpen className="w-8 h-8 text-[var(--brand-light)]/30" />
                            </div>
                            <p className="text-[var(--brand-light)]/50 text-center mb-4">{t('selectLesson')}</p>
                            <button 
                                onClick={() => setMobileNavOpen(true)}
                                className="md:hidden px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-medium flex items-center gap-2"
                            >
                                <Menu className="w-4 h-4" />
                                {t('openMenu')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Desktop Sidebar */}
                <div className="hidden md:block w-80 lg:w-96 border-l border-[var(--dark-600)] bg-[var(--dark-800)] flex-shrink-0 overflow-auto">
                    <CourseNavigation 
                        course={course}
                        activeItemId={activeItem?.id || null}
                        onSelectItem={setActiveItem}
                        completedItemIds={completedIds}
                    />
                </div>
            </div>

            {/* Mobile Navigation Drawer */}
            {mobileNavOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setMobileNavOpen(false)}
                    />
                    
                    {/* Drawer */}
                    <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-[var(--dark-800)] border-l border-[var(--dark-600)] shadow-2xl overflow-auto">
                        {/* Close Button */}
                        <div className="sticky top-0 bg-[var(--dark-800)] border-b border-[var(--dark-600)] p-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('courseContent')}</h2>
                            <button 
                                onClick={() => setMobileNavOpen(false)}
                                className="w-10 h-10 rounded-xl bg-[var(--dark-700)] flex items-center justify-center text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <CourseNavigation 
                            course={course}
                            activeItemId={activeItem?.id || null}
                            onSelectItem={(item) => {
                                setActiveItem(item);
                                setMobileNavOpen(false);
                            }}
                            completedItemIds={completedIds}
                        />
                    </div>
                </div>
            )}

            </div>
    );
}
