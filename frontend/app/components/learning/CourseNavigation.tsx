'use client';

import { Course, ContentItem } from '@/types/learning';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { CheckCircle, Circle, PlayCircle, FileText, Download } from 'lucide-react';

interface Props {
    course: Course;
    activeItemId: number | null;
    onSelectItem: (item: ContentItem) => void;
    completedItemIds: number[];
}

export default function CourseNavigation({ course, activeItemId, onSelectItem, completedItemIds }: Props) {
    // Determine which chapters to open by default (all)
    // @ts-ignore - Assuming chapters exist on the course object from the detail API
    const defaultValue = course.chapters?.map((c: any) => `chapter-${c.id}`) || [];

    return (
        <div className="h-full flex flex-col bg-white border-r border-gray-200 w-80 flex-shrink-0">
            <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-lg truncate" title={course.title}>{course.title}</h2>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-blue-600 h-full rounded-full transition-all" 
                            style={{ width: `${course.user_progress?.percent_completed || 0}%` }}
                        />
                    </div>
                    <span>{course.user_progress?.percent_completed || 0}%</span>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <Accordion type="multiple" defaultValue={defaultValue} className="w-full">
                    {/* @ts-ignore */}
                    {course.chapters?.map((chapter: any) => (
                        <AccordionItem key={chapter.id} value={`chapter-${chapter.id}`}>
                            <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 hover:no-underline font-semibold text-sm text-gray-700">
                                {chapter.title}
                            </AccordionTrigger>
                            <AccordionContent className="pt-0 pb-0">
                                <div className="flex flex-col">
                                    {chapter.items?.map((item: ContentItem) => {
                                        const isActive = item.id === activeItemId;
                                        const isCompleted = completedItemIds.includes(item.id);

                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => onSelectItem(item)}
                                                className={cn(
                                                    "flex items-center gap-3 px-6 py-3 text-sm text-left transition-colors border-l-2",
                                                    isActive 
                                                        ? "bg-blue-50 border-blue-600 text-blue-700" 
                                                        : "border-transparent hover:bg-gray-50 text-gray-600"
                                                )}
                                            >
                                                {/* Icon Status */}
                                                <div className="flex-shrink-0">
                                                    {isCompleted ? (
                                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                                    ) : isActive ? (
                                                        <Circle className="w-4 h-4 text-blue-600 fill-blue-600" />
                                                    ) : (
                                                        <Circle className="w-4 h-4 text-gray-300" />
                                                    )}
                                                </div>

                                                {/* Title & Type Icon */}
                                                <div className="flex-1">
                                                    <p className={cn("font-medium line-clamp-2", isCompleted && !isActive && "text-gray-400")}>
                                                        {item.title}
                                                    </p>
                                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                                                        {item.type === 'VIDEO' && <PlayCircle className="w-3 h-3" />}
                                                        {item.type === 'TEXT' && <FileText className="w-3 h-3" />}
                                                        {item.type === 'FILE' && <Download className="w-3 h-3" />}
                                                        <span>{item.estimated_duration} min</span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </ScrollArea>
        </div>
    );
}