'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
    ArrowLeft, Upload, X, FileText, Image, Video,
    CheckCircle2, Sparkles, Send, Clock, Eye, EyeOff,
    Megaphone, Calendar, Star, Bell, PartyPopper, Info,
    AlertTriangle, Heart, Trophy, Rocket, Users, Pin,
    ChevronRight, Zap, Settings
} from 'lucide-react';
import api from '../../../lib/api';
import PostRichTextEditor from './PostRichTextEditor';
import { getMediaUrl } from '../../utils';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../context/AuthContext';
import { createQuickPostSchema, QuickPostFormData } from '../../../lib/validations/quickPost';

interface PostTemplate {
    id: number;
    name: string;
    description: string;
    icon: string;
    icon_emoji: string;
    target_summary: string;
    settings_summary: string;
    usage_count: number;
    default_post_type: string;
    is_global: boolean;
    is_pinned_default: boolean;
    send_push_notification: boolean;
    default_push_title: string;
    default_push_message: string;
    target_member_type: string;
    target_min_age: number | null;
    target_max_age: number | null;
    target_grades: number[];
    target_genders: string[];
    target_municipalities: number[];
    target_clubs: number[];
    target_groups: number[];
    target_interests: number[];
    allow_comments: boolean;
    require_moderation: boolean;
    allow_replies: boolean;
    limit_comments_per_user: number;
}

interface QuickPostFormProps {
    role: 'super' | 'municipality' | 'club';
    onSuccess: () => void;
}

// Icon mapping
const ICON_MAP: Record<string, React.ReactNode> = {
    'MEGAPHONE': <Megaphone className="w-5 h-5" />,
    'CALENDAR': <Calendar className="w-5 h-5" />,
    'STAR': <Star className="w-5 h-5" />,
    'BELL': <Bell className="w-5 h-5" />,
    'PARTY': <PartyPopper className="w-5 h-5" />,
    'INFO': <Info className="w-5 h-5" />,
    'WARNING': <AlertTriangle className="w-5 h-5" />,
    'HEART': <Heart className="w-5 h-5" />,
    'TROPHY': <Trophy className="w-5 h-5" />,
    'ROCKET': <Rocket className="w-5 h-5" />,
};

export default function QuickPostForm({ role, onSuccess }: QuickPostFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user: currentUser } = useAuth();
    const t = useTranslations('postsManager.quickPost');
    const progressPlaceholderRef = useRef<HTMLDivElement>(null);
    
    const [loading, setLoading] = useState(false);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [error, setError] = useState('');
    const { success, error: showError, info, warning } = useToast();

    // Build URL preserving pagination params
    const buildUrlWithParams = (path: string) => {
        const params = new URLSearchParams(searchParams.toString());
        return params.toString() ? `${path}?${params.toString()}` : path;
    };
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [isProgressFixed, setIsProgressFixed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Templates
    const [templates, setTemplates] = useState<PostTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null);

    // Initialize React Hook Form with validation
    const { register, handleSubmit: handleFormSubmit, formState: { errors }, watch, setValue, control, trigger } = useForm<QuickPostFormData>({
        resolver: zodResolver(createQuickPostSchema(t)),
        mode: 'onBlur', // Validate on blur
        defaultValues: {
            selectedTemplate: 0,
            title: '',
            content: '',
            postType: 'TEXT',
        }
    });

    // Watch form values
    const templateId = watch('selectedTemplate');
    const title = watch('title');
    const content = watch('content');
    const postType = watch('postType');

    // Non-validated fields (keep as state)
    const [videoUrl, setVideoUrl] = useState('');
    const [newImages, setNewImages] = useState<File[]>([]);
    const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'SCHEDULED'>('DRAFT');
    const [publishedAt, setPublishedAt] = useState('');
    const [sendPush, setSendPush] = useState(false);
    const [pushTitle, setPushTitle] = useState('');
    const [pushMessage, setPushMessage] = useState('');

    // Track component mount for portal
    useEffect(() => {
        setIsMounted(true);
        return () => setIsMounted(false);
    }, []);

    // Load templates
    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const res = await api.get('/post-templates/');
                const data = Array.isArray(res.data) ? res.data : res.data.results || [];
                // Only show active templates
                setTemplates(data.filter((t: PostTemplate) => t.is_active));
            } catch (err) {
                console.error("Failed to load templates", err);
            } finally {
                setLoadingTemplates(false);
            }
        };
        loadTemplates();
    }, []);

    // When template is selected, set defaults
    useEffect(() => {
        if (selectedTemplate) {
            setValue('postType', selectedTemplate.default_post_type);
            // Set push notification defaults from template
            setSendPush(selectedTemplate.send_push_notification || false);
            setPushTitle(selectedTemplate.default_push_title || '');
            setPushMessage(selectedTemplate.default_push_message || '');
        }
    }, [selectedTemplate, setValue]);

    // Progress calculation - now includes content as required
    const calculateCompletion = useCallback(() => {
        let required = 3; // Template + Title + Content
        let filled = 0;
        if (templateId && templateId > 0) filled++;
        if (title && title.trim()) filled++;
        if (content && content.trim()) filled++;
        return Math.round((filled / required) * 100);
    }, [templateId, title, content]);

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

    const handleSubmit = async (data: QuickPostFormData) => {
        if (!selectedTemplate) {
            setError(t('toast.selectTemplate'));
            return;
        }
        
        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('content', data.content);
        formData.append('post_type', data.postType || 'TEXT');
        if (videoUrl) formData.append('video_url', videoUrl);

        // Helper to extract ID from value that could be number or object
        const extractId = (val: any): number | null => {
            if (!val) return null;
            if (typeof val === 'number') return val;
            if (typeof val === 'object' && val.id) return val.id;
            return null;
        };

        // Apply template settings
        formData.append('is_global', (selectedTemplate.is_global ?? false).toString());
        
        // Handle arrays safely - they might be undefined from the API
        // Also handle case where API returns objects instead of IDs
        (selectedTemplate.target_municipalities || []).forEach(item => {
            const id = extractId(item);
            if (id) formData.append('target_municipalities', id.toString());
        });
        (selectedTemplate.target_clubs || []).forEach(item => {
            const id = extractId(item);
            if (id) formData.append('target_clubs', id.toString());
        });

        formData.append('status', status);
        if (status === 'SCHEDULED' && publishedAt) {
            formData.append('published_at', new Date(publishedAt).toISOString());
        }
        formData.append('is_pinned', selectedTemplate.is_pinned_default ? 'true' : 'false');

        formData.append('target_member_type', selectedTemplate.target_member_type || 'BOTH');
        (selectedTemplate.target_groups || []).forEach(item => {
            const id = extractId(item);
            if (id) formData.append('target_groups', id.toString());
        });
        if (selectedTemplate.target_min_age) formData.append('target_min_age', selectedTemplate.target_min_age.toString());
        if (selectedTemplate.target_max_age) formData.append('target_max_age', selectedTemplate.target_max_age.toString());
        formData.append('target_grades', JSON.stringify(selectedTemplate.target_grades || []));
        formData.append('target_genders', JSON.stringify(selectedTemplate.target_genders || []));
        (selectedTemplate.target_interests || []).forEach(item => {
            const id = extractId(item);
            if (id) formData.append('target_interests', id.toString());
        });

        formData.append('allow_comments', selectedTemplate.allow_comments ? 'true' : 'false');
        formData.append('require_moderation', selectedTemplate.require_moderation ? 'true' : 'false');
        formData.append('allow_replies', selectedTemplate.allow_replies ? 'true' : 'false');
        formData.append('limit_comments_per_user', (selectedTemplate.limit_comments_per_user ?? 0).toString());
        
        // Use the editable push notification values
        formData.append('send_push_notification', sendPush ? 'true' : 'false');
        if (sendPush) {
            formData.append('push_title', pushTitle || `New post from ${selectedTemplate.name}`);
            formData.append('push_message', pushMessage || title); // Use post title as fallback
        }

        // Track template usage
        formData.append('created_from_template', selectedTemplate.id.toString());

        // Images
        newImages.forEach((file) => formData.append('uploaded_images', file));

        try {
            await api.post('/posts/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            
            // Increment template usage
            await api.post(`/post-templates/${selectedTemplate.id}/increment_usage/`);
            
            success(t('toast.postCreated'));
            setTimeout(() => onSuccess(), 1000);
        } catch (err: any) {
            console.error(err);
            let msg = t('toast.failedToCreate');
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
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                                {t('title')}
                            </h1>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-xs font-medium">
                                <Zap className="w-3 h-3" /> {t('fastMode')}
                            </span>
                        </div>
                        <p className="text-[var(--brand-light)]/50 text-sm mt-1">
                            {t('description')}
                        </p>
                    </div>
                    <Link 
                        href={`${getBasePath()}/create`}
                        className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
                    >
                        <Settings className="w-4 h-4" /> {t('advanced')}
                    </Link>
                </div>

                {/* Progress Indicator */}
                <div ref={progressPlaceholderRef} className="mb-6 sm:mb-8" style={{ minHeight: isProgressFixed ? 72 : 'auto' }}>
                    <div className={`bg-[var(--dark-800)] backdrop-blur-sm rounded-none sm:rounded-2xl p-4 border-y sm:border border-[var(--dark-600)] transition-opacity duration-200 ${isProgressFixed ? 'opacity-0' : 'opacity-100'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-[var(--brand-light)]/60">{t('progress.required')}</span>
                            <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
                        </div>
                        <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out" style={{ width: `${completionPercent}%` }} />
                        </div>
                        {completionPercent === 100 && (
                            <div className="flex items-center gap-2 mt-3 text-[var(--brand-third)]">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-sm font-medium">{t('progress.readyToPost')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fixed Progress */}
                {isMounted && createPortal(
                    <div className={`fixed z-[9999] left-0 right-0 bg-[var(--dark-800)]/95 backdrop-blur-sm border-b border-[var(--dark-600)] shadow-lg transition-all duration-200 top-16 md:top-0 ${isProgressFixed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
                        <div className="w-full md:max-w-4xl md:mx-auto px-4 md:px-6 py-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-[var(--brand-light)]/60">{t('progress.required')}</span>
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

                    {/* --- TEMPLATE SELECTION --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--brand-purple)] flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-[var(--dark-900)]" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('templateSelection.title')} <span className="text-[var(--brand-red)]">*</span></h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">{t('templateSelection.description')}</p>
                                </div>
                                <Link 
                                    href={`${getBasePath()}/templates`}
                                    className="text-sm text-[var(--brand-primary)] hover:text-[var(--brand-purple)] transition-colors"
                                >
                                    {t('templateSelection.manage')}
                                </Link>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6">
                            {loadingTemplates ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-24 bg-[var(--dark-700)] rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="text-center py-8">
                                    <Sparkles className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-4" />
                                    <p className="text-[var(--brand-light)]/50 mb-2">{t('templateSelection.noTemplates')}</p>
                                    <p className="text-sm text-[var(--brand-light)]/30 mb-4">{t('templateSelection.noTemplatesHint')}</p>
                                    <Link href={`${getBasePath()}/templates/create`}>
                                        <button type="button" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-medium hover:bg-[var(--brand-purple)] transition-all">
                                            {t('templateSelection.createTemplate')}
                                        </button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {templates.map(template => (
                                        <button
                                            key={template.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedTemplate(template);
                                                setValue('selectedTemplate', template.id);
                                                trigger('selectedTemplate');
                                            }}
                                            onBlur={() => trigger('selectedTemplate')}
                                            className={`text-left p-4 rounded-xl border-2 transition-all ${
                                                selectedTemplate?.id === template.id
                                                    ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20'
                                                    : 'bg-[var(--dark-700)] border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                    selectedTemplate?.id === template.id
                                                        ? 'bg-[var(--brand-primary)] text-white'
                                                        : 'bg-[var(--dark-600)] text-[var(--brand-light)]/70'
                                                }`}>
                                                    {ICON_MAP[template.icon] || <Megaphone className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={`font-semibold truncate ${
                                                            selectedTemplate?.id === template.id
                                                                ? 'text-[var(--brand-primary)]'
                                                                : 'text-[var(--brand-light)]'
                                                        }`}>
                                                            {template.name}
                                                        </h3>
                                                        {selectedTemplate?.id === template.id && (
                                                            <CheckCircle2 className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-[var(--brand-light)]/50 mt-0.5 line-clamp-1">
                                                        {template.description || t('templateSelection.noDescription')}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--dark-600)] text-[var(--brand-light)]/60 text-xs">
                                                            <Users className="w-3 h-3" />
                                                            {template.target_summary}
                                                        </span>
                                                        <span className="text-xs text-[var(--brand-light)]/40">
                                                            {template.usage_count}× {t('templateSelection.used')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {errors.selectedTemplate && (
                                <p className="mt-2 text-sm text-[var(--brand-red)]">{errors.selectedTemplate.message}</p>
                            )}
                        </div>
                    </div>

                    {/* --- POST CONTENT --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-[var(--dark-900)]" />
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
                                {errors.content && (
                                    <p className="mt-2 text-sm text-[var(--brand-red)]">{errors.content.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- MEDIA TYPE (from template but can be changed) --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--brand-pink)] flex items-center justify-center">
                                    <Image className="w-5 h-5 text-[var(--dark-900)]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('media.title')}</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">{t('media.description')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4">
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { type: 'TEXT', icon: FileText, label: t('media.textOnly') },
                                    { type: 'IMAGE', icon: Image, label: t('media.withImages') },
                                    { type: 'VIDEO', icon: Video, label: t('media.withVideo') }
                                ].map(({ type, icon: Icon, label }) => (
                                    <button 
                                        key={type} 
                                        type="button" 
                                        onClick={() => setValue('postType', type)} 
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                                            postType === type 
                                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]' 
                                                : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                            
                            {postType === 'IMAGE' && (
                                <div className="pt-4 border-t border-[var(--dark-600)]">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--dark-500)] rounded-xl cursor-pointer hover:border-[var(--brand-primary)]/50 transition-colors bg-[var(--dark-700)]">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 text-[var(--brand-light)]/40 mb-2" />
                                            <p className="text-sm text-[var(--brand-light)]/60">{t('media.clickToUpload')}</p>
                                        </div>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            multiple 
                                            accept="image/*"
                                            onChange={e => setNewImages([...newImages, ...Array.from(e.target.files || [])])}
                                        />
                                    </label>
                                    {newImages.length > 0 && (
                                        <div className="flex gap-3 flex-wrap mt-4">
                                            {newImages.map((file, idx) => (
                                                <div key={idx} className="relative w-20 h-20 group rounded-xl overflow-hidden">
                                                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`Preview ${idx}`} />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setNewImages(newImages.filter((_, i) => i !== idx))} 
                                                        className="absolute top-1 right-1 w-6 h-6 bg-[var(--brand-red)] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {postType === 'VIDEO' && (
                                <div className="pt-4 border-t border-[var(--dark-600)]">
                                    <label className={labelClasses}>{t('media.youtubeUrl')}</label>
                                    <input 
                                        type="url" 
                                        placeholder={t('media.youtubePlaceholder')}
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

                    {/* --- PUSH NOTIFICATION --- */}
                    <div className={`bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border mb-6 ${
                        sendPush 
                            ? 'border-[var(--brand-primary)]/50 ring-1 ring-[var(--brand-primary)]/20' 
                            : 'border-[var(--dark-600)]'
                    }`}>
                        <div className={`px-4 sm:px-6 py-5 border-b sm:rounded-t-2xl ${
                            sendPush 
                                ? 'border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/5' 
                                : 'border-[var(--dark-600)] bg-[var(--dark-700)]/50'
                        }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        sendPush 
                                            ? 'bg-[var(--brand-primary)]' 
                                            : 'bg-[var(--dark-600)]'
                                    }`}>
                                        <Bell className={`w-5 h-5 ${sendPush ? 'text-[var(--dark-900)]' : 'text-[var(--brand-light)]/50'}`} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('pushNotification.title')}</h2>
                                        <p className="text-sm text-[var(--brand-light)]/50">
                                            {sendPush ? t('pushNotification.enabled') : t('pushNotification.disabled')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSendPush(!sendPush)}
                                    className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${
                                        sendPush ? 'bg-[var(--brand-primary)]' : 'bg-[var(--dark-500)]'
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                                        sendPush ? 'translate-x-6' : 'translate-x-0'
                                    }`} />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6">
                            {sendPush ? (
                                <div className="space-y-4">
                                    {/* Info Banner */}
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20">
                                        <Sparkles className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />
                                        <div className="text-sm text-[var(--brand-light)]/80">
                                            <span className="font-medium text-[var(--brand-primary)]">{t('pushNotification.customize')}</span>
                                            <span className="block mt-0.5 text-[var(--brand-light)]/60">
                                                {t('pushNotification.customizeHint')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Preview Card */}
                                    <div className="p-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
                                        <p className="text-xs text-[var(--brand-light)]/50 uppercase tracking-wider mb-2 font-medium">{t('pushNotification.preview')}</p>
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                                                <Bell className="w-5 h-5 text-[var(--dark-900)]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-[var(--brand-light)] truncate">
                                                    {pushTitle || t('pushNotification.newPost')}
                                                </p>
                                                <p className="text-sm text-[var(--brand-light)]/60 line-clamp-2">
                                                    {pushMessage || title || t('pushNotification.titleWillAppear')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Editable Fields */}
                                    <div>
                                        <label className={labelClasses}>
                                            {t('pushNotification.notificationTitle')}
                                            <span className="ml-2 text-xs font-normal text-[var(--brand-primary)]">✎ {t('pushNotification.editable')}</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder={t('pushNotification.titlePlaceholder')}
                                            className={inputClasses('pushTitle')}
                                            value={pushTitle} 
                                            onChange={e => setPushTitle(e.target.value)} 
                                            onFocus={() => setFocusedField('pushTitle')}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>
                                            {t('pushNotification.notificationMessage')}
                                            <span className="ml-2 text-xs font-normal text-[var(--brand-primary)]">✎ {t('pushNotification.editable')}</span>
                                        </label>
                                        <textarea 
                                            placeholder={t('pushNotification.messagePlaceholder')}
                                            className={`${inputClasses('pushMessage')} h-20 py-3 resize-none`}
                                            value={pushMessage} 
                                            onChange={e => setPushMessage(e.target.value)} 
                                            onFocus={() => setFocusedField('pushMessage')}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                        <p className="text-xs text-[var(--brand-light)]/40 mt-1">
                                            {t('pushNotification.messageHint')}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <Bell className="w-10 h-10 text-[var(--brand-light)]/20 mx-auto mb-2" />
                                    <p className="text-sm text-[var(--brand-light)]/50">
                                        {t('pushNotification.enableHint')}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setSendPush(true)}
                                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-sm font-medium hover:bg-[var(--brand-primary)]/20 transition-colors"
                                    >
                                        <Bell className="w-4 h-4" />
                                        {t('pushNotification.enableNotification')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- PUBLISH STATUS --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[var(--brand-green)] flex items-center justify-center">
                                    <Send className="w-5 h-5 text-[var(--dark-900)]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('publish.title')}</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">{t('publish.description')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4">
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { value: 'DRAFT', icon: EyeOff, label: t('publish.saveAsDraft'), color: 'blue' },
                                    { value: 'PUBLISHED', icon: Eye, label: t('publish.publishNow'), color: 'green' },
                                    { value: 'SCHEDULED', icon: Clock, label: t('publish.schedule'), color: 'primary' }
                                ].map(({ value, icon: Icon, label, color }) => (
                                    <button 
                                        key={value} 
                                        type="button" 
                                        onClick={() => setStatus(value as any)} 
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                                            status === value 
                                                ? value === 'PUBLISHED' 
                                                    ? 'bg-[var(--brand-green)] text-[var(--dark-900)]'
                                                    : value === 'DRAFT'
                                                        ? 'bg-[var(--brand-blue)] text-white'
                                                        : 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                                                : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {status === 'SCHEDULED' && (
                                <div className="pt-4 border-t border-[var(--dark-600)]">
                                    <label className={labelClasses}>{t('publish.scheduleDateTime')}</label>
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
                        </div>
                    </div>

                    {/* --- TEMPLATE SETTINGS PREVIEW --- */}
                    {selectedTemplate && (
                        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                            <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-peach)] flex items-center justify-center">
                                        <Settings className="w-5 h-5 text-[var(--dark-900)]" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('templateSettings.title')}</h2>
                                        <p className="text-sm text-[var(--brand-light)]/50">{t('templateSettings.willBeApplied', { name: selectedTemplate.name })}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-3 rounded-xl bg-[var(--dark-700)]">
                                        <p className="text-xs text-[var(--brand-light)]/50 mb-1">{t('templateSettings.targetAudience')}</p>
                                        <p className="text-sm text-[var(--brand-light)]">{selectedTemplate.target_summary}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-[var(--dark-700)]">
                                        <p className="text-xs text-[var(--brand-light)]/50 mb-1">{t('templateSettings.settings')}</p>
                                        <p className="text-sm text-[var(--brand-light)]">{selectedTemplate.settings_summary}</p>
                                    </div>
                                    {selectedTemplate.is_pinned_default && (
                                        <div className="p-3 rounded-xl bg-[var(--brand-peach)]/10 border border-[var(--brand-peach)]/30">
                                            <div className="flex items-center gap-2 text-[var(--brand-peach)]">
                                                <Pin className="w-4 h-4" />
                                                <span className="text-sm font-medium">{t('templateSettings.willBePinned')}</span>
                                            </div>
                                        </div>
                                    )}
                                    {sendPush && (
                                        <div className="p-3 rounded-xl bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30">
                                            <div className="flex items-center gap-2 text-[var(--brand-primary)]">
                                                <Bell className="w-4 h-4" />
                                                <span className="text-sm font-medium">
                                                    {t('templateSettings.pushNotificationLabel', { title: pushTitle || t('pushNotification.newPost') })}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- ACTIONS --- */}
                    <div className="flex flex-col sm:flex-row justify-end gap-3 px-4 sm:px-0 py-4 sm:py-0 mb-8">
                        <button 
                            type="button" 
                            onClick={() => router.push(buildUrlWithParams(getBasePath()))}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold 
                                     bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)]
                                     hover:bg-[var(--dark-600)] hover:border-[var(--dark-400)] transition-all"
                        >
                            {t('actions.cancel')}
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading || !selectedTemplate || !title.trim()} 
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold 
                                     bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-purple)] transition-all
                                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading && <Sparkles className="w-4 h-4 animate-pulse" />}
                            {loading ? t('actions.creating') : status === 'PUBLISHED' ? t('actions.publishPost') : status === 'SCHEDULED' ? t('actions.schedulePost') : t('actions.saveDraft')}
                        </button>
                    </div>

                </form>
                </div>
        </div>
    );
}

