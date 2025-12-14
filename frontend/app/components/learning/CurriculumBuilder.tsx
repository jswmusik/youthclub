'use client';

import { useState, useEffect } from 'react';
import { Course, CourseChapter, ContentItem, ContentItemFormData } from '@/types/learning';
import { learningApi } from '@/lib/learning-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit2, Trash2, GripVertical, FileText, Video, Download, Clock } from 'lucide-react';
import ContentItemFormModal from './ContentItemFormModal';
import SortableItem from './SortableItem';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface Props {
    course: Course;
}

export default function CurriculumBuilder({ course }: Props) {
    const [chapters, setChapters] = useState<CourseChapter[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [showItemModal, setShowItemModal] = useState(false);
    const [activeChapterId, setActiveChapterId] = useState<number | null>(null);
    const [editingItem, setEditingItem] = useState<ContentItem | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Quick Add Chapter State
    const [newChapterTitle, setNewChapterTitle] = useState('');

    useEffect(() => {
        loadChapters();
    }, [course.id]);

    const loadChapters = async () => {
        try {
            // NOTE: You'll need to create this endpoint in your backend or use getCourse
            // For now, let's assume getCourse returns the updated chapters data
            const res = await learningApi.getCourse(course.slug);
            // @ts-ignore - Assuming response includes chapters structure
            if (res.data.chapters) setChapters(res.data.chapters);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddChapter = async () => {
        if (!newChapterTitle.trim()) return;
        try {
            await learningApi.createChapter({
                title: newChapterTitle,
                course: course.id,
                order: chapters.length + 1
            });
            setNewChapterTitle('');
            loadChapters();
            toast.success('Chapter added');
        } catch (error) {
            toast.error('Failed to add chapter');
        }
    };

    const handleDeleteChapter = async (id: number) => {
        if (!confirm('Delete chapter and all its contents?')) return;
        try {
            await learningApi.deleteChapter(id);
            setChapters(prev => prev.filter(c => c.id !== id));
            toast.success('Chapter deleted');
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const handleSaveItem = async (data: ContentItemFormData) => {
        setIsSubmitting(true);
        try {
            if (editingItem) {
                await learningApi.updateItem(editingItem.id, data);
            } else {
                await learningApi.createItem(data);
            }
            await loadChapters();
            toast.success('Lesson saved');
            setShowItemModal(false);
            setEditingItem(undefined);
        } catch (error: any) {
            console.error('Save item error:', error);
            
            // Extract error message from response
            let errorMessage = 'Failed to save lesson';
            if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (error.response.data.detail) {
                    errorMessage = error.response.data.detail;
                } else if (error.response.data.error) {
                    errorMessage = error.response.data.error;
                } else {
                    // Try to get field-specific errors
                    const fieldErrors = Object.entries(error.response.data)
                        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                        .join('; ');
                    if (fieldErrors) {
                        errorMessage = fieldErrors;
                    }
                }
            }
            
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteItem = async (id: number) => {
        if (!confirm('Delete this lesson?')) return;
        try {
            await learningApi.deleteItem(id);
            loadChapters();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const openAddModal = (chapterId: number) => {
        setActiveChapterId(chapterId);
        setEditingItem(undefined);
        setShowItemModal(true);
    };

    const openEditModal = (chapterId: number, item: ContentItem) => {
        setActiveChapterId(chapterId);
        setEditingItem(item);
        setShowItemModal(true);
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        // Find which chapter contains the dragged item
        let targetChapter: CourseChapter | null = null;
        let itemIndex = -1;

        for (const chapter of chapters) {
            const index = chapter.items?.findIndex(item => item.id === active.id) ?? -1;
            if (index !== -1) {
                targetChapter = chapter;
                itemIndex = index;
                break;
            }
        }

        if (!targetChapter || !targetChapter.items) {
            return;
        }

        const oldIndex = itemIndex;
        const newIndex = targetChapter.items.findIndex(item => item.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        // Update local state optimistically
        const newItems = arrayMove(targetChapter.items, oldIndex, newIndex);
        setChapters(prevChapters =>
            prevChapters.map(chapter =>
                chapter.id === targetChapter!.id
                    ? { ...chapter, items: newItems }
                    : chapter
            )
        );

        // Update order on backend
        try {
            const orderedIds = newItems.map(item => item.id);
            await learningApi.reorderItems(targetChapter.id, orderedIds);
            toast.success('Lesson order updated');
        } catch (error) {
            console.error('Failed to reorder items', error);
            toast.error('Failed to update lesson order');
            // Reload chapters to revert optimistic update
            loadChapters();
        }
    };

    return (
        <div className="space-y-8">
            {/* Add Chapter Section */}
            <Card className="border border-gray-200 shadow-sm bg-white">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Input 
                            placeholder="Enter chapter title (e.g., Introduction, Module 1, etc.)" 
                            value={newChapterTitle}
                            onChange={(e) => setNewChapterTitle(e.target.value)}
                            className="bg-white border-gray-200 flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddChapter()}
                        />
                        <Button 
                            onClick={handleAddChapter} 
                            disabled={!newChapterTitle.trim()}
                            className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add Chapter
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Chapters List */}
            <div className="space-y-8">
                {chapters.length === 0 && (
                    <Card className="border border-gray-200 shadow-sm bg-white">
                        <CardContent className="py-16 text-center">
                            <div className="max-w-md mx-auto">
                                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No chapters yet</h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    Create your first chapter to start building your course curriculum.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
                
                {chapters.map((chapter, chapterIndex) => (
                    <div key={chapter.id} className="space-y-4">
                        {/* Chapter Header */}
                        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#4D4DA4]/10 text-[#4D4DA4] font-bold text-lg">
                                    {chapterIndex + 1}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-[#121213] mb-1">{chapter.title}</h3>
                                    <p className="text-sm text-gray-500">
                                        {chapter.items?.length || 0} {chapter.items?.length === 1 ? 'lesson' : 'lessons'}
                                    </p>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteChapter(chapter.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Chapter
                            </Button>
                        </div>

                        {/* Items List */}
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="space-y-3 ml-14">
                                {chapter.items?.length === 0 && (
                                    <Card className="border border-dashed border-gray-300 bg-gray-50/50">
                                        <CardContent className="py-8 text-center">
                                            <p className="text-sm text-gray-500 mb-4">No lessons in this chapter yet</p>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => openAddModal(chapter.id)}
                                                className="border-[#4D4DA4] text-[#4D4DA4] hover:bg-[#4D4DA4] hover:text-white"
                                            >
                                                <Plus className="w-4 h-4 mr-2" /> Add First Lesson
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}
                                
                                {chapter.items && chapter.items.length > 0 && (
                                    <SortableContext
                                        items={chapter.items.map(item => item.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {chapter.items.map((item, itemIndex) => (
                                            <SortableItem
                                                key={item.id}
                                                item={item}
                                                index={itemIndex}
                                                onEdit={() => openEditModal(chapter.id, item)}
                                                onDelete={() => handleDeleteItem(item.id)}
                                            />
                                        ))}
                                    </SortableContext>
                                )}
                                
                                {/* Add Content Button */}
                                {chapter.items && chapter.items.length > 0 && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => openAddModal(chapter.id)}
                                        className="w-full border-dashed border-gray-300 hover:bg-gray-50 hover:border-[#4D4DA4] hover:text-[#4D4DA4] text-gray-600"
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> Add Lesson to This Chapter
                                    </Button>
                                )}
                            </div>
                        </DndContext>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {activeChapterId && (
                <ContentItemFormModal 
                    isOpen={showItemModal}
                    onClose={() => setShowItemModal(false)}
                    onSubmit={handleSaveItem}
                    chapterId={activeChapterId}
                    initialData={editingItem}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
}