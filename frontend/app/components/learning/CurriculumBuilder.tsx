'use client';

import { useState, useEffect } from 'react';
import { Course, CourseChapter, ContentItem, ContentItemFormData } from '@/types/learning';
import { learningApi } from '@/lib/learning-api';
import { Plus, Trash2, FileText, Video, Download, BookOpen, Layers } from 'lucide-react';
import ContentItemFormModal from './ContentItemFormModal';
import SortableItem from './SortableItem';
import Toast from '../Toast';
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
    const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false });
    
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
            setToast({ message: 'Chapter added successfully!', type: 'success', isVisible: true });
        } catch (error) {
            setToast({ message: 'Failed to add chapter', type: 'error', isVisible: true });
        }
    };

    const handleDeleteChapter = async (id: number) => {
        if (!confirm('Delete chapter and all its contents?')) return;
        try {
            await learningApi.deleteChapter(id);
            setChapters(prev => prev.filter(c => c.id !== id));
            setToast({ message: 'Chapter deleted', type: 'success', isVisible: true });
        } catch (error) {
            setToast({ message: 'Failed to delete chapter', type: 'error', isVisible: true });
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
            setToast({ message: 'Lesson saved successfully!', type: 'success', isVisible: true });
            setShowItemModal(false);
            setEditingItem(undefined);
        } catch (error: any) {
            console.error('Save item error:', error);
            
            let errorMessage = 'Failed to save lesson';
            if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (error.response.data.detail) {
                    errorMessage = error.response.data.detail;
                } else if (error.response.data.error) {
                    errorMessage = error.response.data.error;
                } else {
                    const fieldErrors = Object.entries(error.response.data)
                        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                        .join('; ');
                    if (fieldErrors) {
                        errorMessage = fieldErrors;
                    }
                }
            }
            
            setToast({ message: errorMessage, type: 'error', isVisible: true });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteItem = async (id: number) => {
        if (!confirm('Delete this lesson?')) return;
        try {
            await learningApi.deleteItem(id);
            loadChapters();
            setToast({ message: 'Lesson deleted', type: 'success', isVisible: true });
        } catch (error) {
            setToast({ message: 'Failed to delete lesson', type: 'error', isVisible: true });
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

        const newItems = arrayMove(targetChapter.items, oldIndex, newIndex);
        setChapters(prevChapters =>
            prevChapters.map(chapter =>
                chapter.id === targetChapter!.id
                    ? { ...chapter, items: newItems }
                    : chapter
            )
        );

        try {
            const orderedIds = newItems.map(item => item.id);
            await learningApi.reorderItems(targetChapter.id, orderedIds);
            setToast({ message: 'Lesson order updated', type: 'success', isVisible: true });
        } catch (error) {
            console.error('Failed to reorder items', error);
            setToast({ message: 'Failed to update lesson order', type: 'error', isVisible: true });
            loadChapters();
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-6 animate-pulse">
                    <div className="h-11 bg-[var(--dark-600)] rounded-xl" />
                </div>
                {[1, 2].map(i => (
                    <div key={i} className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-6 animate-pulse">
                        <div className="h-16 bg-[var(--dark-600)] rounded-xl" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                            <Layers className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--brand-light)]">Course Curriculum</h2>
                            <p className="text-sm text-[var(--brand-light)]/50">Organize your course into chapters and lessons</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input 
                            type="text"
                            placeholder="Enter chapter title (e.g., Introduction, Module 1, etc.)" 
                            value={newChapterTitle}
                            onChange={(e) => setNewChapterTitle(e.target.value)}
                            className="flex-1 h-11 px-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/30 outline-none focus:border-[var(--brand-primary)] transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddChapter()}
                        />
                        <button 
                            onClick={handleAddChapter} 
                            disabled={!newChapterTitle.trim()}
                            className="px-6 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" /> Add Chapter
                        </button>
                    </div>
                </div>
            </div>

            {/* Chapters List */}
            <div className="space-y-6">
                {chapters.length === 0 && (
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--dark-700)] flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-[var(--brand-light)]/30" />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--brand-light)] mb-2">No chapters yet</h3>
                        <p className="text-sm text-[var(--brand-light)]/50 mb-6 max-w-md mx-auto">
                            Create your first chapter to start building your course curriculum.
                        </p>
                    </div>
                )}
                
                {chapters.map((chapter, chapterIndex) => (
                    <div key={chapter.id} className="space-y-3">
                        {/* Chapter Header */}
                        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] text-white font-bold text-lg">
                                    {chapterIndex + 1}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-[var(--brand-light)]">{chapter.title}</h3>
                                    <p className="text-sm text-[var(--brand-light)]/50">
                                        {chapter.items?.length || 0} {chapter.items?.length === 1 ? 'lesson' : 'lessons'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDeleteChapter(chapter.id)}
                                className="px-4 py-2 rounded-xl text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all flex items-center gap-2 text-sm font-medium"
                            >
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        </div>

                        {/* Items List */}
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="space-y-2 sm:ml-14">
                                {chapter.items?.length === 0 && (
                                    <div className="bg-[var(--dark-700)] rounded-none sm:rounded-xl border-y sm:border border-dashed border-[var(--dark-500)] py-8 text-center">
                                        <p className="text-sm text-[var(--brand-light)]/50 mb-4">No lessons in this chapter yet</p>
                                        <button 
                                            onClick={() => openAddModal(chapter.id)}
                                            className="px-4 py-2 rounded-xl border-2 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-[var(--dark-900)] transition-all text-sm font-medium flex items-center gap-2 mx-auto"
                                        >
                                            <Plus className="w-4 h-4" /> Add First Lesson
                                        </button>
                                    </div>
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
                                    <button 
                                        onClick={() => openAddModal(chapter.id)}
                                        className="w-full py-3 rounded-none sm:rounded-xl border-y sm:border border-dashed border-[var(--dark-500)] hover:border-[var(--brand-primary)] text-[var(--brand-light)]/50 hover:text-[var(--brand-primary)] transition-all flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                        <Plus className="w-4 h-4" /> Add Lesson to This Chapter
                                    </button>
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

            <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} darkMode />
        </div>
    );
}
