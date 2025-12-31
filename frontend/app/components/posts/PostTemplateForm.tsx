'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { 
    ArrowLeft, Globe, Building, Users, FileText, Image, Video,
    CheckCircle2, Lightbulb, Sparkles, Bell, MessageSquare, Pin,
    Target, Settings, Megaphone, Calendar, Star, PartyPopper, Info,
    AlertTriangle, Heart, Trophy, Rocket, Search, X, Check
} from 'lucide-react';
import api from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../context/AuthContext';

interface PostTemplateFormProps {
    initialData?: any;
    role: 'super' | 'municipality' | 'club';
    onSuccess: () => void;
}

// Icon options
const ICON_OPTIONS = [
    { value: 'MEGAPHONE', label: '📢 Announcement', icon: Megaphone },
    { value: 'CALENDAR', label: '📅 Event', icon: Calendar },
    { value: 'STAR', label: '⭐ Featured', icon: Star },
    { value: 'BELL', label: '🔔 Reminder', icon: Bell },
    { value: 'PARTY', label: '🎉 Celebration', icon: PartyPopper },
    { value: 'INFO', label: 'ℹ️ Information', icon: Info },
    { value: 'WARNING', label: '⚠️ Important', icon: AlertTriangle },
    { value: 'HEART', label: '❤️ Community', icon: Heart },
    { value: 'TROPHY', label: '🏆 Achievement', icon: Trophy },
    { value: 'ROCKET', label: '🚀 Update', icon: Rocket },
];

// All grades from 1-13 (common in Nordic countries)
const ALL_GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export default function PostTemplateForm({ initialData, role, onSuccess }: PostTemplateFormProps) {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const t = useTranslations('postTemplatesManager.form');
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

    // --- Group Search ---
    const [groupSearchQuery, setGroupSearchQuery] = useState('');
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);

    // --- Basic Info ---
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [icon, setIcon] = useState(initialData?.icon || 'MEGAPHONE');
    const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

    // --- Distribution (Scope) State ---
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

    // --- Default Media Type ---
    const [defaultPostType, setDefaultPostType] = useState(initialData?.default_post_type || 'TEXT');

    // --- Targeting (Audience) ---
    const [memberType, setMemberType] = useState(initialData?.target_member_type || 'BOTH');
    const [minAge, setMinAge] = useState(initialData?.target_min_age?.toString() || '');
    const [maxAge, setMaxAge] = useState(initialData?.target_max_age?.toString() || '');
    const [selectedGrades, setSelectedGrades] = useState<number[]>(initialData?.target_grades || []);
    const [selectedGenders, setSelectedGenders] = useState<string[]>(initialData?.target_genders || []);
    const [selectedGroups, setSelectedGroups] = useState<number[]>(initialData?.target_groups || []);
    const [selectedInterests, setSelectedInterests] = useState<number[]>(initialData?.target_interests || []);
    const [customFieldRules, setCustomFieldRules] = useState<Record<string, any>>(initialData?.target_custom_fields || {});

    // --- Settings ---
    const [allowComments, setAllowComments] = useState(initialData?.allow_comments ?? true);
    const [requireModeration, setRequireModeration] = useState(initialData?.require_moderation ?? false);
    const [allowReplies, setAllowReplies] = useState(initialData?.allow_replies ?? true);
    const [limitComments, setLimitComments] = useState(initialData?.limit_comments_per_user || 0);
    const [sendPush, setSendPush] = useState(initialData?.send_push_notification || false);
    const [defaultPushTitle, setDefaultPushTitle] = useState(initialData?.default_push_title || '');
    const [defaultPushMessage, setDefaultPushMessage] = useState(initialData?.default_push_message || '');
    const [isPinnedDefault, setIsPinnedDefault] = useState(initialData?.is_pinned_default || false);

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

                // Fetch custom fields (only types that can be used for targeting)
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

    // Helper to extract ID from a field that could be an object or number
    const extractId = (field: any): number | null => {
        if (!field) return null;
        if (typeof field === 'number') return field;
        if (typeof field === 'object' && field.id) return field.id;
        return null;
    };

    // Filter groups based on selected municipalities/clubs
    const filteredGroups = useMemo(() => {
        // If global or no specific selection, show all groups
        if (distributionMode === 'GLOBAL') {
            return availableGroups;
        }
        
        // Filter by municipality
        if (distributionMode === 'MUNICIPALITY' && selectedMunis.length > 0) {
            return availableGroups.filter(group => {
                // Group belongs to one of the selected municipalities directly
                const groupMuniId = extractId(group.municipality);
                if (groupMuniId && selectedMunis.includes(groupMuniId)) return true;
                
                // Group belongs to a club - check if that club is in selected municipalities
                const groupClubId = extractId(group.club);
                if (groupClubId) {
                    // First check if group.club is an object with municipality
                    if (typeof group.club === 'object' && group.club.municipality) {
                        const clubMuniId = extractId(group.club.municipality);
                        if (clubMuniId && selectedMunis.includes(clubMuniId)) return true;
                    }
                    // Otherwise look up the club
                    const club = clubs.find(c => c.id === groupClubId);
                    if (club) {
                        const clubMuniId = extractId(club.municipality);
                        if (clubMuniId && selectedMunis.includes(clubMuniId)) return true;
                    }
                }
                return false;
            });
        }
        
        // Filter by clubs
        if (distributionMode === 'CLUB' && selectedClubs.length > 0) {
            return availableGroups.filter(group => {
                // Group belongs to one of the selected clubs
                const groupClubId = extractId(group.club);
                if (groupClubId && selectedClubs.includes(groupClubId)) return true;
                return false;
            });
        }
        
        return availableGroups;
    }, [availableGroups, distributionMode, selectedMunis, selectedClubs, clubs]);

    // Search filtered groups
    const searchFilteredGroups = useMemo(() => {
        if (!groupSearchQuery.trim()) return filteredGroups;
        const query = groupSearchQuery.toLowerCase();
        return filteredGroups.filter(group => 
            group.name.toLowerCase().includes(query)
        );
    }, [filteredGroups, groupSearchQuery]);

    // Progress calculation
    const calculateCompletion = useCallback(() => {
        const requiredFields = [name];
        const filled = requiredFields.filter(f => f && f.toString().trim()).length;
        return Math.round((filled / requiredFields.length) * 100);
    }, [name]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const payload: any = {
            name,
            description,
            icon,
            is_active: isActive,
            default_post_type: defaultPostType,
            target_member_type: memberType,
            target_min_age: minAge ? parseInt(minAge) : null,
            target_max_age: maxAge ? parseInt(maxAge) : null,
            target_grades: selectedGrades,
            target_genders: selectedGenders,
            target_groups: selectedGroups,
            target_interests: selectedInterests,
            target_custom_fields: customFieldRules,
            allow_comments: allowComments,
            require_moderation: requireModeration,
            allow_replies: allowReplies,
            limit_comments_per_user: limitComments,
            send_push_notification: sendPush,
            default_push_title: defaultPushTitle,
            default_push_message: defaultPushMessage,
            is_pinned_default: isPinnedDefault,
        };

        // Distribution
        if (role === 'super') {
            if (distributionMode === 'GLOBAL') {
                payload.is_global = true;
                payload.target_municipalities = [];
                payload.target_clubs = [];
            } else if (distributionMode === 'MUNICIPALITY') {
                payload.is_global = false;
                payload.target_municipalities = selectedMunis;
                payload.target_clubs = [];
            } else {
                payload.is_global = false;
                payload.target_municipalities = [];
                payload.target_clubs = selectedClubs;
            }
        } else if (role === 'municipality') {
            payload.is_global = false;
            if (distributionMode === 'MUNICIPALITY') {
                const muniId = currentUser?.assigned_municipality 
                    ? (typeof currentUser.assigned_municipality === 'object' ? currentUser.assigned_municipality.id : currentUser.assigned_municipality)
                    : null;
                payload.target_municipalities = muniId ? [muniId] : [];
                payload.target_clubs = [];
            } else {
                payload.target_municipalities = [];
                payload.target_clubs = selectedClubs;
            }
        } else {
            payload.is_global = false;
            payload.target_municipalities = [];
            const clubId = currentUser?.assigned_club
                ? (typeof currentUser.assigned_club === 'object' ? currentUser.assigned_club.id : currentUser.assigned_club)
                : null;
            payload.target_clubs = clubId ? [clubId] : [];
        }

        try {
            if (initialData) {
                await api.patch(`/post-templates/${initialData.id}/`, payload);
                success(t('toast.templateUpdated'));
            } else {
                await api.post('/post-templates/', payload);
                success(t('toast.templateCreated'));
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
        if (role === 'super') return '/admin/super/posts/templates';
        if (role === 'municipality') return '/admin/municipality/posts/templates';
        return '/admin/club/posts/templates';
    };

    // Check if a group is available for selection based on distribution
    const isGroupAvailable = (group: any) => {
        if (distributionMode === 'GLOBAL') return true;
        
        if (distributionMode === 'MUNICIPALITY' && selectedMunis.length > 0) {
            // Direct municipality match
            const groupMuniId = extractId(group.municipality);
            if (groupMuniId && selectedMunis.includes(groupMuniId)) return true;
            
            // Club's municipality match
            const groupClubId = extractId(group.club);
            if (groupClubId) {
                // Check if group.club is an object with municipality
                if (typeof group.club === 'object' && group.club.municipality) {
                    const clubMuniId = extractId(group.club.municipality);
                    if (clubMuniId && selectedMunis.includes(clubMuniId)) return true;
                }
                // Otherwise look up the club
                const club = clubs.find(c => c.id === groupClubId);
                if (club) {
                    const clubMuniId = extractId(club.municipality);
                    if (clubMuniId && selectedMunis.includes(clubMuniId)) return true;
                }
            }
            return false;
        }
        
        if (distributionMode === 'CLUB' && selectedClubs.length > 0) {
            const groupClubId = extractId(group.club);
            if (groupClubId && selectedClubs.includes(groupClubId)) return true;
            return false;
        }
        
        return true;
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
                                <span className="text-sm font-medium">{t('progress.readyToSave')}</span>
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

                <form onSubmit={handleSubmit}>

                    {/* --- TEMPLATE INFO --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('templateInfo.title')}</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">{t('templateInfo.description')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-6">
                            {/* Name */}
                            <div>
                                <label className={labelClasses}>{t('templateInfo.name')} <span className="text-[var(--brand-red)]">*</span></label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder={t('templateInfo.namePlaceholder')}
                                    className={inputClasses('name')}
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    onFocus={() => setFocusedField('name')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className={labelClasses}>{t('templateInfo.descriptionLabel')}</label>
                                <textarea 
                                    placeholder={t('templateInfo.descriptionPlaceholder')}
                                    className={`${inputClasses('description')} h-24 py-3 resize-none`}
                                    value={description} 
                                    onChange={e => setDescription(e.target.value)} 
                                    onFocus={() => setFocusedField('description')}
                                    onBlur={() => setFocusedField(null)}
                                />
                                <p className="text-xs text-[var(--brand-light)]/40 mt-2">
                                    {t('templateInfo.descriptionHint')}
                                </p>
                            </div>

                            {/* Icon */}
                            <div>
                                <label className={labelClasses}>{t('templateInfo.icon')}</label>
                                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                                    {ICON_OPTIONS.map(opt => {
                                        const iconLabel = t(`templateInfo.iconLabels.${opt.value}` as any) || opt.label;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setIcon(opt.value)}
                                                className={`w-full aspect-square rounded-xl flex items-center justify-center text-lg transition-all ${
                                                    icon === opt.value 
                                                        ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] ring-2 ring-[var(--brand-primary)] ring-offset-2 ring-offset-[var(--dark-800)]' 
                                                        : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                                                }`}
                                                title={iconLabel}
                                            >
                                                <opt.icon className="w-5 h-5" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Active Status */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
                                <div>
                                    <p className="font-medium text-[var(--brand-light)]">{t('templateInfo.activeTemplate')}</p>
                                    <p className="text-sm text-[var(--brand-light)]/50">{t('templateInfo.activeTemplateHint')}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsActive(!isActive)}
                                    className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${
                                        isActive ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-500)]'
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                                        isActive ? 'translate-x-6' : 'translate-x-0'
                                    }`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* --- DISTRIBUTION --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-primary)] flex items-center justify-center">
                                    <Globe className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('distribution.title')}</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">{t('distribution.description')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4">
                            {role === 'super' && (
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { mode: 'GLOBAL', icon: Globe, label: t('distribution.global') },
                                        { mode: 'MUNICIPALITY', icon: Building, label: t('distribution.municipalities') },
                                        { mode: 'CLUB', icon: Users, label: t('distribution.clubs') }
                                    ].map(({ mode, icon: Icon, label }) => (
                                        <button 
                                            key={mode} 
                                            type="button" 
                                            onClick={() => setDistributionMode(mode as any)} 
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                                                distributionMode === mode 
                                                    ? 'bg-[var(--brand-primary)] text-white' 
                                                    : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {role === 'municipality' && (
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { mode: 'MUNICIPALITY', icon: Building, label: t('distribution.allMyMunicipality') },
                                        { mode: 'CLUB', icon: Users, label: t('distribution.specificClubs') }
                                    ].map(({ mode, icon: Icon, label }) => (
                                        <button 
                                            key={mode} 
                                            type="button" 
                                            onClick={() => setDistributionMode(mode as any)} 
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                                                distributionMode === mode 
                                                    ? 'bg-[var(--brand-primary)] text-white' 
                                                    : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {role === 'club' && (
                                <div className="p-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
                                    <div className="flex items-center gap-2 text-[var(--brand-light)]">
                                        <Users className="w-5 h-5 text-[var(--brand-primary)]" />
                                        <span className="font-medium">{t('distribution.yourClubMembers')}</span>
                                    </div>
                                    <p className="text-sm text-[var(--brand-light)]/50 mt-1">
                                        {t('distribution.yourClubMembersHint')}
                                    </p>
                                </div>
                            )}

                            {/* Municipality Selection (Super Admin) */}
                            {role === 'super' && distributionMode === 'MUNICIPALITY' && (
                                <div className="pt-4 border-t border-[var(--dark-600)]">
                                    <label className={labelClasses}>{t('distribution.selectMunicipalities')}</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                        {municipalities.map(muni => (
                                            <button
                                                key={muni.id}
                                                type="button"
                                                onClick={() => toggleSelection(muni.id, selectedMunis, setSelectedMunis)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                                                    selectedMunis.includes(muni.id)
                                                        ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30'
                                                        : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                                                }`}
                                            >
                                                <Building className="w-4 h-4" />
                                                <span className="truncate">{muni.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Club Selection */}
                            {((role === 'super' && distributionMode === 'CLUB') || (role === 'municipality' && distributionMode === 'CLUB')) && (
                                <div className="pt-4 border-t border-[var(--dark-600)]">
                                    <label className={labelClasses}>{t('distribution.selectClubs')}</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                        {clubs.map(club => (
                                            <button
                                                key={club.id}
                                                type="button"
                                                onClick={() => toggleSelection(club.id, selectedClubs, setSelectedClubs)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                                                    selectedClubs.includes(club.id)
                                                        ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30'
                                                        : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                                                }`}
                                            >
                                                <Users className="w-4 h-4" />
                                                <span className="truncate">{club.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- DEFAULT MEDIA TYPE --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-pink)] to-[var(--brand-purple)] flex items-center justify-center">
                                    <Image className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('defaultMediaType.title')}</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">{t('defaultMediaType.description')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6">
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { type: 'TEXT', icon: FileText, label: t('defaultMediaType.textOnly') },
                                    { type: 'IMAGE', icon: Image, label: t('defaultMediaType.withImages') },
                                    { type: 'VIDEO', icon: Video, label: t('defaultMediaType.withVideo') }
                                ].map(({ type, icon: Icon, label }) => (
                                    <button 
                                        key={type} 
                                        type="button" 
                                        onClick={() => setDefaultPostType(type)} 
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                                            defaultPostType === type 
                                                ? 'bg-[var(--brand-primary)] text-white' 
                                                : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- TARGETING --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-peach)] to-[var(--brand-pink)] flex items-center justify-center">
                                    <Target className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('audienceTargeting.title')}</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">{t('audienceTargeting.description')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-6">
                            {/* Member Type */}
                            <div>
                                <label className={labelClasses}>{t('audienceTargeting.memberType')}</label>
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { value: 'BOTH', label: t('audienceTargeting.everyone') },
                                        { value: 'YOUTH', label: t('audienceTargeting.youthOnly') },
                                        { value: 'GUARDIAN', label: t('audienceTargeting.guardiansOnly') }
                                    ].map(({ value, label }) => (
                                        <button 
                                            key={value} 
                                            type="button" 
                                            onClick={() => setMemberType(value)} 
                                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                                memberType === value 
                                                    ? 'bg-[var(--brand-primary)] text-white' 
                                                    : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
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
                                    <label className={labelClasses}>{t('audienceTargeting.minAge')}</label>
                                    <input 
                                        type="number" 
                                        placeholder={t('audienceTargeting.agePlaceholder')}
                                        className={inputClasses('minAge')}
                                        value={minAge} 
                                        onChange={e => setMinAge(e.target.value)} 
                                        onFocus={() => setFocusedField('minAge')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </div>
                                <div>
                                    <label className={labelClasses}>{t('audienceTargeting.maxAge')}</label>
                                    <input 
                                        type="number" 
                                        placeholder={t('audienceTargeting.agePlaceholder')}
                                        className={inputClasses('maxAge')}
                                        value={maxAge} 
                                        onChange={e => setMaxAge(e.target.value)} 
                                        onFocus={() => setFocusedField('maxAge')}
                                        onBlur={() => setFocusedField(null)}
                                    />
                                </div>
                            </div>

                            {/* Grades - All grades from 1-13 */}
                            <div>
                                <label className={labelClasses}>{t('audienceTargeting.grades')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {ALL_GRADES.map(grade => (
                                        <button
                                            key={grade}
                                            type="button"
                                            onClick={() => toggleSelection(grade, selectedGrades, setSelectedGrades)}
                                            className={`w-10 h-10 rounded-xl font-medium transition-all text-sm ${
                                                selectedGrades.includes(grade)
                                                    ? 'bg-[var(--brand-primary)] text-white'
                                                    : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                                            }`}
                                        >
                                            {grade}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Gender */}
                            <div>
                                <label className={labelClasses}>{t('audienceTargeting.gender')}</label>
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { value: 'MALE', label: t('audienceTargeting.male') },
                                        { value: 'FEMALE', label: t('audienceTargeting.female') },
                                        { value: 'OTHER', label: t('audienceTargeting.other') }
                                    ].map(({ value, label }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => toggleSelection(value, selectedGenders, setSelectedGenders)}
                                            className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                                selectedGenders.includes(value)
                                                    ? 'bg-[var(--brand-primary)] text-white'
                                                    : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Groups with Search */}
                            {availableGroups.length > 0 && (
                                <div>
                                    <label className={labelClasses}>{t('audienceTargeting.groups')}</label>
                                    
                                    {/* Selected Groups */}
                                    {selectedGroups.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {selectedGroups.map(groupId => {
                                                const group = availableGroups.find(g => g.id === groupId);
                                                if (!group) return null;
                                                return (
                                                    <span 
                                                        key={groupId}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-sm border border-[var(--brand-primary)]/30"
                                                    >
                                                        {group.name}
                                                        <button 
                                                            type="button"
                                                            onClick={() => toggleSelection(groupId, selectedGroups, setSelectedGroups)}
                                                            className="hover:text-[var(--brand-red)] transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Search Input */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-light)]/40" />
                                        <input
                                            type="text"
                                            placeholder={t('audienceTargeting.searchGroups')}
                                            className={`${inputClasses('groupSearch')} pl-10`}
                                            value={groupSearchQuery}
                                            onChange={e => setGroupSearchQuery(e.target.value)}
                                            onFocus={() => {
                                                setFocusedField('groupSearch');
                                                setShowGroupDropdown(true);
                                            }}
                                            onBlur={() => {
                                                setFocusedField(null);
                                                // Delay hiding to allow click
                                                setTimeout(() => setShowGroupDropdown(false), 200);
                                            }}
                                        />
                                    </div>

                                    {/* Dropdown */}
                                    {showGroupDropdown && searchFilteredGroups.length > 0 && (
                                        <div className="mt-2 max-h-48 overflow-y-auto bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl">
                                            {searchFilteredGroups.map(group => {
                                                const isSelected = selectedGroups.includes(group.id);
                                                const isAvailable = isGroupAvailable(group);
                                                return (
                                                    <button
                                                        key={group.id}
                                                        type="button"
                                                        disabled={!isAvailable}
                                                        onClick={() => {
                                                            if (isAvailable) {
                                                                toggleSelection(group.id, selectedGroups, setSelectedGroups);
                                                            }
                                                        }}
                                                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all ${
                                                            !isAvailable 
                                                                ? 'opacity-40 cursor-not-allowed' 
                                                                : isSelected 
                                                                    ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' 
                                                                    : 'hover:bg-[var(--dark-600)] text-[var(--brand-light)]'
                                                        }`}
                                                    >
                                                        <span className="text-sm">{group.name}</span>
                                                        {isSelected && <Check className="w-4 h-4 text-[var(--brand-primary)]" />}
                                                        {!isAvailable && (
                                                            <span className="text-xs text-[var(--brand-light)]/40">
                                                                {t('audienceTargeting.notInScope')}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {showGroupDropdown && searchFilteredGroups.length === 0 && groupSearchQuery && (
                                        <div className="mt-2 p-4 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl text-center text-sm text-[var(--brand-light)]/50">
                                            {t('audienceTargeting.noGroupsFound', { query: groupSearchQuery })}
                                        </div>
                                    )}

                                    {distributionMode !== 'GLOBAL' && (selectedMunis.length > 0 || selectedClubs.length > 0) && (
                                        <p className="text-xs text-[var(--brand-light)]/40 mt-2">
                                            {t('audienceTargeting.onlyGroupsFrom', { 
                                                type: distributionMode === 'MUNICIPALITY' ? t('audienceTargeting.municipalities') : t('audienceTargeting.clubs')
                                            })}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Interests */}
                            {availableInterests.length > 0 && (
                                <div>
                                    <label className={labelClasses}>{t('audienceTargeting.interests')}</label>
                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                        {availableInterests.map(interest => (
                                            <button
                                                key={interest.id}
                                                type="button"
                                                onClick={() => toggleSelection(interest.id, selectedInterests, setSelectedInterests)}
                                                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                                    selectedInterests.includes(interest.id)
                                                        ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30'
                                                        : 'bg-[var(--dark-700)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                                                }`}
                                            >
                                                {interest.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Custom Fields */}
                            {availableCustomFields.length > 0 && (
                                <div>
                                    <label className={labelClasses}>{t('audienceTargeting.customFieldTargeting')}</label>
                                    <p className="text-xs text-[var(--brand-light)]/40 mb-3">
                                        {t('audienceTargeting.customFieldHint')}
                                    </p>
                                    <div className="space-y-3">
                                        {availableCustomFields.map(field => (
                                            <div key={field.id} className="p-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-[var(--brand-light)]">
                                                            {field.label || field.name}
                                                        </p>
                                                        <p className="text-xs text-[var(--brand-light)]/50">
                                                            {field.field_type === 'BOOLEAN' ? t('audienceTargeting.yesNoField') : 
                                                             field.field_type === 'SINGLE_SELECT' ? t('audienceTargeting.singleChoice') : t('audienceTargeting.multipleChoice')}
                                                        </p>
                                                    </div>
                                                    {customFieldRules[field.id] && (
                                                        <span className="px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-xs font-medium">
                                                            {t('audienceTargeting.active')}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {field.field_type === 'BOOLEAN' && (
                                                    <div className="flex gap-2">
                                                        {[
                                                            { value: '', label: t('audienceTargeting.any'), desc: t('audienceTargeting.anyDesc') },
                                                            { value: 'true', label: t('audienceTargeting.yes'), desc: t('audienceTargeting.yesDesc') },
                                                            { value: 'false', label: t('audienceTargeting.no'), desc: t('audienceTargeting.noDesc') }
                                                        ].map(opt => (
                                                            <button
                                                                key={opt.value}
                                                                type="button"
                                                                onClick={() => handleCustomFieldChange(field.id, opt.value)}
                                                                className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                                                    (customFieldRules[field.id] || '') === opt.value
                                                                        ? 'bg-[var(--brand-primary)] text-white'
                                                                        : 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/30'
                                                                }`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {(field.field_type === 'SINGLE_SELECT' || field.field_type === 'MULTI_SELECT') && field.options && (
                                                    <select
                                                        className="w-full h-11 px-4 rounded-xl bg-[var(--dark-600)] border border-[var(--dark-500)] text-[var(--brand-light)] outline-none focus:border-[var(--brand-primary)] transition-colors"
                                                        value={customFieldRules[field.id] || ''}
                                                        onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                                                    >
                                                        <option value="">{t('audienceTargeting.anyValue')}</option>
                                                        {field.options.map((opt: string) => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- SETTINGS --- */}
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                        <div className="px-4 sm:px-6 py-5 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-blue)] flex items-center justify-center">
                                    <Settings className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)]">{t('defaultSettings.title')}</h2>
                                    <p className="text-sm text-[var(--brand-light)]/50">{t('defaultSettings.description')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4">
                            {/* Comments */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="w-5 h-5 text-[var(--brand-primary)]" />
                                    <div>
                                        <p className="font-medium text-[var(--brand-light)]">{t('defaultSettings.allowComments')}</p>
                                        <p className="text-sm text-[var(--brand-light)]/50">{t('defaultSettings.allowCommentsHint')}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAllowComments(!allowComments)}
                                    className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${
                                        allowComments ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-500)]'
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                                        allowComments ? 'translate-x-6' : 'translate-x-0'
                                    }`} />
                                </button>
                            </div>

                            {allowComments && (
                                <>
                                    {/* Moderation */}
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
                                        <div>
                                            <p className="font-medium text-[var(--brand-light)]">{t('defaultSettings.requireModeration')}</p>
                                            <p className="text-sm text-[var(--brand-light)]/50">{t('defaultSettings.requireModerationHint')}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setRequireModeration(!requireModeration)}
                                            className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${
                                                requireModeration ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-500)]'
                                            }`}
                                        >
                                            <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                                                requireModeration ? 'translate-x-6' : 'translate-x-0'
                                            }`} />
                                        </button>
                                    </div>

                                    {/* Replies */}
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
                                        <div>
                                            <p className="font-medium text-[var(--brand-light)]">{t('defaultSettings.allowReplies')}</p>
                                            <p className="text-sm text-[var(--brand-light)]/50">{t('defaultSettings.allowRepliesHint')}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAllowReplies(!allowReplies)}
                                            className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${
                                                allowReplies ? 'bg-[var(--brand-green)]' : 'bg-[var(--dark-500)]'
                                            }`}
                                        >
                                            <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                                                allowReplies ? 'translate-x-6' : 'translate-x-0'
                                            }`} />
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Pinned */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
                                <div className="flex items-center gap-3">
                                    <Pin className="w-5 h-5 text-[var(--brand-peach)]" />
                                    <div>
                                        <p className="font-medium text-[var(--brand-light)]">{t('defaultSettings.pinByDefault')}</p>
                                        <p className="text-sm text-[var(--brand-light)]/50">{t('defaultSettings.pinByDefaultHint')}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsPinnedDefault(!isPinnedDefault)}
                                    className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${
                                        isPinnedDefault ? 'bg-[var(--brand-peach)]' : 'bg-[var(--dark-500)]'
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                                        isPinnedDefault ? 'translate-x-6' : 'translate-x-0'
                                    }`} />
                                </button>
                            </div>

                            {/* Push Notification */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)]">
                                <div className="flex items-center gap-3">
                                    <Bell className="w-5 h-5 text-[var(--brand-primary)]" />
                                    <div>
                                        <p className="font-medium text-[var(--brand-light)]">{t('defaultSettings.pushNotification')}</p>
                                        <p className="text-sm text-[var(--brand-light)]/50">{t('defaultSettings.pushNotificationHint')}</p>
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

                            {sendPush && (
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClasses}>{t('defaultSettings.pushTitle')}</label>
                                        <input 
                                            type="text" 
                                            placeholder={t('defaultSettings.pushTitlePlaceholder')}
                                            className={inputClasses('pushTitle')}
                                            value={defaultPushTitle} 
                                            onChange={e => setDefaultPushTitle(e.target.value)} 
                                            onFocus={() => setFocusedField('pushTitle')}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                        <p className="text-xs text-[var(--brand-light)]/40 mt-1">
                                            {t('defaultSettings.pushTitleHint')}
                                        </p>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>{t('defaultSettings.pushMessage')}</label>
                                        <textarea 
                                            placeholder={t('defaultSettings.pushMessagePlaceholder')}
                                            className={`${inputClasses('pushMessage')} h-20 py-3 resize-none`}
                                            value={defaultPushMessage} 
                                            onChange={e => setDefaultPushMessage(e.target.value)} 
                                            onFocus={() => setFocusedField('pushMessage')}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                        <p className="text-xs text-[var(--brand-light)]/40 mt-1">
                                            {t('defaultSettings.pushMessageHint')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- TIPS --- */}
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
                            <p>
                                {t('quickTips.intro')}
                            </p>
                            <ul className="list-disc list-inside space-y-1 pl-4">
                                <li>{t('quickTips.tip1')}</li>
                                <li>{t('quickTips.tip2')}</li>
                                <li>{t('quickTips.tip3')}</li>
                                <li>{t('quickTips.tip4')}</li>
                            </ul>
                        </div>
                    </div>

                    {/* --- ACTIONS --- */}
                    <div className="flex flex-col sm:flex-row justify-end gap-3 px-4 sm:px-0 py-4 sm:py-0 mb-8">
                        <button 
                            type="button" 
                            onClick={() => router.push(getBasePath())}
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
                                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading && <Sparkles className="w-4 h-4 animate-pulse" />}
                            {loading ? t('actions.saving') : initialData ? t('actions.updateTemplate') : t('actions.createTemplate')}
                        </button>
                    </div>

                </form>
                </div>
        </div>
    );
}
