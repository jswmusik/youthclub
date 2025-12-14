'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { learningApi } from '@/lib/learning-api';
import { Course, ContentItem } from '@/types/learning';
import CourseNavigation from './CourseNavigation';
import ContentRenderer from './ContentRenderer';
import StarRating from './StarRating';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { ArrowLeft, Menu, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Props {
    courseSlug: string;
    backUrl: string;
}

export default function CoursePlayerLayout({ courseSlug, backUrl }: Props) {
    const router = useRouter();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeItem, setActiveItem] = useState<ContentItem | null>(null);
    const [completedIds, setCompletedIds] = useState<number[]>([]);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [userRating, setUserRating] = useState<number>(0);
    const [isRating, setIsRating] = useState(false);

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

            // Load user's rating if available
            setUserRating(data.user_rating || 0);

        } catch (error) {
            console.error("Failed to load course", error);
            toast.error("Failed to load course content");
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
            
            // Update course rating average (approximate)
            // In a real app, you'd refetch the course or get updated rating from response
            toast.success(`You rated this course ${rating} star${rating !== 1 ? 's' : ''}!`);
            
            // Reload course to get updated average rating
            const res = await learningApi.getCourse(course.slug);
            setCourse(res.data);
        } catch (error: any) {
            console.error("Failed to rate course", error);
            toast.error(error.response?.data?.error || "Failed to submit rating");
        } finally {
            setIsRating(false);
        }
    };

    const handleMarkComplete = async () => {
        if (!activeItem || !course) return;

        try {
            const res = await learningApi.markItemComplete(course.slug, activeItem.id);
            
            // Immediately update local state for UI responsiveness
            setCompletedIds(prev => [...prev, activeItem.id]);
            toast.success("Lesson completed!");
            
            // Update course progress in local state
            const wasCompleted = course.user_progress?.status === 'COMPLETED';
            const newPercent = res.data.course_percent || 0;
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
            
            // Celebrate course completion with confetti!
            if (newStatus === 'COMPLETED' && !wasCompleted) {
                try {
                    const confetti = (await import('canvas-confetti')).default;
                    
                    // Fire confetti from multiple positions for a celebration effect
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
                        
                        // Fire from left
                        confetti({
                            ...defaults,
                            particleCount,
                            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                        });
                        
                        // Fire from right
                        confetti({
                            ...defaults,
                            particleCount,
                            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                        });
                        
                        // Fire from center
                        confetti({
                            ...defaults,
                            particleCount,
                            origin: { x: randomInRange(0.4, 0.6), y: Math.random() - 0.2 }
                        });
                    }, 250);
                    
                    toast.success("🎉 Congratulations! You've completed the course!", {
                        duration: 5000,
                    });
                } catch (confettiError) {
                    console.log('Confetti not available:', confettiError);
                }
            }
            
            // Auto-advance logic could go here
            const next = getNextItem();
            if (next) {
                // Optional: Automatically go to next lesson after a delay?
                // setTimeout(() => setActiveItem(next), 1000);
            }

        } catch (error) {
            console.error(error);
            toast.error("Failed to update progress");
        }
    };

    // Helper to find next item
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
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4D4DA4] mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading course...</p>
                </div>
            </div>
        );
    }
    
    if (!course) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <p className="text-gray-500">Course not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-[calc(100vh-200px)] bg-gray-50">
            {/* Top Bar with Brand Styling */}
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 shadow-sm sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push(backUrl)} 
                        className="text-gray-600 hover:text-[#4D4DA4] hover:bg-[#EBEBFE] transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> 
                        <span className="hidden sm:inline">Back to Courses</span>
                    </Button>
                    <div className="h-6 w-px bg-gray-200" />
                    <h1 className="font-semibold text-gray-900 truncate flex-1 text-sm sm:text-base">
                        {course.title}
                    </h1>
                    
                    {/* Rating Section */}
                    <div className="hidden sm:flex items-center gap-3 border-l border-gray-200 pl-3">
                        {course.rating_avg !== null && course.rating_avg !== undefined && (
                            <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                <span className="text-sm font-medium text-gray-700">
                                    {course.rating_avg.toFixed(1)}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Rate:</span>
                            <StarRating
                                value={userRating}
                                onChange={handleRateCourse}
                                size="sm"
                                readOnly={isRating}
                            />
                        </div>
                    </div>
                </div>
                
                {/* Mobile Rating Section */}
                <div className="sm:hidden mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                    {course.rating_avg !== null && course.rating_avg !== undefined && (
                        <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-medium text-gray-700">
                                {course.rating_avg.toFixed(1)}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Rate:</span>
                        <StarRating
                            value={userRating}
                            onChange={handleRateCourse}
                            size="sm"
                            readOnly={isRating}
                        />
                    </div>
                </div>
                
                {/* Mobile Navigation Toggle */}
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                    <SheetTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="md:hidden text-gray-600 hover:text-[#4D4DA4] hover:bg-[#EBEBFE]"
                        >
                            <Menu className="w-5 h-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="p-0 w-80 sm:w-96">
                        <SheetTitle className="sr-only">Course Navigation</SheetTitle>
                        <CourseNavigation 
                            course={course}
                            activeItemId={activeItem?.id || null}
                            onSelectItem={(item) => {
                                setActiveItem(item);
                                setMobileNavOpen(false);
                            }}
                            completedItemIds={completedIds}
                        />
                    </SheetContent>
                </Sheet>
            </div>

            <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                {/* Main Content */}
                <div className="flex-1 min-h-0 overflow-hidden bg-white">
                    <ScrollArea className="h-full">
                        {activeItem ? (
                            <ContentRenderer 
                                item={activeItem}
                                isCompleted={completedIds.includes(activeItem.id)}
                                onMarkComplete={handleMarkComplete}
                                onNext={handleNext}
                                hasNext={!!getNextItem()}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 min-h-[500px] p-8">
                                <p className="text-center">Select a lesson from the menu to start</p>
                                <Button 
                                    onClick={() => setMobileNavOpen(true)}
                                    className="mt-4 md:hidden bg-[#4D4DA4] hover:bg-[#3D3D94]"
                                >
                                    <Menu className="w-4 h-4 mr-2" />
                                    Open Menu
                                </Button>
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Desktop Sidebar */}
                <div className="hidden md:block w-80 lg:w-96 border-l border-gray-200 bg-white shadow-inner flex-shrink-0">
                    <CourseNavigation 
                        course={course}
                        activeItemId={activeItem?.id || null}
                        onSelectItem={setActiveItem}
                        completedItemIds={completedIds}
                    />
                </div>
            </div>
        </div>
    );
}

