'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContentItem, ContentItemFormData, ContentType } from '@/types/learning';
import RichTextEditor from '@/app/components/RichTextEditor'; // Reusing your existing component

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ContentItemFormData) => Promise<void>;
    chapterId: number;
    initialData?: ContentItem;
    isSubmitting: boolean;
}

export default function ContentItemFormModal({ isOpen, onClose, onSubmit, chapterId, initialData, isSubmitting }: Props) {
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
                    order: 99, // Backend should handle appending
                    chapter: chapterId
                }, { keepDefaultValues: false });
            }
        }
    }, [isOpen, initialData, chapterId, reset]);

    const handleFormSubmit = async (data: ContentItemFormData) => {
        await onSubmit({ ...data, chapter: chapterId });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Lesson' : 'Add New Lesson'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input {...register('title', { required: true })} placeholder="e.g., Intro to Safety" />
                        </div>
                        <div className="space-y-2">
                            <Label>Estimated Time (min)</Label>
                            <Input type="number" {...register('estimated_duration')} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Content Type</Label>
                        <Controller
                            name="type"
                            control={control}
                            rules={{ required: true }}
                            render={({ field }) => (
                                <Select 
                                    onValueChange={(val: ContentType) => field.onChange(val)} 
                                    value={field.value || 'VIDEO'}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select content type" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white z-[200]">
                                        <SelectItem value="VIDEO">Video (YouTube)</SelectItem>
                                        <SelectItem value="TEXT">Text Article</SelectItem>
                                        <SelectItem value="FILE">Downloadable File</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    {selectedType === 'VIDEO' && (
                        <div className="space-y-2">
                            <Label>YouTube URL</Label>
                            <Input {...register('video_url')} placeholder="https://youtube.com/watch?v=..." />
                        </div>
                    )}

                    {selectedType === 'TEXT' && (
                        <div className="space-y-2">
                            <Label>Article Content</Label>
                            <div className="min-h-[300px]">
                                <RichTextEditor 
                                    value={textContent || ''} 
                                    onChange={(val) => setValue('text_content', val)} 
                                />
                            </div>
                        </div>
                    )}

                    {selectedType === 'FILE' && (
                        <div className="space-y-2">
                            <Label>Upload File</Label>
                            <Input 
                                type="file" 
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if(file) setValue('file_upload', file);
                                }} 
                            />
                            {initialData?.file_upload && (
                                <p className="text-xs text-green-600 mt-1">Current file exists. Upload new to replace.</p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="mr-2">Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Lesson'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}