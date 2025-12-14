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
        <div className="h-full flex flex-col bg-white flex-shrink-0">
            <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-br from-[#EBEBFE] to-white">
                <h2 className="font-bold text-base sm:text-lg text-[#121213] truncate" title={course.title}>{course.title}</h2>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-[#4D4DA4] to-[#FF5485] h-full rounded-full transition-all duration-500" 
                            style={{ width: `${course.user_progress?.percent_completed || 0}%` }}
                        />
                    </div>
                    <span className="font-semibold text-[#4D4DA4] min-w-[2.5rem] text-right">
                        {course.user_progress?.percent_completed || 0}%
                    </span>
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
                                                    "flex items-center gap-3 px-4 sm:px-6 py-3 text-sm text-left transition-all duration-200 border-l-4",
                                                    isActive 
                                                        ? "bg-gradient-to-r from-[#EBEBFE] to-white border-[#4D4DA4] text-[#121213] shadow-sm" 
                                                        : "border-transparent hover:bg-gray-50 text-gray-600 hover:text-[#4D4DA4]"
                                                )}
                                            >
                                                {/* Icon Status */}
                                                <div className="flex-shrink-0">
                                                    {isCompleted ? (
                                                        <CheckCircle className="w-5 h-5 text-[#10B981]" />
                                                    ) : isActive ? (
                                                        <Circle className="w-5 h-5 text-[#4D4DA4] fill-[#4D4DA4]" />
                                                    ) : (
                                                        <Circle className="w-5 h-5 text-gray-300" />
                                                    )}
                                                </div>

                                                {/* Title & Type Icon */}
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn(
                                                        "font-medium line-clamp-2 text-sm",
                                                        isActive && "font-semibold",
                                                        isCompleted && !isActive && "text-gray-400"
                                                    )}>
                                                        {item.title}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                                                        {item.type === 'VIDEO' && <PlayCircle className="w-3.5 h-3.5 text-[#FF5485]" />}
                                                        {item.type === 'TEXT' && <FileText className="w-3.5 h-3.5 text-[#4D4DA4]" />}
                                                        {item.type === 'FILE' && <Download className="w-3.5 h-3.5 text-[#10B981]" />}
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