'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
    ArrowLeft, Upload, X, Globe, Building, Users, FileText, Image, Video,
    CheckCircle2, Lightbulb, Sparkles, Bell, MessageSquare, Pin, Calendar,
    Eye, EyeOff, Target, Settings, Send
} from 'lucide-react';
import api from '../../../lib/api';
import { Post, PostImage } from '../../../types/post';
import PostRichTextEditor from './PostRichTextEditor';
import { getMediaUrl } from '../../utils';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../context/AuthContext';
import { createPostSchema, PostFormData } from '../../../lib/validations/post';

interface PostFormProps {
    initialData?: Post;
    role: 'super' | 'municipality' | 'club';
    onSuccess: () => void;
}

export default function PostForm({ initialData, role, onSuccess }: PostFormProps) {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const t = useTranslations('postsManager.form');
    const progressPlaceholderRef = useRef<HTMLDivElement>(null);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { success, error: showError, info, warning } = useToast();
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [isProgressFixed, setIsProgressFixed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // --- Dynamic Data ---
    const [municipalities, setMunicipalities] = useState<any[]>([]);
    const [clubs, setClubs] = useState<any[]>([]);
    const [availableGroups, setAvailableGroups] = useState<any[]>([]);
    const [availableInterests, setAvailableInterests] = useState<any[]>([]);
    const [availableCustomFields, setAvailableCustomFields] = useState<any[]>([]);

    // Initialize React Hook Form with validation
    const { register, handleSubmit: handleFormSubmit, formState: { errors }, watch, setValue, control } = useForm<PostFormData>({
        resolver: zodResolver(createPostSchema(t)),
        mode: 'onBlur', // Validate on blur
        defaultValues: {
            title: initialData?.title || '',
            content: initialData?.content || '',
            postType: initialData?.post_type || 'TEXT',
        }
    });

    // Watch form values
    const title = watch('title');
    const content = watch('content');
    const postType = watch('postType');

    // --- 1. Distribution (Scope) State ---
    const getInitialDistributionMode = (): 'GLOBAL' | 'MUNICIPALITY' | 'CLUB' => {
        if (initialData) {
            if (initialData.is_global && role === 'super') return 'GLOBAL';
            if (initialData.target_municipalities?.length) return 'MUNICIPALITY';
            return 'CLUB';
        }
        if (role === 'super') return 'GLOBAL';
        if (role === 'municipality') return 'MUNICIPALITY';
        return 'CLUB';
    };
    
    const [distributionMode, setDistributionMode] = useState<'GLOBAL' | 'MUNICIPALITY' | 'CLUB'>(getInitialDistributionMode());
    const [selectedMunis, setSelectedMunis] = useState<number[]>(initialData?.target_municipalities || []);
    const [selectedClubs, setSelectedClubs] = useState<number[]>(initialData?.target_clubs || []);
    const [muniScope, setMuniScope] = useState<'ALL' | 'SPECIFIC'>(
        (initialData?.target_clubs && initialData.target_clubs.length > 0) ? 'SPECIFIC' : 'ALL'
    );

    // --- Non-validated fields ---
    const [videoUrl, setVideoUrl] = useState(initialData?.video_url || '');
    const [existingImages, setExistingImages] = useState<PostImage[]>(initialData?.images || []);
    const [newImages, setNewImages] = useState<File[]>([]);
    const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);

    // --- 3. Status & Scheduling ---
    const [status, setStatus] = useState(initialData?.status || 'DRAFT');
    const [publishedAt, setPublishedAt] = useState(initialData?.published_at ? initialData.published_at.slice(0, 16) : '');
    const [visibilityEndDate, setVisibilityEndDate] = useState(initialData?.visibility_end_date ? initialData.visibility_end_date.slice(0, 16) : '');
    const [isPinned, setIsPinned] = useState(initialData?.is_pinned || false);

    // --- 4. Targeting (Audience) ---
    const [targetMode, setTargetMode] = useState<'GROUPS' | 'ATTRIBUTES'>(
        (initialData?.target_groups && initialData.target_groups.length > 0) ? 'GROUPS' : 'ATTRIBUTES'
    );
    const [selectedGroups, setSelectedGroups] = useState<number[]>(initialData?.target_groups || []);
    const [memberType, setMemberType] = useState(initialData?.target_member_type || 'BOTH');
    const [minAge, setMinAge] = useState(initialData?.target_min_age?.toString() || '');
    const [maxAge, setMaxAge] = useState(initialData?.target_max_age?.toString() || '');
    const [selectedGrades, setSelectedGrades] = useState<number[]>(initialData?.target_grades || []);
    const [selectedGenders, setSelectedGenders] = useState<string[]>(initialData?.target_genders || []);
    const [selectedInterests, setSelectedInterests] = useState<number[]>(initialData?.target_interests || []);
    const [customFieldRules, setCustomFieldRules] = useState<Record<string, any>>(initialData?.target_custom_fields || {});

    // --- 5. Settings ---
    const [allowComments, setAllowComments] = useState(initialData?.allow_comments ?? true);
    const [requireModeration, setRequireModeration] = useState(initialData?.require_moderation ?? false);
    const [allowReplies, setAllowReplies] = useState(initialData?.allow_replies ?? true);
    const [limitComments, setLimitComments] = useState(initialData?.limit_comments_per_user || 0);
    const [sendPush, setSendPush] = useState(initialData?.send_push_notification || false);
    const [pushTitle, setPushTitle] = useState(initialData?.push_title || '');
    const [pushMessage, setPushMessage] = useState(initialData?.push_message || '');

    // Track component mount for portal
    useEffect(() => {
        setIsMounted(true);
        return () => setIsMounted(false);
    }, []);

    // --- Data Fetching ---
    useEffect(() => {
        const loadData = async () => {
            try {
                const groupsRes = await api.get('/groups/');
                setAvailableGroups(Array.isArray(groupsRes.data) ? groupsRes.data : groupsRes.data.results || []);

                const interestsRes = await api.get('/interests/');
                setAvailableInterests(Array.isArray(interestsRes.data) ? interestsRes.data : interestsRes.data.results || []);

                const fieldsRes = await api.get('/custom-fields/');
                const allFields = Array.isArray(fieldsRes.data) ? fieldsRes.data : fieldsRes.data.results || [];
                setAvailableCustomFields(allFields.filter((f: any) => 
                    ['BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT'].includes(f.field_type)
                ));

                if (role === 'super') {
                    const muniRes = await api.get('/municipalities/');
                    setMunicipalities(Array.isArray(muniRes.data) ? muniRes.data : muniRes.data.results || []);
                    
                    const clubRes = await api.get('/clubs/?page_size=1000');
                    setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
                } 
                else if (role === 'municipality') {
                    const clubRes = await api.get('/clubs/?page_size=1000');
                    setClubs(Array.isArray(clubRes.data) ? clubRes.data : clubRes.data.results || []);
                }
            } catch (err) {
                console.error("Failed to load form data", err);
            }
        };
        loadData();
    }, [role]);

    // Progress calculation
    const calculateCompletion = useCallback(() => {
        const requiredFields = [title, content];
        const filled = requiredFields.filter(f => f && f.toString().trim()).length;
        return Math.round((filled / requiredFields.length) * 100);
    }, [title, content]);

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

    // --- Helpers ---
    const toggleSelection = (id: any, list: any[], setList: (l: any[]) => void) => {
        if (list.includes(id)) setList(list.filter(item => item !== id));
        else setList([...list, id]);
    };

    const handleCustomFieldChange = (fieldId: number, value: string) => {
        setCustomFieldRules(prev => ({
            ...prev,
            [fieldId]: value || undefined
        }));
    };

    const handleSubmit = async (data: PostFormData) => {
        setLoading(true);
        setError('');
        const formData = new FormData();

        formData.append('title', data.title);
        formData.append('content', data.content);
        formData.append('post_type', data.postType || 'TEXT');
        if (videoUrl) formData.append('video_url', videoUrl);

        let isGlobal = false;
        let targetMunis: number[] = [];
        let targetClubs: number[] = [];

        if (role === 'super') {
            if (distributionMode === 'GLOBAL') isGlobal = true;
            else if (distributionMode === 'MUNICIPALITY') targetMunis = selectedMunis;
            else targetClubs = selectedClubs;
        } 
        else if (role === 'municipality') {
            isGlobal = false;
            if (distributionMode === 'GLOBAL') {
                setError(t('toast.municipalityCannotCreateGlobal'));
                setLoading(false);
                return;
            }
            if (muniScope === 'ALL') {
                 const muniId = currentUser?.assigned_municipality 
                    ? (typeof currentUser.assigned_municipality === 'object' ? currentUser.assigned_municipality.id : currentUser.assigned_municipality)
                    : null;
                 if (muniId) targetMunis = [muniId];
            } else {
                targetClubs = selectedClubs;
            }
        } 
        else if (role === 'club') {
            isGlobal = false;
            const clubId = currentUser?.assigned_club
                ? (typeof currentUser.assigned_club === 'object' ? currentUser.assigned_club.id : currentUser.assigned_club)
                : null;
            if (clubId) targetClubs = [clubId];
        }

        formData.append('is_global', isGlobal.toString());
        targetMunis.forEach(id => formData.append('target_municipalities', id.toString()));
        targetClubs.forEach(id => formData.append('target_clubs', id.toString()));

        formData.append('status', status);
        if (status === 'SCHEDULED' && publishedAt) formData.append('published_at', new Date(publishedAt).toISOString());
        if (visibilityEndDate) formData.append('visibility_end_date', new Date(visibilityEndDate).toISOString());
        formData.append('is_pinned', isPinned ? 'true' : 'false');

        formData.append('target_member_type', memberType);
        if (targetMode === 'GROUPS') {
            selectedGroups.forEach(id => formData.append('target_groups', id.toString()));
            formData.append('target_grades', '[]');
            formData.append('target_genders', '[]');
            formData.append('target_custom_fields', '{}');
        } else {
            if (selectedGroups.length > 0) {
                 selectedGroups.forEach(id => formData.append('target_groups', id.toString()));
            }
            if (minAge) formData.append('target_min_age', minAge.toString());
            if (maxAge) formData.append('target_max_age', maxAge.toString());
            formData.append('target_grades', JSON.stringify(selectedGrades));
            formData.append('target_genders', JSON.stringify(selectedGenders));
            selectedInterests.forEach(id => formData.append('target_interests', id.toString()));
            formData.append('target_custom_fields', JSON.stringify(customFieldRules));
        }

        formData.append('allow_comments', allowComments ? 'true' : 'false');
        formData.append('require_moderation', requireModeration ? 'true' : 'false');
        formData.append('allow_replies', allowReplies ? 'true' : 'false');
        formData.append('limit_comments_per_user', limitComments.toString());
        formData.append('send_push_notification', sendPush ? 'true' : 'false');
        if (sendPush) {
            formData.append('push_title', pushTitle);
            formData.append('push_message', pushMessage);
        }

        newImages.forEach((file) => formData.append('uploaded_images', file));
        if (initialData && imagesToDelete.length > 0) {
            imagesToDelete.forEach((id) => formData.append('images_to_delete', id.toString()));
        }

        try {
            if (initialData) {
                await api.patch(`/posts/${initialData.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                success(t('toast.postUpdated'));
            } else {
                await api.post('/posts/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                success(t('toast.postCreated'));
            }
            setTimeout(() => onSuccess(), 1000);
        } catch (err: any) {
            console.error(err);
            let msg = t('toast.failedToSave');
            if (err.response?.data) {
               if (typeof err.response.data === 'string') msg = err.response.data;
               else if (err.response.data.detail) msg = err.response.data.detail;
               else msg = JSON.stringify(err.response.data);
            }
            setError(msg);
            showError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Access denied for non-super admins editing global posts
    if (initialData?.is_global && role !== 'super') {
        return (
            <div className="min-h-screen bg-[var(--dark-900)] py-8">
                <div className="sm:max-w-4xl sm:mx-auto sm:px-6">
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--brand-red)]/20 flex items-center justify-center mx-auto mb-4">
                            <EyeOff className="w-8 h-8 text-[var(--brand-red)]" />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--brand-light)] mb-2">{t('accessDenied.title')}</h2>
                        <p className="text-[var(--brand-light)]/60 mb-6">
                            {t('accessDenied.message')}
                        </p>
                        <button 
                            onClick={() => router.back()}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-purple)] transition-all"
                        >
                            <ArrowLeft className="w-4 h-4" /> {t('accessDenied.goBack')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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

    const getBasePath = () => {
        if (role === 'super') return '/admin/super/posts';
        if (role === 'municipality') return '/admin/municipality/posts';
        return '/admin/club/posts';
    };

    return (
        <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8">
            <div className="sm:max-w-4xl sm:mx-auto sm:px-6">
                
                {/* Header */}
                <div className="flex items-center gap-4 mb-6 sm:mb-8 px-4 sm:px-0">
                    <Link 
                        href={getBasePath()}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                            {initialData ? t('editTitle') : t('createTitle')}
                        </h1>
                        <p className="text-[var(--brand-light)]/50 text-sm mt-1">
                            {initialData ? t('editDescription') : t('createDescription')}
                        </p>
                    </div>
                </div>

                {/* Progress Indicator */}
                <div ref={progressPlaceholderRef} className="mb-6 sm:mb-8" style={{ minHeight: isProgressFixed ? 72 : 'auto' }}>
                    <div className={`bg-[var(--dark-800)] backdrop-blur-sm rounded-none sm:rounded-2xl p-4 border-y sm:border border-[var(--dark-600)] transition-opacity duration-200 ${isProgressFixed ? 'opacity-0' : 'opacity-100'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-[var(--brand-light)]/60">{t('progress.requiredFields')}</span>
                            <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
                        </div>
                        <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out" style={{ width: `${completionPercent}%` }} />
                        </div>
                        {completionPercent === 100 && (
                            <div className="flex items-center gap-2 mt-3 text-[var(--brand-third)]">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-sm font-medium">{t('progress.readyToPublish')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fixed Progress */}
                {isMounted && createPortal(
                    <div className={`fixed z-[9999] left-0 right-0 bg-[var(--dark-800)]/95 backdrop-blur-sm border-b border-[var(--dark-600)] shadow-lg transition-all duration-200 top-16 md:top-0 ${isProgressFixed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
                        <div className="w-full md:max-w-4xl md:mx-auto px-4 md:px-6 py-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-[var(--brand-light)]/60">{t('progress.requiredFields')}</span>
                                <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
                            </div>
                            <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out" style={{ width: `${completionPercent}%` }} />
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Error Message */}
                {error && (
                    <div className="mx-4 sm:mx-0 mb-6 bg-[var(--brand-red)]/10 border border-[var(--brand-red)]/30 text-[var(--brand-red)] p-4 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleFormSubmit(handleSubmit)}>

                    {/* --- POST CONTENT --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('postContent.title')}</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">{t('postContent.description')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-6">
                            {/* Title */}
                            <div>
                                <label className={labelClasses}>{t('postContent.titleLabel')} <span className="text-[var(--brand-red)]">*</span></label>
                                <input 
                                    type="text" 
                                    placeholder={t('postContent.titlePlaceholder')}
                                    className={inputClasses('title')}
                                    {...register('title')}
                                    onFocus={() => setFocusedField('title')}
                                    onBlur={(e) => {
                                        setFocusedField(null);
                                        register('title').onBlur(e);
                                    }}
                                />
                                {errors.title && (
                                    <p className="mt-2 text-sm text-[var(--brand-red)]">{errors.title.message}</p>
                                )}
                            </div>

                            {/* Content */}
                            <div>
                                <label className={labelClasses}>{t('postContent.contentLabel')} <span className="text-[var(--brand-red)]">*</span></label>
                                <Controller
                                    name="content"
                                    control={control}
                                    render={({ field }) => (
                                        <PostRichTextEditor 
                                            value={field.value} 
                                            onChange={(value) => {
                                                field.onChange(value);
                                                field.onBlur();
                                            }}
                                        />
                                    )}
                                />
                                <p className="text-xs text-[var(--brand-light)]/40 mt-2">
                                    {t('postContent.contentHint')}
                                </p>
                                {errors.content && (
                                    <p className="mt-2 text-sm text-[var(--brand-red)]">{errors.content.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- MEDIA TYPE --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-primary)] flex items-center justify-center">
                                    <Image className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('mediaType.title')}</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">{t('mediaType.description')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4">
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { type: 'TEXT', icon: FileText, label: t('mediaType.textOnly') },
                                    { type: 'IMAGE', icon: Image, label: t('mediaType.withImages') },
                                    { type: 'VIDEO', icon: Video, label: t('mediaType.withVideo') }
                                ].map(({ type, icon: Icon, label }) => (
                                    <button 
                                        key={type} 
                                        type="button" 
                                        onClick={() => setValue('postType', type as any)} 
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                                            postType === type 
                                                ? 'bg-[var(--brand-primary)] text-white' 
                                                : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                            
                            {postType === 'IMAGE' && (
                                <div className="space-y-4 pt-4 border-t border-[var(--dark-600)]">
                                    {existingImages.length > 0 && (
                                        <div className="flex gap-3 flex-wrap">
                                            {existingImages.map(img => (
                                                <div key={img.id} className="relative w-24 h-24 group rounded-xl overflow-hidden">
                                                    <img 
                                                        src={getMediaUrl(img.image) || ''} 
                                                        className={`w-full h-full object-cover ${imagesToDelete.includes(img.id) ? 'opacity-30' : ''}`} 
                                                        alt={`Post image ${img.id}`} 
                                                    />
                                                    {!imagesToDelete.includes(img.id) && (
                                                        <button 
                                                            type="button" 
                                                            onClick={() => toggleSelection(img.id, imagesToDelete, setImagesToDelete)} 
                                                            className="absolute top-1 right-1 w-6 h-6 bg-[var(--brand-red)] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div>
                                        <label className={labelClasses}>{t('mediaType.uploadImages')}</label>
                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                multiple 
                                                accept="image/*" 
                                                onChange={e => e.target.files && setNewImages(Array.from(e.target.files))}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="flex items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-[var(--dark-500)] bg-[var(--dark-700)]/50 hover:border-[var(--brand-primary)]/50 transition-colors">
                                                <Upload className="w-5 h-5 text-[var(--brand-light)]/40" />
                                                <span className="text-[var(--brand-light)]/60">
                                                    {newImages.length > 0 ? t('mediaType.filesSelected', { count: newImages.length }) : t('mediaType.clickOrDrag')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {postType === 'VIDEO' && (
                                <div className="pt-4 border-t border-[var(--dark-600)]">
                                    <label className={labelClasses}>{t('mediaType.youtubeUrl')}</label>
                                    <input 
                                        type="url" 
                                        placeholder={t('mediaType.youtubePlaceholder')}
                                        className={inputClasses('videoUrl')}
                                        value={videoUrl} 
                                        onChange={e => setVideoUrl(e.target.value)}
                                        onFocus={() => setFocusedField('videoUrl')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- DISTRIBUTION SCOPE --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-third)] flex items-center justify-center">
                                    <Globe className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('distributionScope.title')}</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">{t('distributionScope.description')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4">
                            {/* SUPER ADMIN UI */}
                            {role === 'super' && (
                                <>
                                    <div className="flex flex-wrap gap-3">
                                        {[
                                            { mode: 'GLOBAL', icon: Globe, label: t('distributionScope.global') },
                                            { mode: 'MUNICIPALITY', icon: Building, label: t('distributionScope.specificMunicipalities') },
                                            { mode: 'CLUB', icon: Users, label: t('distributionScope.specificClubs') }
                                        ].map(({ mode, icon: Icon, label }) => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => setDistributionMode(mode as any)}
                                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                                                    distributionMode === mode 
                                                        ? 'bg-[var(--brand-green)] text-white' 
                                                        : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/30'
                                                }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                    {distributionMode === 'MUNICIPALITY' && (
                                        <div className="bg-[var(--dark-700)] p-4 rounded-xl border border-[var(--dark-500)] max-h-48 overflow-y-auto">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {municipalities.map(m => (
                                                    <label key={m.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--dark-600)] cursor-pointer transition-colors">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedMunis.includes(m.id)} 
                                                            onChange={() => toggleSelection(m.id, selectedMunis, setSelectedMunis)}
                                                            className="w-4 h-4 rounded border-[var(--dark-400)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                                                        />
                                                        <span className="text-sm text-[var(--brand-light)]/80">{m.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {distributionMode === 'CLUB' && (
                                        <div className="bg-[var(--dark-700)] p-4 rounded-xl border border-[var(--dark-500)] max-h-48 overflow-y-auto">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {clubs.map(c => (
                                                    <label key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--dark-600)] cursor-pointer transition-colors">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedClubs.includes(c.id)} 
                                                            onChange={() => toggleSelection(c.id, selectedClubs, setSelectedClubs)}
                                                            className="w-4 h-4 rounded border-[var(--dark-400)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                                                        />
                                                        <span className="text-sm text-[var(--brand-light)]/80">{c.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* MUNICIPALITY ADMIN UI */}
                            {role === 'municipality' && (
                                <>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setMuniScope('ALL')}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                                                muniScope === 'ALL' 
                                                    ? 'bg-[var(--brand-green)] text-white' 
                                                    : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/30'
                                            }`}
                                        >
                                            <Building className="w-4 h-4" />
                                            {t('distributionScope.entireMunicipality')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMuniScope('SPECIFIC')}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                                                muniScope === 'SPECIFIC' 
                                                    ? 'bg-[var(--brand-green)] text-white' 
                                                    : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-green)]/30'
                                            }`}
                                        >
                                            <Users className="w-4 h-4" />
                                            {t('distributionScope.specificClubsLabel')}
                                        </button>
                                    </div>

                                    {muniScope === 'SPECIFIC' && (
                                        <div className="bg-[var(--dark-700)] p-4 rounded-xl border border-[var(--dark-500)] max-h-48 overflow-y-auto">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {clubs.map(c => (
                                                    <label key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--dark-600)] cursor-pointer transition-colors">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedClubs.includes(c.id)} 
                                                            onChange={() => toggleSelection(c.id, selectedClubs, setSelectedClubs)}
                                                            className="w-4 h-4 rounded border-[var(--dark-400)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                                                        />
                                                        <span className="text-sm text-[var(--brand-light)]/80">{c.name}</span>
                                                    </label>
                                                ))}
                                                {clubs.length === 0 && <p className="text-sm text-[var(--brand-light)]/50 col-span-2">{t('distributionScope.noClubsFound')}</p>}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* CLUB ADMIN UI */}
                            {role === 'club' && (
                                <div className="bg-[var(--brand-green)]/10 p-4 rounded-xl border border-[var(--brand-green)]/30">
                                    <p className="text-sm text-[var(--brand-light)]/80 flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-[var(--brand-green)]" />
                                        {t('distributionScope.clubMembers')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- TARGET AUDIENCE --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-pink)] flex items-center justify-center">
                                    <Target className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('targetAudience.title')}</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">{t('targetAudience.description')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4">
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => setTargetMode('ATTRIBUTES')}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                                        targetMode === 'ATTRIBUTES' 
                                            ? 'bg-[var(--brand-peach)] text-[var(--dark-900)]' 
                                            : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/30'
                                    }`}
                                >
                                    {t('targetAudience.attributes')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTargetMode('GROUPS')}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                                        targetMode === 'GROUPS' 
                                            ? 'bg-[var(--brand-peach)] text-[var(--dark-900)]' 
                                            : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-peach)]/30'
                                    }`}
                                >
                                    {t('targetAudience.specificGroups')}
                                </button>
                            </div>

                            {targetMode === 'GROUPS' ? (
                                <div className="bg-[var(--dark-700)] p-4 rounded-xl border border-[var(--dark-500)] max-h-48 overflow-y-auto">
                                    {availableGroups.map(g => (
                                        <label key={g.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--dark-600)] cursor-pointer transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedGroups.includes(g.id)} 
                                                onChange={() => toggleSelection(g.id, selectedGroups, setSelectedGroups)}
                                                className="w-4 h-4 rounded border-[var(--dark-400)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                                            />
                                            <span className="text-sm text-[var(--brand-light)]/80">{g.name}</span>
                                        </label>
                                    ))}
                                    {availableGroups.length === 0 && <p className="text-sm text-[var(--brand-light)]/50">{t('targetAudience.noGroupsAvailable')}</p>}
                                </div>
                            ) : (
                                <div className="bg-[var(--dark-700)] p-4 rounded-xl border border-[var(--dark-500)] space-y-4">
                                    {/* Member Type */}
                                    <div>
                                        <label className="text-xs font-bold uppercase text-[var(--brand-light)]/60 mb-2 block">{t('targetAudience.memberType')}</label>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { value: 'BOTH', label: t('targetAudience.both') },
                                                { value: 'YOUTH', label: t('targetAudience.youth') },
                                                { value: 'GUARDIAN', label: t('targetAudience.guardian') }
                                            ].map(({ value, label }) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    onClick={() => setMemberType(value as any)}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                        memberType === value 
                                                            ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                                            : 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 hover:bg-[var(--dark-500)]'
                                                    }`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Age Range */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClasses}>{t('targetAudience.minAge')}</label>
                                            <input 
                                                type="number" 
                                                placeholder={t('targetAudience.minPlaceholder')}
                                                className={inputClasses('minAge')}
                                                value={minAge} 
                                                onChange={e => setMinAge(e.target.value)}
                                                onFocus={() => setFocusedField('minAge')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>{t('targetAudience.maxAge')}</label>
                                            <input 
                                                type="number" 
                                                placeholder={t('targetAudience.maxPlaceholder')}
                                                className={inputClasses('maxAge')}
                                                value={maxAge} 
                                                onChange={e => setMaxAge(e.target.value)}
                                                onFocus={() => setFocusedField('maxAge')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                        </div>
                                    </div>

                                    {/* Grades */}
                                    <div>
                                        <label className="text-xs font-bold uppercase text-[var(--brand-light)]/60 mb-2 block">{t('targetAudience.grades')}</label>
                                        <div className="flex flex-wrap gap-2">
                                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                                                <button 
                                                    key={g} 
                                                    type="button" 
                                                    onClick={() => toggleSelection(g, selectedGrades, setSelectedGrades)} 
                                                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                                                        selectedGrades.includes(g) 
                                                            ? 'bg-[var(--brand-primary)] text-white' 
                                                            : 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 hover:bg-[var(--dark-500)]'
                                                    }`}
                                                >
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Gender */}
                                    <div>
                                        <label className="text-xs font-bold uppercase text-[var(--brand-light)]/60 mb-2 block">{t('targetAudience.gender')}</label>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { value: 'MALE', label: t('targetAudience.male', { defaultValue: 'Male' }) },
                                                { value: 'FEMALE', label: t('targetAudience.female', { defaultValue: 'Female' }) },
                                                { value: 'OTHER', label: t('targetAudience.other', { defaultValue: 'Other' }) }
                                            ].map(({ value, label }) => (
                                                <label key={value} className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                                                    selectedGenders.includes(value) 
                                                        ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                                        : 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 hover:bg-[var(--dark-500)]'
                                                }`}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedGenders.includes(value)}
                                                        onChange={() => toggleSelection(value, selectedGenders, setSelectedGenders)}
                                                        className="hidden"
                                                    />
                                                    <span className="text-sm">{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Interests */}
                                    {availableInterests.length > 0 && (
                                        <div>
                                            <label className="text-xs font-bold uppercase text-[var(--brand-light)]/60 mb-2 block">{t('targetAudience.interests')}</label>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                                                {availableInterests.map(interest => (
                                                    <label key={interest.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--dark-600)] cursor-pointer transition-colors">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedInterests.includes(interest.id)}
                                                            onChange={() => toggleSelection(interest.id, selectedInterests, setSelectedInterests)}
                                                            className="w-4 h-4 rounded border-[var(--dark-400)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                                                        />
                                                        <span className="text-sm text-[var(--brand-light)]/80">{interest.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Custom Fields */}
                                    {availableCustomFields.length > 0 && (
                                        <div className="border-t border-[var(--dark-500)] pt-4">
                                            <label className="text-xs font-bold uppercase text-[var(--brand-light)]/60 mb-3 block">{t('targetAudience.customFields')}</label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {availableCustomFields.map(f => (
                                                    <div key={f.id}>
                                                        <label className={labelClasses}>{f.name}</label>
                                                        <select 
                                                            className={inputClasses(`custom-${f.id}`)}
                                                            value={customFieldRules[f.id] || ''} 
                                                            onChange={e => handleCustomFieldChange(f.id, e.target.value)}
                                                        >
                                                            <option value="">{t('targetAudience.any')}</option>
                                                            {f.field_type === 'BOOLEAN' ? (
                                                                <>
                                                                    <option value="true">{t('targetAudience.yes')}</option>
                                                                    <option value="false">{t('targetAudience.no')}</option>
                                                                </>
                                                            ) : (
                                                                f.options?.map((o:string) => <option key={o} value={o}>{o}</option>)
                                                            )}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- PUBLICATION SETTINGS --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-pink)] flex items-center justify-center">
                                    <Settings className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('publicationSettings.title')}</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">{t('publicationSettings.description')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Column */}
                                <div className="space-y-4">
                                    {/* Status */}
                                    <div>
                                        <label className={labelClasses}>{t('publicationSettings.status')}</label>
                                        <select 
                                            value={status} 
                                            onChange={e => setStatus(e.target.value as any)} 
                                            className={inputClasses('status')}
                                        >
                                            <option value="DRAFT">{t('publicationSettings.draft')}</option>
                                            <option value="PUBLISHED">{t('publicationSettings.publishNow')}</option>
                                            <option value="SCHEDULED">{t('publicationSettings.schedule')}</option>
                                        </select>
                                    </div>

                                    {status === 'SCHEDULED' && (
                                        <div>
                                            <label className={labelClasses}>{t('publicationSettings.scheduleDateTime')}</label>
                                            <input 
                                                type="datetime-local" 
                                                className={inputClasses('publishedAt')}
                                                value={publishedAt} 
                                                onChange={e => setPublishedAt(e.target.value)}
                                                onFocus={() => setFocusedField('publishedAt')}
                                                onBlur={() => setFocusedField(null)}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className={labelClasses}>{t('publicationSettings.visibilityEndDate')}</label>
                                        <input 
                                            type="datetime-local" 
                                            className={inputClasses('visibilityEndDate')}
                                            value={visibilityEndDate} 
                                            onChange={e => setVisibilityEndDate(e.target.value)}
                                            onFocus={() => setFocusedField('visibilityEndDate')}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                    </div>

                                    {/* Pin Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setIsPinned(!isPinned)}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                                            isPinned 
                                                ? 'bg-[var(--brand-peach)]/20 border-2 border-[var(--brand-peach)]' 
                                                : 'bg-[var(--dark-700)] border-2 border-[var(--dark-500)] hover:border-[var(--brand-peach)]/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Pin className={`w-5 h-5 ${isPinned ? 'text-[var(--brand-peach)]' : 'text-[var(--brand-light)]/50'}`} />
                                            <span className={`font-medium ${isPinned ? 'text-[var(--brand-peach)]' : 'text-[var(--brand-light)]/70'}`}>{t('publicationSettings.pinToTop')}</span>
                                        </div>
                                        <div className={`w-10 h-6 rounded-full transition-colors ${isPinned ? 'bg-[var(--brand-peach)]' : 'bg-[var(--dark-500)]'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${isPinned ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </div>
                                    </button>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-4">
                                    {/* Comments Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setAllowComments(!allowComments)}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                                            allowComments 
                                                ? 'bg-[var(--brand-green)]/20 border-2 border-[var(--brand-green)]' 
                                                : 'bg-[var(--dark-700)] border-2 border-[var(--dark-500)] hover:border-[var(--brand-green)]/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <MessageSquare className={`w-5 h-5 ${allowComments ? 'text-[var(--brand-green)]' : 'text-[var(--brand-light)]/50'}`} />
                                            <span className={`font-medium ${allowComments ? 'text-[var(--brand-green)]' : 'text-[var(--brand-light)]/70'}`}>{t('publicationSettings.allowComments')}</span>
                                        </div>
                                        <div className={`w-10 h-6 rounded-full transition-colors ${allowComments ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-500)]'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${allowComments ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </div>
                                    </button>

                                    {allowComments && (
                                        <div className="pl-4 space-y-3 border-l-2 border-[var(--brand-green)]/30">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={requireModeration} 
                                                    onChange={e => setRequireModeration(e.target.checked)}
                                                    className="w-4 h-4 rounded border-[var(--dark-400)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                                                />
                                                <span className="text-sm text-[var(--brand-light)]/70">{t('publicationSettings.requireModeration')}</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={allowReplies} 
                                                    onChange={e => setAllowReplies(e.target.checked)}
                                                    className="w-4 h-4 rounded border-[var(--dark-400)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                                                />
                                                <span className="text-sm text-[var(--brand-light)]/70">{t('publicationSettings.allowReplies')}</span>
                                            </label>
                                            <div>
                                                <label className="text-xs text-[var(--brand-light)]/50 mb-1 block">{t('publicationSettings.commentLimit')}</label>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    className={`${inputClasses('limitComments')} h-9`}
                                                    value={limitComments} 
                                                    onChange={e => setLimitComments(parseInt(e.target.value) || 0)}
                                                    onFocus={() => setFocusedField('limitComments')}
                                                    onBlur={() => setFocusedField(null)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Push Notification Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setSendPush(!sendPush)}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                                            sendPush 
                                                ? 'bg-[var(--brand-blue)]/20 border-2 border-[var(--brand-blue)]' 
                                                : 'bg-[var(--dark-700)] border-2 border-[var(--dark-500)] hover:border-[var(--brand-blue)]/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Bell className={`w-5 h-5 ${sendPush ? 'text-[var(--brand-blue)]' : 'text-[var(--brand-light)]/50'}`} />
                                            <span className={`font-medium ${sendPush ? 'text-[var(--brand-blue)]' : 'text-[var(--brand-light)]/70'}`}>{t('publicationSettings.sendPushNotification')}</span>
                                        </div>
                                        <div className={`w-10 h-6 rounded-full transition-colors ${sendPush ? 'bg-[var(--brand-blue)]' : 'bg-[var(--dark-500)]'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${sendPush ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </div>
                                    </button>

                                    {sendPush && (
                                        <div className="pl-4 space-y-3 border-l-2 border-[var(--brand-blue)]/30">
                                            <div>
                                                <label className="text-xs text-[var(--brand-light)]/50 mb-1 block">{t('publicationSettings.notificationTitle')}</label>
                                                <input 
                                                    type="text" 
                                                    placeholder={t('publicationSettings.notificationTitlePlaceholder')}
                                                    className={`${inputClasses('pushTitle')} h-9`}
                                                    value={pushTitle} 
                                                    onChange={e => setPushTitle(e.target.value)}
                                                    onFocus={() => setFocusedField('pushTitle')}
                                                    onBlur={() => setFocusedField(null)}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-[var(--brand-light)]/50 mb-1 block">{t('publicationSettings.notificationMessage')}</label>
                                                <input 
                                                    type="text" 
                                                    placeholder={t('publicationSettings.notificationMessagePlaceholder')}
                                                    className={`${inputClasses('pushMessage')} h-9`}
                                                    value={pushMessage} 
                                                    onChange={e => setPushMessage(e.target.value)}
                                                    onFocus={() => setFocusedField('pushMessage')}
                                                    onBlur={() => setFocusedField(null)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- QUICK TIPS --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-pink)] flex items-center justify-center">
                                    <Lightbulb className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('quickTips.title')}</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">{t('quickTips.description')}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 sm:p-6 text-sm text-[var(--brand-light)]/70 space-y-3">
                            <ul className="list-disc list-inside space-y-2 pl-2">
                                <li>{t('quickTips.tip1')}</li>
                                <li>{t('quickTips.tip2')}</li>
                                <li>{t('quickTips.tip3')}</li>
                                <li>{t('quickTips.tip4')}</li>
                            </ul>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row justify-end gap-3 px-4 sm:px-0 pb-8">
                        <button 
                            type="button" 
                            onClick={() => router.back()}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold 
                                       bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)]
                                       hover:bg-[var(--dark-600)] hover:border-[var(--dark-400)] transition-all"
                        >
                            {t('actions.cancel')}
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold 
                                       bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-purple)] transition-all
                                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[150px]"
                        >
                            {loading && <Sparkles className="w-4 h-4 animate-pulse" />}
                            {loading ? t('actions.saving') : (initialData ? t('actions.updatePost') : t('actions.createPost'))}
                        </button>
                    </div>
                </form>

                </div>
        </div>
    );
}
