'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { learningApi } from '@/lib/learning-api';
import { Course, CourseFormData, LearningCategory } from '@/types/learning';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import toast from 'react-hot-toast';

interface Props {
    initialData?: Course;
    isEditing?: boolean;
    hideActions?: boolean;
}

export interface CourseSettingsFormRef {
    handleSave: (exitAfter: boolean) => Promise<void>;
}

// Helper to format datetime for input (datetime-local format: YYYY-MM-DDTHH:mm)
const formatDateTimeForInput = (dateString?: string | null): string => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        // Format to YYYY-MM-DDTHH:mm
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
        return '';
    }
};

const CourseSettingsForm = forwardRef<CourseSettingsFormRef, Props>(
    ({ initialData, isEditing = false, hideActions = false }, ref) => {
    const router = useRouter();
    const [categories, setCategories] = useState<LearningCategory[]>([]);
    const [uploading, setUploading] = useState(false);
    
    // Form State
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CourseFormData>({
        defaultValues: {
            title: initialData?.title || '',
            description: initialData?.description || '',
            category: initialData?.category || null,
            visible_to_roles: initialData?.visible_to_roles || [],
            status: initialData?.status || 'DRAFT',
            published_at: initialData?.published_at ? formatDateTimeForInput(initialData.published_at) : '',
            is_recommended: initialData?.is_recommended || false,
            cover_image: null
        }
    });

    // Watch roles to handle the checkbox logic
    const selectedRoles = watch('visible_to_roles') || [];
    const isRecommended = watch('is_recommended');
    const status = watch('status');
    const publishedAt = watch('published_at');

    useEffect(() => {
        const loadCats = async () => {
            try {
                const res = await learningApi.getCategories();
                // Handle paginated response (DRF returns {results: [...]}) or direct array
                const data = res.data as any;
                const categoriesData = Array.isArray(data) ? data : (data?.results || []);
                setCategories(categoriesData);
            } catch (err) {
                console.error("Failed to load categories");
            }
        };
        loadCats();
    }, []);

    const onSubmit = async (data: CourseFormData, exitAfter: boolean = false) => {
        setUploading(true);
        try {
            // Convert datetime-local format to ISO string for backend
            const submitData = { ...data };
            if (submitData.status === 'SCHEDULED' && submitData.published_at) {
                // Convert from YYYY-MM-DDTHH:mm to ISO string
                const dateStr = submitData.published_at;
                if (dateStr && dateStr.includes('T')) {
                    // Create Date object and convert to ISO string
                    submitData.published_at = new Date(dateStr).toISOString();
                } else {
                    toast.error('Please select a publication date and time for scheduled courses');
                    setUploading(false);
                    return;
                }
            } else {
                // Clear published_at if not scheduled
                submitData.published_at = null;
            }

            if (isEditing && initialData) {
                await learningApi.updateCourse(initialData.slug, submitData);
                toast.success('Course updated successfully');
                if (exitAfter) router.push('/admin/super/knowledge/courses');
            } else {
                const response = await learningApi.createCourse(submitData);
                const createdCourse = response.data;
                toast.success('Course created successfully');
                // Redirect to edit page with curriculum tab active
                router.push(`/admin/super/knowledge/courses/${createdCourse.slug}/edit?tab=curriculum`);
            }
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to save course');
        } finally {
            setUploading(false);
        }
    };

    // Expose handleSave method via ref
    useImperativeHandle(ref, () => ({
        handleSave: async (exitAfter: boolean) => {
            return new Promise<void>((resolve, reject) => {
                handleSubmit(async (data) => {
                    try {
                        await onSubmit(data, exitAfter);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                })();
            });
        }
    }));

    const toggleRole = (role: string) => {
        const current = selectedRoles;
        if (current.includes(role)) {
            setValue('visible_to_roles', current.filter(r => r !== role));
        } else {
            setValue('visible_to_roles', [...current, role]);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header - Only show when not in edit mode with hideActions */}
            {!hideActions && (
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-[#121213]">
                        {isEditing ? 'Edit Course' : 'Create New Course'}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {isEditing 
                            ? 'Update course information and settings.' 
                            : 'Start by defining the basic information for your course.'}
                    </p>
                </div>
            )}

            {/* Basic Information */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Enter the course title, description, and category.</CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6 space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Course Title <span className="text-red-500">*</span></Label>
                        <Input 
                            id="title" 
                            {...register('title', { required: 'Title is required' })} 
                        />
                        {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
                        <Textarea 
                            id="description" 
                            className="h-32"
                            {...register('description', { required: 'Description is required' })} 
                        />
                        {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select 
                            onValueChange={(val: string) => setValue('category', parseInt(val))}
                            defaultValue={initialData?.category?.toString()}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.isArray(categories) ? categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id.toString()}>
                                        {cat.name}
                                    </SelectItem>
                                )) : null}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Cover Image */}
                    <div className="space-y-2">
                        <Label>Cover Image</Label>
                        <Input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setValue('cover_image', file);
                            }}
                        />
                        {initialData?.cover_image && (
                            <div className="mt-2">
                                <p className="text-sm text-gray-500 mb-1">Current Image:</p>
                                <img src={initialData.cover_image} alt="Current Cover" className="h-24 rounded border" />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Visibility, Recommendations & Status */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle>Visibility, Recommendations & Status</CardTitle>
                    <CardDescription>Configure who can see this course and its publication status.</CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6 space-y-6">
                    {/* Status */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select 
                                onValueChange={(val: any) => {
                                    setValue('status', val);
                                    // Clear published_at if not scheduled
                                    if (val !== 'SCHEDULED') {
                                        setValue('published_at', null);
                                    } else if (!publishedAt) {
                                        // Set default to tomorrow if scheduling
                                        const tomorrow = new Date();
                                        tomorrow.setDate(tomorrow.getDate() + 1);
                                        tomorrow.setHours(9, 0, 0, 0); // 9 AM default
                                        setValue('published_at', formatDateTimeForInput(tomorrow.toISOString()));
                                    }
                                }}
                                defaultValue={initialData?.status || 'DRAFT'}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DRAFT">Draft (Hidden)</SelectItem>
                                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                                    <SelectItem value="PUBLISHED">Published (Visible)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Scheduled Date & Time - Only show when SCHEDULED */}
                        {status === 'SCHEDULED' && (
                            <div className="space-y-2 p-4 border border-gray-200 rounded-lg bg-blue-50/30">
                                <Label>Schedule Publication Date & Time <span className="text-red-500">*</span></Label>
                                <Input 
                                    type="datetime-local" 
                                    value={publishedAt || ''}
                                    onChange={(e) => setValue('published_at', e.target.value)}
                                    min={new Date().toISOString().slice(0, 16)} // Prevent past dates
                                    className="bg-white"
                                />
                                <p className="text-xs text-gray-500">
                                    The course will be automatically published at the selected date and time.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Recommended Checkbox */}
                    <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                        <Checkbox 
                            id="is_recommended" 
                            checked={isRecommended}
                            onCheckedChange={(checked) => setValue('is_recommended', checked as boolean)}
                            className="mt-0.5"
                        />
                        <div className="grid gap-1.5 leading-none flex-1">
                            <Label htmlFor="is_recommended" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Recommended Course
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                This course will appear in the "Recommended for You" section.
                            </p>
                        </div>
                    </div>

                    {/* Roles */}
                    <div className="space-y-3">
                        <Label>Visible To (Leave empty for All Admins)</Label>
                        <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="role_muni" 
                                    checked={selectedRoles.includes('MUNICIPALITY_ADMIN')}
                                    onCheckedChange={() => toggleRole('MUNICIPALITY_ADMIN')}
                                />
                                <Label htmlFor="role_muni">Municipality Admins</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="role_club" 
                                    checked={selectedRoles.includes('CLUB_ADMIN')}
                                    onCheckedChange={() => toggleRole('CLUB_ADMIN')}
                                />
                                <Label htmlFor="role_club">Club Admins</Label>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            {!hideActions && (
                <div className="flex justify-end gap-3 pb-10">
                    <Button 
                        variant="ghost" 
                        type="button" 
                        onClick={() => router.back()}
                    >
                        Cancel
                    </Button>
                    
                    {isEditing && (
                        <Button 
                            type="button" 
                            variant="secondary" 
                            disabled={uploading}
                            onClick={handleSubmit((data) => onSubmit(data, false))}
                        >
                            {uploading ? 'Saving...' : 'Save & Continue Editing'}
                        </Button>
                    )}
                    
                    <Button 
                        type="button" 
                        disabled={uploading}
                        onClick={handleSubmit((data) => onSubmit(data, true))}
                        className="bg-[#4D4DA4] hover:bg-[#FF5485] text-white min-w-[150px]"
                    >
                        {uploading ? 'Saving...' : (isEditing ? 'Save & Exit' : 'Create Course')}
                    </Button>
                </div>
            )}
        </div>
    );
});

CourseSettingsForm.displayName = 'CourseSettingsForm';

export default CourseSettingsForm;