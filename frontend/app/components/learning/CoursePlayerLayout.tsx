'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { learningApi } from '@/lib/learning-api';
import { Course, ContentItem } from '@/types/learning';
import CourseNavigation from './CourseNavigation';
import ContentRenderer from './ContentRenderer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

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

    useEffect(() => {
        loadCourse();
    }, [courseSlug]);

    const loadCourse = async () => {
        try {
            const res = await learningApi.getCourse(courseSlug);
            const data = res.data;
            setCourse(data);

            // Extract completed items from the nested API response
            // We need to traverse chapters -> items -> check 'is_completed'
            // @ts-ignore
            const completed = [];
            let foundActive = false;
            
            // @ts-ignore
            data.chapters?.forEach((chapter: any) => {
                chapter.items?.forEach((item: ContentItem) => {
                    if (item.is_completed) completed.push(item.id);
                    
                    // Set first uncompleted item as active, or just the first item
                    if (!foundActive && !item.is_completed) {
                        setActiveItem(item);
                        foundActive = true;
                    }
                });
            });
            
            setCompletedIds(completed);
            
            // If all completed (or active not set), set first item
            // @ts-ignore
            if (!foundActive && data.chapters?.[0]?.items?.[0]) {
                // @ts-ignore
                setActiveItem(data.chapters[0].items[0]);
            }

        } catch (error) {
            console.error("Failed to load course", error);
            toast.error("Failed to load course content");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkComplete = async () => {
        if (!activeItem || !course) return;

        try {
            const res = await learningApi.markItemComplete(course.slug, activeItem.id);
            setCompletedIds(prev => [...prev, activeItem.id]);
            toast.success("Lesson completed!");
            
            // Update local course progress visually if backend sends it
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

        } catch (error) {
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

    if (loading) return <div className="p-8 text-center">Loading player...</div>;
    if (!course) return <div className="p-8 text-center">Course not found</div>;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
            {/* Top Bar for Mobile/Tablet context mainly, or just a Back button */}
            <div className="bg-white border-b px-4 py-2 flex items-center md:hidden">
                <Button variant="ghost" size="sm" onClick={() => router.push(backUrl)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <span className="font-semibold ml-2 truncate">{course.title}</span>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="hidden md:block">
                    <CourseNavigation 
                        course={course}
                        activeItemId={activeItem?.id || null}
                        onSelectItem={setActiveItem}
                        completedItemIds={completedIds}
                    />
                </div>

                {/* Main Content */}
                <ScrollArea className="flex-1">
                    {activeItem ? (
                        <ContentRenderer 
                            item={activeItem}
                            isCompleted={completedIds.includes(activeItem.id)}
                            onMarkComplete={handleMarkComplete}
                            onNext={handleNext}
                            hasNext={!!getNextItem()}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <p>Select a lesson to start</p>
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}

