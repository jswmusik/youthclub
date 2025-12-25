'use client';

import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { learningApi } from '@/lib/learning-api';
import { Course, CourseFormData, LearningCategory } from '@/types/learning';
import { 
    ArrowLeft, BookOpen, FileText, Image, Upload, X, Users, Eye, 
    CheckCircle2, Lightbulb, Save, Clock, Star, Calendar, FolderOpen
} from 'lucide-react';
import Toast from '../Toast';

interface Props {
    initialData?: Course;
    isEditing?: boolean;
    hideActions?: boolean;
    basePath?: string;
}

export interface CourseSettingsFormRef {
    handleSave: (exitAfter: boolean) => Promise<void>;
}

// Helper to format datetime for input (datetime-local format: YYYY-MM-DDTHH:mm)
const formatDateTimeForInput = (dateString?: string | null): string => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
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

const ROLES = [
    { id: 'MUNICIPALITY_ADMIN', label: 'Municipality Admins', icon: '🏛️' },
    { id: 'CLUB_ADMIN', label: 'Club Admins', icon: '🏢' },
];

const CourseSettingsForm = forwardRef<CourseSettingsFormRef, Props>(
    ({ initialData, isEditing = false, hideActions = false, basePath = '/admin/super/knowledge' }, ref) => {
    const router = useRouter();
    const [categories, setCategories] = useState<LearningCategory[]>([]);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error', isVisible: false });
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [isProgressFixed, setIsProgressFixed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const progressPlaceholderRef = useRef<HTMLDivElement>(null);
    const coverImageRef = useRef<HTMLInputElement>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(initialData?.cover_image || null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    
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

    const selectedRoles = watch('visible_to_roles') || [];
    const isRecommended = watch('is_recommended');
    const status = watch('status');
    const publishedAt = watch('published_at');
    const title = watch('title');
    const description = watch('description');

    // Track component mount for portal
    useEffect(() => {
        setIsMounted(true);
        return () => setIsMounted(false);
    }, []);

    useEffect(() => {
        const loadCats = async () => {
            try {
                const res = await learningApi.getCategories();
                const data = res.data as any;
                const categoriesData = Array.isArray(data) ? data : (data?.results || []);
                setCategories(categoriesData);
            } catch (err) {
                console.error("Failed to load categories");
            }
        };
        loadCats();
    }, []);

    const calculateCompletion = useCallback(() => {
        const requiredFields = [title, description];
        const filled = requiredFields.filter(f => f && f.toString().trim()).length;
        return Math.round((filled / requiredFields.length) * 100);
    }, [title, description]);

    const completionPercent = calculateCompletion();

    const checkScroll = useCallback(() => {
        if (!progressPlaceholderRef.current) return;
        const rect = progressPlaceholderRef.current.getBoundingClientRect();
        const mainElement = document.querySelector('main');
        const headerHeight = mainElement ? 0 : 64;
        setIsProgressFixed(rect.top < headerHeight);
    }, []);

    useEffect(() => {
        const mainElement = document.querySelector('main');
        if (mainElement) mainElement.addEventListener('scroll', checkScroll);
        window.addEventListener('scroll', checkScroll);
        checkScroll();
        return () => {
            if (mainElement) mainElement.removeEventListener('scroll', checkScroll);
            window.removeEventListener('scroll', checkScroll);
        };
    }, [checkScroll]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setCoverFile(e.target.files[0]);
            setCoverPreview(URL.createObjectURL(e.target.files[0]));
            setValue('cover_image', e.target.files[0]);
        }
    };

    const handleRemoveImage = () => {
        setCoverFile(null);
        setCoverPreview(null);
        setValue('cover_image', null);
        if (coverImageRef.current) coverImageRef.current.value = '';
    };

    const onSubmit = async (data: CourseFormData, exitAfter: boolean = false) => {
        setUploading(true);
        try {
            const submitData = { ...data };
            if (submitData.status === 'SCHEDULED' && submitData.published_at) {
                const dateStr = submitData.published_at;
                if (dateStr && dateStr.includes('T')) {
                    submitData.published_at = new Date(dateStr).toISOString();
                } else {
                    setToast({ message: 'Please select a publication date and time for scheduled courses', type: 'error', isVisible: true });
                    setUploading(false);
                    return;
                }
            } else {
                submitData.published_at = null;
            }

            // Handle cover image upload
            if (coverFile) {
                submitData.cover_image = coverFile;
            }

            if (isEditing && initialData) {
                await learningApi.updateCourse(initialData.slug, submitData);
                setToast({ message: 'Course updated successfully!', type: 'success', isVisible: true });
                if (exitAfter) {
                    setTimeout(() => router.push(`${basePath}/courses`), 1000);
                }
            } else {
                const response = await learningApi.createCourse(submitData);
                const createdCourse = response.data;
                setToast({ message: 'Course created successfully!', type: 'success', isVisible: true });
                setTimeout(() => router.push(`${basePath}/courses/${createdCourse.slug}/edit?tab=curriculum`), 1000);
            }
        } catch (error: any) {
            console.error(error);
            setToast({ message: 'Failed to save course', type: 'error', isVisible: true });
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

    const handleStatusChange = (val: string) => {
        setValue('status', val as 'DRAFT' | 'SCHEDULED' | 'PUBLISHED');
        if (val !== 'SCHEDULED') {
            setValue('published_at', null);
        } else if (!publishedAt) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            setValue('published_at', formatDateTimeForInput(tomorrow.toISOString()));
        }
    };

    const labelClasses = "block text-sm font-medium text-[var(--brand-light)]/70 mb-2";
    
    const inputClasses = (field: string) => `
        w-full h-11 px-4 rounded-xl
        bg-[var(--dark-700)] border-2 
        ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
        text-[var(--brand-light)] placeholder-[var(--brand-light)]/30
        outline-none transition-all duration-200
        hover:border-[var(--brand-primary)]/50
        focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
    `;

    const textareaClasses = (field: string) => `
        w-full px-4 py-3 rounded-xl resize-none
        bg-[var(--dark-700)] border-2 
        ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
        text-[var(--brand-light)] placeholder-[var(--brand-light)]/30
        outline-none transition-all duration-200
        hover:border-[var(--brand-primary)]/50
        focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
    `;

    const selectClasses = (field: string) => `
        w-full h-11 px-4 rounded-xl appearance-none cursor-pointer
        bg-[var(--dark-700)] border-2 
        ${focusedField === field ? 'border-[var(--brand-primary)]' : 'border-[var(--dark-500)]'}
        text-[var(--brand-light)]
        outline-none transition-all duration-200
        hover:border-[var(--brand-primary)]/50
        focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20
    `;

    const selectArrowStyle = {
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F9F8F5' opacity='0.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.75rem center',
        backgroundSize: '1rem'
    };

    return (
        <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
            <div className="sm:max-w-4xl sm:mx-auto sm:px-6">
                
                {/* Header - Only show when not in edit mode with hideActions */}
                {!hideActions && (
                    <div className="flex items-center gap-4 mb-6 sm:mb-8 px-4 sm:px-0">
                        <Link 
                            href={`${basePath}/courses`}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                                {isEditing ? 'Edit Course' : 'Create New Course'}
                            </h1>
                            <p className="text-[var(--brand-light)]/50 text-sm mt-1">
                                {isEditing 
                                    ? 'Update course information and settings' 
                                    : 'Define the basic information for your course'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Progress Indicator */}
                {!hideActions && (
                    <div ref={progressPlaceholderRef} className="mb-6 sm:mb-8" style={{ minHeight: isProgressFixed ? 72 : 'auto' }}>
                        <div className={`bg-[var(--dark-800)] backdrop-blur-sm rounded-none sm:rounded-2xl p-4 border-y sm:border border-[var(--dark-600)] transition-opacity duration-200 ${isProgressFixed ? 'opacity-0' : 'opacity-100'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-[var(--brand-light)]/60">Required fields</span>
                                <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
                            </div>
                            <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out" style={{ width: `${completionPercent}%` }} />
                            </div>
                            {completionPercent === 100 && (
                                <div className="flex items-center gap-2 mt-3 text-[var(--brand-third)]">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-sm font-medium">Ready to create!</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Fixed Progress */}
                {!hideActions && isMounted && createPortal(
                    <div className={`fixed z-[9999] left-0 right-0 bg-[var(--dark-800)]/95 backdrop-blur-sm border-b border-[var(--dark-600)] shadow-lg transition-all duration-200 top-16 md:top-0 ${isProgressFixed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
                        <div className="w-full md:max-w-4xl md:mx-auto px-4 md:px-6 py-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-[var(--brand-light)]/60">Required fields</span>
                                <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
                            </div>
                            <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out" style={{ width: `${completionPercent}%` }} />
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                <form onSubmit={handleSubmit((data) => onSubmit(data, true))}>
                    
                    {/* Basic Information Card */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">Basic Information</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">Enter the course title and description</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Title */}
                            <div>
                                <label className={labelClasses}>Course Title <span className="text-[var(--brand-red)]">*</span></label>
                                <input 
                                    type="text"
                                    placeholder="Enter a compelling title..."
                                    className={inputClasses('title')}
                                    {...register('title', { required: 'Title is required' })} 
                                    onFocus={() => setFocusedField('title')}
                                    onBlur={() => setFocusedField(null)}
                                />
                                {errors.title && <p className="text-[var(--brand-red)] text-sm mt-1">{errors.title.message}</p>}
                                <p className="text-xs text-[var(--brand-light)]/40 mt-2">A clear, engaging title helps users find your course</p>
                            </div>

                            {/* Description */}
                            <div>
                                <label className={labelClasses}>Description <span className="text-[var(--brand-red)]">*</span></label>
                                <textarea 
                                    rows={4}
                                    placeholder="Describe what this course covers..."
                                    className={textareaClasses('description')}
                                    {...register('description', { required: 'Description is required' })} 
                                    onFocus={() => setFocusedField('description')}
                                    onBlur={() => setFocusedField(null)}
                                />
                                {errors.description && <p className="text-[var(--brand-red)] text-sm mt-1">{errors.description.message}</p>}
                                <p className="text-xs text-[var(--brand-light)]/40 mt-2">This appears in course previews and search results</p>
                            </div>

                            {/* Category */}
                            <div>
                                <label className={labelClasses}>Category</label>
                                <div className="relative">
                                    <select 
                                        className={selectClasses('category')}
                                        style={selectArrowStyle}
                                        onChange={(e) => setValue('category', e.target.value ? parseInt(e.target.value) : null)}
                                        defaultValue={initialData?.category?.toString() || ''}
                                        onFocus={() => setFocusedField('category')}
                                        onBlur={() => setFocusedField(null)}
                                    >
                                        <option value="">Select category...</option>
                                        {Array.isArray(categories) && categories.map(cat => (
                                            <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Link href={`${basePath}/categories`} className="text-xs text-[var(--brand-primary)] hover:underline flex items-center gap-1">
                                        <FolderOpen className="w-3 h-3" /> Manage categories
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cover Image Card */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
                        <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-primary)] flex items-center justify-center">
                                    <Image className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">Cover Image</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">Featured image for the course</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="flex flex-col sm:flex-row gap-4 items-start">
                                <div 
                                    className="relative group w-full sm:w-64 h-40 border-2 border-dashed border-[var(--dark-500)] rounded-xl bg-[var(--dark-700)] flex items-center justify-center overflow-hidden hover:border-[var(--brand-primary)]/50 transition-all cursor-pointer flex-shrink-0"
                                    onClick={() => coverImageRef.current?.click()}
                                >
                                    {coverPreview ? (
                                        <>
                                            <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Upload className="h-6 w-6 text-white" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-4">
                                            <Image className="h-8 w-8 text-[var(--brand-light)]/30 mx-auto mb-2" />
                                            <span className="text-sm text-[var(--brand-light)]/40">Click to upload</span>
                                            <p className="text-xs text-[var(--brand-light)]/30 mt-1">16:9 ratio</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => coverImageRef.current?.click()} className="px-4 py-2.5 bg-[var(--dark-600)] text-[var(--brand-light)] text-sm font-medium rounded-xl hover:bg-[var(--dark-500)] transition-all">
                                            Choose File
                                        </button>
                                        {coverPreview && (
                                            <button type="button" onClick={handleRemoveImage} className="px-4 py-2.5 bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-sm font-medium rounded-xl hover:bg-[var(--brand-red)]/30 transition-all flex items-center gap-2">
                                                <X className="h-4 w-4" /> Remove
                                            </button>
                                        )}
                                    </div>
                                    <div className="bg-[var(--dark-700)] rounded-xl p-3 border border-[var(--dark-500)]">
                                        <div className="flex items-start gap-2">
                                            <Lightbulb className="w-4 h-4 text-[var(--brand-peach)] flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-[var(--brand-light)]/50">High-quality images (16:9 ratio) work best for course covers.</p>
                                        </div>
                                    </div>
                                </div>
                                <input ref={coverImageRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </div>
                        </div>
                    </div>

                    {/* Publication Status Card */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
                        <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-third)] to-[var(--brand-green)] flex items-center justify-center">
                                    <Eye className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">Publication Status</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">Control when and how this course is published</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Status Selection */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Draft */}
                                <div 
                                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${status === 'DRAFT' ? 'bg-[var(--dark-600)]/50 border-[var(--brand-light)]/30' : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--dark-400)]'}`}
                                    onClick={() => handleStatusChange('DRAFT')}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status === 'DRAFT' ? 'bg-[var(--dark-500)]' : 'bg-[var(--dark-600)]'}`}>
                                        <FileText className={`w-5 h-5 ${status === 'DRAFT' ? 'text-[var(--brand-light)]' : 'text-[var(--brand-light)]/40'}`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-[var(--brand-light)]">Draft</h3>
                                        <p className="text-xs text-[var(--brand-light)]/50">Hidden from users</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${status === 'DRAFT' ? 'bg-[var(--brand-light)] border-[var(--brand-light)]' : 'border-[var(--dark-400)]'}`}>
                                        {status === 'DRAFT' && <CheckCircle2 className="w-3 h-3 text-[var(--dark-900)]" />}
                                    </div>
                                </div>

                                {/* Scheduled */}
                                <div 
                                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${status === 'SCHEDULED' ? 'bg-[var(--brand-peach)]/10 border-[var(--brand-peach)]/30' : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--dark-400)]'}`}
                                    onClick={() => handleStatusChange('SCHEDULED')}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status === 'SCHEDULED' ? 'bg-[var(--brand-peach)]/20' : 'bg-[var(--dark-600)]'}`}>
                                        <Calendar className={`w-5 h-5 ${status === 'SCHEDULED' ? 'text-[var(--brand-peach)]' : 'text-[var(--brand-light)]/40'}`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-[var(--brand-light)]">Scheduled</h3>
                                        <p className="text-xs text-[var(--brand-light)]/50">Publish later</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${status === 'SCHEDULED' ? 'bg-[var(--brand-peach)] border-[var(--brand-peach)]' : 'border-[var(--dark-400)]'}`}>
                                        {status === 'SCHEDULED' && <CheckCircle2 className="w-3 h-3 text-white" />}
                                    </div>
                                </div>

                                {/* Published */}
                                <div 
                                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${status === 'PUBLISHED' ? 'bg-[var(--brand-green)]/10 border-[var(--brand-green)]/30' : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--dark-400)]'}`}
                                    onClick={() => handleStatusChange('PUBLISHED')}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status === 'PUBLISHED' ? 'bg-[var(--brand-green)]/20' : 'bg-[var(--dark-600)]'}`}>
                                        <Eye className={`w-5 h-5 ${status === 'PUBLISHED' ? 'text-[var(--brand-green)]' : 'text-[var(--brand-light)]/40'}`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-[var(--brand-light)]">Published</h3>
                                        <p className="text-xs text-[var(--brand-light)]/50">Visible now</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${status === 'PUBLISHED' ? 'bg-[var(--brand-green)] border-[var(--brand-green)]' : 'border-[var(--dark-400)]'}`}>
                                        {status === 'PUBLISHED' && <CheckCircle2 className="w-3 h-3 text-white" />}
                                    </div>
                                </div>
                            </div>

                            {/* Scheduled Date & Time */}
                            {status === 'SCHEDULED' && (
                                <div className="bg-[var(--brand-peach)]/10 rounded-xl p-4 border border-[var(--brand-peach)]/20">
                                    <label className="block text-sm font-medium text-[var(--brand-peach)] mb-2 flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> Schedule Publication
                                    </label>
                                    <input 
                                        type="datetime-local" 
                                        value={publishedAt || ''}
                                        onChange={(e) => setValue('published_at', e.target.value)}
                                        min={new Date().toISOString().slice(0, 16)}
                                        className="w-full h-11 px-4 rounded-xl bg-[var(--dark-700)] border-2 border-[var(--dark-500)] text-[var(--brand-light)] outline-none focus:border-[var(--brand-peach)] transition-all"
                                    />
                                    <p className="text-xs text-[var(--brand-peach)]/70 mt-2">
                                        The course will be automatically published at the selected date and time.
                                    </p>
                                </div>
                            )}

                            {/* Recommended Toggle */}
                            <div 
                                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${isRecommended ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30' : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--dark-400)]'}`}
                                onClick={() => setValue('is_recommended', !isRecommended)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isRecommended ? 'bg-[var(--brand-primary)]/20' : 'bg-[var(--dark-600)]'}`}>
                                        <Star className={`w-5 h-5 ${isRecommended ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-light)]/40'}`} />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-[var(--brand-light)]">Recommended Course</h3>
                                        <p className="text-xs text-[var(--brand-light)]/50">{isRecommended ? 'Featured in recommendations' : 'Show in "Recommended for You"'}</p>
                                    </div>
                                </div>
                                <div className={`w-12 h-7 rounded-full p-1 transition-all ${isRecommended ? 'bg-[var(--brand-primary)]' : 'bg-[var(--dark-500)]'}`}>
                                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isRecommended ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Target Audience Card */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
                        <div className="px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-purple)] flex items-center justify-center">
                                    <Users className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">Target Audience</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">Choose who can see this course</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-3">
                            {/* All Admins Option */}
                            <div 
                                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedRoles.length === 0 ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30' : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--dark-400)]'}`}
                                onClick={() => setValue('visible_to_roles', [])}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🌍</span>
                                    <div>
                                        <h3 className="font-medium text-[var(--brand-light)]">All Admins</h3>
                                        <p className="text-xs text-[var(--brand-light)]/50">Visible to all admin types</p>
                                    </div>
                                </div>
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedRoles.length === 0 ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' : 'border-[var(--dark-400)]'}`}>
                                    {selectedRoles.length === 0 && <CheckCircle2 className="w-4 h-4 text-white" />}
                                </div>
                            </div>

                            {/* Specific Roles */}
                            <div className="space-y-2 pt-2">
                                <p className="text-xs text-[var(--brand-light)]/40 mb-3">Or restrict to specific admin types:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {ROLES.map(role => (
                                        <div 
                                            key={role.id}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedRoles.includes(role.id) ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30' : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--dark-400)]'}`}
                                            onClick={() => toggleRole(role.id)}
                                        >
                                            <span className="text-lg">{role.icon}</span>
                                            <span className="flex-1 text-sm text-[var(--brand-light)]">{role.label}</span>
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedRoles.includes(role.id) ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' : 'border-[var(--dark-400)]'}`}>
                                                {selectedRoles.includes(role.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tips */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
                        <div className="px-6 py-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[var(--brand-peach)]/20 flex items-center justify-center flex-shrink-0">
                                    <Lightbulb className="w-4 h-4 text-[var(--brand-peach)]" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-[var(--brand-light)] mb-1">Quick Tips</h3>
                                    <ul className="text-xs text-[var(--brand-light)]/50 space-y-1">
                                        <li>• Keep titles clear and descriptive</li>
                                        <li>• Write descriptions that explain what users will learn</li>
                                        <li>• After creating, you'll be redirected to add course content</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    {!hideActions && (
                        <div className="px-4 sm:px-0 pb-8">
                            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                                <button 
                                    type="button" 
                                    onClick={() => router.push(`${basePath}/courses`)} 
                                    className="w-full sm:w-auto px-6 py-3 rounded-xl text-[var(--brand-light)]/70 bg-[var(--dark-700)] border border-[var(--dark-500)] hover:bg-[var(--dark-600)] font-medium transition-all"
                                >
                                    Cancel
                                </button>
                                
                                {isEditing && (
                                    <button 
                                        type="button" 
                                        disabled={uploading}
                                        onClick={handleSubmit((data) => onSubmit(data, false))}
                                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--dark-600)] text-[var(--brand-light)] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--dark-500)]"
                                    >
                                        {uploading ? 'Saving...' : 'Save & Continue Editing'}
                                    </button>
                                )}
                                
                                <button 
                                    type="submit" 
                                    disabled={uploading || completionPercent < 100}
                                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {uploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-[var(--dark-900)]/30 border-t-[var(--dark-900)] rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            {isEditing ? 'Save & Exit' : 'Create Course'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} darkMode />
            </div>
        </div>
    );
});

CourseSettingsForm.displayName = 'CourseSettingsForm';

export default CourseSettingsForm;
