'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import Toast from '../Toast';
import { useAuth } from '../../../context/AuthContext';

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
    const { user: currentUser } = useAuth();
    const progressPlaceholderRef = useRef<HTMLDivElement>(null);
    
    const [loading, setLoading] = useState(false);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning'; isVisible: boolean }>({
        message: '', type: 'success', isVisible: false,
    });
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [isProgressFixed, setIsProgressFixed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Templates
    const [templates, setTemplates] = useState<PostTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null);

    // Post Content (only these fields need to be filled)
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [postType, setPostType] = useState('TEXT');
    const [videoUrl, setVideoUrl] = useState('');
    const [newImages, setNewImages] = useState<File[]>([]);

    // Publish Status
    const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'SCHEDULED'>('DRAFT');
    const [publishedAt, setPublishedAt] = useState('');

    // Push Notification (editable from template defaults)
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
            setPostType(selectedTemplate.default_post_type);
            // Set push notification defaults from template
            setSendPush(selectedTemplate.send_push_notification || false);
            setPushTitle(selectedTemplate.default_push_title || '');
            setPushMessage(selectedTemplate.default_push_message || '');
        }
    }, [selectedTemplate]);

    // Progress calculation
    const calculateCompletion = useCallback(() => {
        let required = 2; // Template + Title
        let filled = 0;
        if (selectedTemplate) filled++;
        if (title.trim()) filled++;
        return Math.round((filled / required) * 100);
    }, [selectedTemplate, title]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedTemplate) {
            setError('Please select a template');
            return;
        }
        
        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('post_type', postType);
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
            
            setToast({ message: 'Post created successfully!', type: 'success', isVisible: true });
            setTimeout(() => onSuccess(), 1000);
        } catch (err: any) {
            console.error(err);
            let msg = 'Failed to create post.';
            if (err.response?.data) {
               if (typeof err.response.data === 'string') msg = err.response.data;
               else if (err.response.data.detail) msg = err.response.data.detail;
               else msg = JSON.stringify(err.response.data);
            }
            setError(msg);
            setToast({ message: msg, type: 'error', isVisible: true });
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
                                Quick Post
                            </h1>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-xs font-medium">
                                <Zap className="w-3 h-3" /> Fast Mode
                            </span>
                        </div>
                        <p className="text-[var(--brand-light)]/50 text-sm mt-1">
                            Select a template and add your content - that's it!
                        </p>
                    </div>
                    <Link 
                        href={`${getBasePath()}/create`}
                        className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
                    >
                        <Settings className="w-4 h-4" /> Advanced
                    </Link>
                </div>

                {/* Progress Indicator */}
                <div ref={progressPlaceholderRef} className="mb-6 sm:mb-8" style={{ minHeight: isProgressFixed ? 72 : 'auto' }}>
                    <div className={`bg-[var(--dark-800)] backdrop-blur-sm rounded-none sm:rounded-2xl p-4 border-y sm:border border-[var(--dark-600)] transition-opacity duration-200 ${isProgressFixed ? 'opacity-0' : 'opacity-100'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-[var(--brand-light)]/60">Required: Template + Title</span>
                            <span className="text-sm font-semibold text-[var(--brand-primary)]">{completionPercent}%</span>
                        </div>
                        <div className="h-2 bg-[var(--dark-600)] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] rounded-full transition-all duration-500 ease-out" style={{ width: `${completionPercent}%` }} />
                        </div>
                        {completionPercent === 100 && (
                            <div className="flex items-center gap-2 mt-3 text-[var(--brand-third)]">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-sm font-medium">Ready to post!</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fixed Progress */}
                {isMounted && createPortal(
                    <div className={`fixed z-[9999] left-0 right-0 bg-[var(--dark-800)]/95 backdrop-blur-sm border-b border-[var(--dark-600)] shadow-lg transition-all duration-200 top-16 md:top-0 ${isProgressFixed ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}>
                        <div className="w-full md:max-w-4xl md:mx-auto px-4 md:px-6 py-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-[var(--brand-light)]/60">Required: Template + Title</span>
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

                <form onSubmit={handleSubmit}>

                    {/* --- TEMPLATE SELECTION --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">Select Template <span className="text-[var(--brand-red)]">*</span></h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">Choose a template to apply targeting and settings</p>
                                </div>
                                <Link 
                                    href={`${getBasePath()}/templates`}
                                    className="text-sm text-[var(--brand-primary)] hover:text-[var(--brand-purple)] transition-colors"
                                >
                                    Manage
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
                                    <p className="text-[var(--brand-light)]/50 mb-2">No templates available</p>
                                    <p className="text-sm text-[var(--brand-light)]/30 mb-4">Create a template to use quick posting</p>
                                    <Link href={`${getBasePath()}/templates/create`}>
                                        <button type="button" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white font-medium hover:bg-[var(--brand-purple)] transition-all">
                                            Create Template
                                        </button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {templates.map(template => (
                                        <button
                                            key={template.id}
                                            type="button"
                                            onClick={() => setSelectedTemplate(template)}
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
                                                        {template.description || 'No description'}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--dark-600)] text-[var(--brand-light)]/60 text-xs">
                                                            <Users className="w-3 h-3" />
                                                            {template.target_summary}
                                                        </span>
                                                        <span className="text-xs text-[var(--brand-light)]/40">
                                                            {template.usage_count}× used
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- POST CONTENT --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-primary)] flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">Post Content</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">Add your title and content</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-6">
                            {/* Title */}
                            <div>
                                <label className={labelClasses}>Title <span className="text-[var(--brand-red)]">*</span></label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="Enter a catchy title..."
                                    className={inputClasses('title')}
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)} 
                                    onFocus={() => setFocusedField('title')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </div>

                            {/* Content */}
                            <div>
                                <label className={labelClasses}>Content</label>
                                <PostRichTextEditor value={content} onChange={setContent} />
                            </div>
                        </div>
                    </div>

                    {/* --- MEDIA TYPE (from template but can be changed) --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-pink)] to-[var(--brand-purple)] flex items-center justify-center">
                                    <Image className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">Media</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">Add images or video (optional)</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4">
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { type: 'TEXT', icon: FileText, label: 'Text Only' },
                                    { type: 'IMAGE', icon: Image, label: 'With Images' },
                                    { type: 'VIDEO', icon: Video, label: 'With Video' }
                                ].map(({ type, icon: Icon, label }) => (
                                    <button 
                                        key={type} 
                                        type="button" 
                                        onClick={() => setPostType(type)} 
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
                                <div className="pt-4 border-t border-[var(--dark-600)]">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--dark-500)] rounded-xl cursor-pointer hover:border-[var(--brand-primary)]/50 transition-colors bg-[var(--dark-700)]">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 text-[var(--brand-light)]/40 mb-2" />
                                            <p className="text-sm text-[var(--brand-light)]/60">Click to upload images</p>
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
                                    <label className={labelClasses}>YouTube URL</label>
                                    <input 
                                        type="url" 
                                        placeholder="https://youtube.com/watch?v=..."
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
                                            ? 'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-pink)]' 
                                            : 'bg-[var(--dark-600)]'
                                    }`}>
                                        <Bell className={`w-5 h-5 ${sendPush ? 'text-white' : 'text-[var(--brand-light)]/50'}`} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-[var(--brand-light)]">Push Notification</h2>
                                        <p className="text-sm text-[var(--brand-light)]/50">
                                            {sendPush ? 'Users will be notified when published' : 'No notification will be sent'}
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
                                            <span className="font-medium text-[var(--brand-primary)]">Customize your notification!</span>
                                            <span className="block mt-0.5 text-[var(--brand-light)]/60">
                                                Edit the title and message below. These are pre-filled from your template but you can change them.
                                            </span>
                                        </div>
                                    </div>

                                    {/* Preview Card */}
                                    <div className="p-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
                                        <p className="text-xs text-[var(--brand-light)]/50 uppercase tracking-wider mb-2 font-medium">Notification Preview</p>
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0">
                                                <Bell className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-[var(--brand-light)] truncate">
                                                    {pushTitle || 'New post'}
                                                </p>
                                                <p className="text-sm text-[var(--brand-light)]/60 line-clamp-2">
                                                    {pushMessage || title || 'Your post title will appear here'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Editable Fields */}
                                    <div>
                                        <label className={labelClasses}>
                                            Notification Title
                                            <span className="ml-2 text-xs font-normal text-[var(--brand-primary)]">✎ Editable</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. New Update!"
                                            className={inputClasses('pushTitle')}
                                            value={pushTitle} 
                                            onChange={e => setPushTitle(e.target.value)} 
                                            onFocus={() => setFocusedField('pushTitle')}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>
                                            Notification Message
                                            <span className="ml-2 text-xs font-normal text-[var(--brand-primary)]">✎ Editable</span>
                                        </label>
                                        <textarea 
                                            placeholder="Leave empty to use post title"
                                            className={`${inputClasses('pushMessage')} h-20 py-3 resize-none`}
                                            value={pushMessage} 
                                            onChange={e => setPushMessage(e.target.value)} 
                                            onFocus={() => setFocusedField('pushMessage')}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                        <p className="text-xs text-[var(--brand-light)]/40 mt-1">
                                            If left empty, the post title will be used
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <Bell className="w-10 h-10 text-[var(--brand-light)]/20 mx-auto mb-2" />
                                    <p className="text-sm text-[var(--brand-light)]/50">
                                        Enable push notification to alert users about this post
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setSendPush(true)}
                                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-sm font-medium hover:bg-[var(--brand-primary)]/20 transition-colors"
                                    >
                                        <Bell className="w-4 h-4" />
                                        Enable Notification
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- PUBLISH STATUS --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-blue)] flex items-center justify-center">
                                    <Send className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">Publish</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">Choose when to publish</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4">
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { value: 'DRAFT', icon: EyeOff, label: 'Save as Draft', color: 'blue' },
                                    { value: 'PUBLISHED', icon: Eye, label: 'Publish Now', color: 'green' },
                                    { value: 'SCHEDULED', icon: Clock, label: 'Schedule', color: 'primary' }
                                ].map(({ value, icon: Icon, label, color }) => (
                                    <button 
                                        key={value} 
                                        type="button" 
                                        onClick={() => setStatus(value as any)} 
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                                            status === value 
                                                ? `bg-[var(--brand-${color})] text-white` 
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
                                    <label className={labelClasses}>Schedule Date & Time</label>
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
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-pink)] flex items-center justify-center">
                                        <Settings className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-[var(--brand-light)]">Template Settings</h2>
                                        <p className="text-sm text-[var(--brand-light)]/50">These settings will be applied from "{selectedTemplate.name}"</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-3 rounded-xl bg-[var(--dark-700)]">
                                        <p className="text-xs text-[var(--brand-light)]/50 mb-1">Target Audience</p>
                                        <p className="text-sm text-[var(--brand-light)]">{selectedTemplate.target_summary}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-[var(--dark-700)]">
                                        <p className="text-xs text-[var(--brand-light)]/50 mb-1">Settings</p>
                                        <p className="text-sm text-[var(--brand-light)]">{selectedTemplate.settings_summary}</p>
                                    </div>
                                    {selectedTemplate.is_pinned_default && (
                                        <div className="p-3 rounded-xl bg-[var(--brand-peach)]/10 border border-[var(--brand-peach)]/30">
                                            <div className="flex items-center gap-2 text-[var(--brand-peach)]">
                                                <Pin className="w-4 h-4" />
                                                <span className="text-sm font-medium">Will be pinned</span>
                                            </div>
                                        </div>
                                    )}
                                    {sendPush && (
                                        <div className="p-3 rounded-xl bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30">
                                            <div className="flex items-center gap-2 text-[var(--brand-primary)]">
                                                <Bell className="w-4 h-4" />
                                                <span className="text-sm font-medium">
                                                    Push notification: {pushTitle || 'New post'}
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
                            onClick={() => router.push(getBasePath())}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold 
                                     bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)]
                                     hover:bg-[var(--dark-600)] hover:border-[var(--dark-400)] transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading || !selectedTemplate || !title.trim()} 
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold 
                                     bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-purple)] transition-all
                                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading && <Sparkles className="w-4 h-4 animate-pulse" />}
                            {loading ? 'Creating...' : status === 'PUBLISHED' ? 'Publish Post' : status === 'SCHEDULED' ? 'Schedule Post' : 'Save Draft'}
                        </button>
                    </div>

                </form>
                <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} darkMode duration={1250} />
            </div>
        </div>
    );
}

