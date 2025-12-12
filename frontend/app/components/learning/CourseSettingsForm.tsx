'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { learningApi } from '@/lib/learning-api';
import { Course, CourseFormData, LearningCategory } from '@/types/learning';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import toast from 'react-hot-toast';

interface Props {
    initialData?: Course;
    isEditing?: boolean;
}

export default function CourseSettingsForm({ initialData, isEditing = false }: Props) {
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
            cover_image: null
        }
    });

    // Watch roles to handle the checkbox logic
    const selectedRoles = watch('visible_to_roles') || [];

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

    const onSubmit = async (data: CourseFormData) => {
        setUploading(true);
        try {
            if (isEditing && initialData) {
                await learningApi.updateCourse(initialData.slug, data);
                toast.success('Course updated successfully');
            } else {
                await learningApi.createCourse(data);
                toast.success('Course created successfully');
                router.push('/admin/super/knowledge/courses');
            }
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to save course');
        } finally {
            setUploading(false);
        }
    };

    const toggleRole = (role: string) => {
        const current = selectedRoles;
        if (current.includes(role)) {
            setValue('visible_to_roles', current.filter(r => r !== role));
        } else {
            setValue('visible_to_roles', [...current, role]);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Course Title</Label>
                        <Input 
                            id="title" 
                            {...register('title', { required: 'Title is required' })} 
                        />
                        {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea 
                            id="description" 
                            className="h-32"
                            {...register('description', { required: 'Description is required' })} 
                        />
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

            <Card>
                <CardHeader>
                    <CardTitle>Visibility & Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Status */}
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select 
                            onValueChange={(val: any) => setValue('status', val)}
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

            <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={uploading}>
                    {uploading ? 'Saving...' : isEditing ? 'Update Course' : 'Create Course'}
                </Button>
            </div>
        </form>
    );
}