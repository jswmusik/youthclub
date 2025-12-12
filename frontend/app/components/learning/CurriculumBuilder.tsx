'use client';

import { useState, useEffect } from 'react';
import { Course, CourseChapter, ContentItem, ContentItemFormData } from '@/types/learning';
import { learningApi } from '@/lib/learning-api';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, GripVertical, FileText, Video, Download } from 'lucide-react';
import ContentItemFormModal from './ContentItemFormModal';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

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
        } catch (error) {
            console.error(error);
            toast.error('Failed to save lesson');
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

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Add Chapter Section */}
            <div className="flex gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <Input 
                    placeholder="New Chapter Title..." 
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    className="bg-white"
                />
                <Button onClick={handleAddChapter} disabled={!newChapterTitle.trim()}>
                    <Plus className="w-4 h-4 mr-2" /> Add Chapter
                </Button>
            </div>

            {/* Chapters List */}
            <div className="space-y-6">
                {chapters.map((chapter) => (
                    <div key={chapter.id} className="border rounded-lg shadow-sm bg-white overflow-hidden">
                        {/* Chapter Header */}
                        <div className="bg-slate-100 px-4 py-3 flex justify-between items-center border-b">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-700">{chapter.title}</span>
                                <span className="text-xs text-slate-400">({chapter.items?.length || 0} items)</span>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteChapter(chapter.id)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="divide-y">
                            {chapter.items?.length === 0 && (
                                <div className="p-8 text-center text-slate-400 text-sm">
                                    No lessons yet. Click "Add Content" to start.
                                </div>
                            )}
                            
                            {chapter.items?.map((item) => (
                                <div key={item.id} className="p-3 hover:bg-slate-50 flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <GripVertical className="w-4 h-4 text-slate-300 cursor-move" />
                                        
                                        {/* Icon based on type */}
                                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                            {item.type === 'VIDEO' && <Video className="w-4 h-4" />}
                                            {item.type === 'TEXT' && <FileText className="w-4 h-4" />}
                                            {item.type === 'FILE' && <Download className="w-4 h-4" />}
                                        </div>
                                        
                                        <div>
                                            <p className="font-medium text-sm text-slate-800">{item.title}</p>
                                            <p className="text-xs text-slate-500">{item.estimated_duration} min • {item.type}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" onClick={() => openEditModal(chapter.id, item)}>
                                            <Edit2 className="w-3 h-3 text-slate-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                                            <Trash2 className="w-3 h-3 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer Action */}
                        <div className="p-3 bg-slate-50 border-t">
                            <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => openAddModal(chapter.id)}>
                                <Plus className="w-4 h-4 mr-2" /> Add Content to Chapter
                            </Button>
                        </div>
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