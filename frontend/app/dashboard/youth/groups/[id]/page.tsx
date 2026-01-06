'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Group } from '@/types/organization';
import { Post } from '@/types/post';
import NavBar from '@/app/components/NavBar';
import PostCard from '@/app/components/posts/PostCard';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import { getMediaUrl } from '@/app/utils';
import SuccessModal from '@/app/components/SuccessModal';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { Users, Globe, MapPin, Building2, Calendar, UserCheck, Shield, ArrowLeft, AlertCircle, X } from 'lucide-react';


export default function GroupDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const { theme } = useTheme();
    const t = useTranslations('groups');
    const tSidebar = useTranslations('sidebar');
    const tCommon = useTranslations('common');
    const groupId = id as string;
    
    const [mounted, setMounted] = useState(false);
    const [group, setGroup] = useState<Group | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // Modal states
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (groupId) {
            fetchGroupDetails();
        }
    }, [groupId]);

    useEffect(() => {
        if (group) {
            const membershipStatus = typeof group.membership_status === 'object' 
                ? group.membership_status?.status 
                : group.membership_status;
            if (membershipStatus === 'APPROVED') {
                fetchPosts();
            }
        }
    }, [group]);

    const fetchGroupDetails = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/groups/${groupId}/`);
            setGroup(res.data);
        } catch (error) {
            console.error("Failed to fetch group", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPosts = async () => {
        try {
            setLoadingPosts(true);
            let groupPosts: Post[] = [];
            
            try {
                const url = `/posts/group_feed/?group=${groupId}`;
                const res = await api.get(url);
                groupPosts = res.data.results || res.data;
                if (!Array.isArray(groupPosts)) {
                    groupPosts = [];
                }
            } catch (groupFeedError: any) {
                if (groupFeedError?.response?.status === 404) {
                    console.warn('Group feed endpoint returned 404 - falling back to feed filtering.');
                }
                
                try {
                    const res = await api.get('/posts/feed/');
                    let allPosts = res.data.results || res.data;
                    if (!Array.isArray(allPosts)) {
                        allPosts = [];
                    }
                    
                    const groupIdNum = Number(groupId);
                    groupPosts = allPosts.filter((post: Post) => {
                        if (!post.target_groups || !Array.isArray(post.target_groups)) {
                            return false;
                        }
                        return post.target_groups.some((id: number) => id === groupIdNum);
                    });
                } catch (feedError: any) {
                    console.error("Failed to fetch posts feed", feedError);
                    groupPosts = [];
                }
            }
            
            setPosts(groupPosts);
        } catch (error: any) {
            console.error("Failed to fetch posts", error);
            setPosts([]);
        } finally {
            setLoadingPosts(false);
        }
    };

    const handleJoin = async () => {
        if (!group) return;
        try {
            const res = await api.post(`/groups/${group.id}/join/`);
            setSuccessMessage(res.data.message || t('successfullyJoinedGroup'));
            setShowSuccessModal(true);
            await fetchGroupDetails();
            if (res.data.status === 'APPROVED') {
                fetchPosts();
            }
        } catch (err: any) {
            setErrorMessage(err.response?.data?.message || t('failedToJoinGroup'));
            setShowErrorModal(true);
        }
    };

    const handleLeaveClick = () => {
        setShowLeaveConfirmModal(true);
    };

    const handleLeaveConfirm = async () => {
        if (!group) return;
        setIsLeaving(true);
        try {
            await api.post(`/groups/${group.id}/leave/`);
            setSuccessMessage(t('successfullyLeftGroup'));
            setShowSuccessModal(true);
            setShowLeaveConfirmModal(false);
            setTimeout(() => {
                router.back();
            }, 1500);
        } catch (err: any) {
            setIsLeaving(false);
            setShowLeaveConfirmModal(false);
            setErrorMessage(err.response?.data?.message || t('failedToLeaveGroup'));
            setShowErrorModal(true);
        }
    };


    const darkModeEarly = !mounted || theme === 'dark';

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--dark-900)]">
                <NavBar darkMode={darkModeEarly} showBackButton={true} onMenuToggle={() => setIsSidebarOpen(true)} />
                <div className="flex justify-center items-center min-h-[50vh]">
                    <div className="w-12 h-12 border-4 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="min-h-screen bg-[var(--dark-900)]">
                <NavBar darkMode={darkModeEarly} showBackButton={true} onMenuToggle={() => setIsSidebarOpen(true)} />
                <div className="p-10 text-center">
                    <div className="w-20 h-20 bg-[var(--brand-red)]/20 rounded-none sm:rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-10 h-10 text-[var(--brand-red)]" />
                    </div>
                    <p className="text-[var(--brand-red)] text-xl font-bold mb-4 font-heading">{t('groupNotFound')}</p>
                    <button 
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 bg-[var(--brand-primary)] text-[var(--dark-900)] px-5 py-2.5 rounded-none sm:rounded-xl font-bold hover:bg-[var(--brand-primary)]/90 transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" /> {t('goBack')}
                    </button>
                </div>
            </div>
        );
    }

    const membershipStatus = typeof group.membership_status === 'object' 
        ? group.membership_status?.status 
        : group.membership_status;
    const rejectionCount = typeof group.membership_status === 'object' 
        ? (group.membership_status?.rejection_count || 0)
        : 0;
    
    const isMember = membershipStatus === 'APPROVED';
    const isPending = membershipStatus === 'PENDING';
    const isRejected = membershipStatus === 'REJECTED';
    const maxRejectionsReached = isRejected && rejectionCount >= 3;
    const avatarUrl = group.avatar ? getMediaUrl(group.avatar) : null;
    const backgroundImageUrl = group.background_image ? getMediaUrl(group.background_image) : null;
    
    const darkMode = !mounted || theme === 'dark';

    return (
        <div className="min-h-screen bg-[var(--dark-900)]">
            <NavBar darkMode={darkMode} showBackButton={true} onMenuToggle={() => setIsSidebarOpen(true)} />
            
            {/* Mobile Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-black/70 z-40 md:hidden transition-opacity duration-300 ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsSidebarOpen(false)}
            />
            
            {/* Mobile Sidebar */}
            <aside 
                className={`fixed top-0 left-0 h-screen w-64 z-50 bg-[var(--dark-800)] transform transition-transform duration-300 md:hidden ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between h-14 sm:h-16 px-4 border-b border-[var(--dark-500)]">
                    <h1 className="text-xl font-bold text-[var(--brand-primary)]">{tSidebar('menu')}</h1>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]">
                    <YouthSidebar activePath={pathname} darkMode={darkMode} />
                </div>
            </aside>
            
            <main className="pb-20 pt-14 sm:pt-16">

                {/* Group Header Container */}
                <div className="max-w-6xl mx-auto px-0 sm:px-4 md:px-6 mt-0 sm:mt-6">
                    <div className="bg-[var(--dark-700)] rounded-none sm:rounded-2xl overflow-hidden border-y sm:border border-[var(--dark-600)]">
                        
                        {/* Cover Image Area */}
                        <div 
                            className="relative h-48 sm:h-56 md:h-64 bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] w-full bg-cover bg-center"
                            style={{ 
                                backgroundImage: backgroundImageUrl 
                                    ? `url(${backgroundImageUrl})` 
                                    : avatarUrl 
                                    ? `url(${avatarUrl})` 
                                    : undefined
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            {!backgroundImageUrl && !avatarUrl && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Users className="w-24 h-24 sm:w-32 sm:h-32 text-white/20" />
                                </div>
                            )}
                        </div>

                        {/* Profile Info Area */}
                        <div className="relative px-4 sm:px-6 pb-6">
                            
                            <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 sm:-mt-14 mb-4">
                                
                                {/* Avatar */}
                                <div className="relative mr-0 md:mr-5 mb-4 md:mb-0">
                                    <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-[var(--dark-700)] bg-[var(--dark-700)] overflow-hidden relative">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={group.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-primary)] flex items-center justify-center">
                                                <Users className="w-12 h-12 sm:w-14 sm:h-14 text-white/40" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Text Info */}
                                <div className="flex-1 min-w-0 w-full md:w-auto">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)] font-heading">
                                            {group.name}
                                        </h1>
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                            group.group_type === 'OPEN' 
                                                ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border border-[var(--brand-green)]/30'
                                                : group.group_type === 'CLOSED'
                                                ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border border-[var(--dark-500)]'
                                                : 'bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30'
                                        }`}>
                                            {group.group_type === 'CLOSED' ? t('private') : group.group_type}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-3">
                                        {group.club_name ? (
                                            <>
                                                <Building2 className="w-4 h-4 text-[var(--brand-primary)]" />
                                                <p className="text-sm text-[var(--brand-primary)] font-bold">
                                                    {group.club_name}
                                                </p>
                                            </>
                                        ) : group.municipality_name ? (
                                            <>
                                                <MapPin className="w-4 h-4 text-[var(--brand-green)]" />
                                                <p className="text-sm text-[var(--brand-green)] font-bold">
                                                    {group.municipality_name}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <Globe className="w-4 h-4 text-[var(--brand-purple)]" />
                                                <p className="text-sm text-[var(--brand-purple)] font-bold">
                                                    {t('globalGroup')}
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    {group.description && (
                                        <p className="text-[var(--brand-light)]/70 text-sm mb-3 line-clamp-2 font-medium">
                                            {group.description}
                                        </p>
                                    )}

                                    {/* Eligibility Warning */}
                                    {!group.eligibility.is_eligible && !isMember && (
                                        <div className="bg-[var(--brand-peach)]/10 border border-[var(--brand-peach)]/30 rounded-none sm:rounded-xl p-3 mb-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertCircle className="w-4 h-4 text-[var(--brand-peach)]" />
                                                <p className="text-sm font-bold text-[var(--brand-peach)]">{t('requirementsNotMetTitle')}</p>
                                            </div>
                                            <ul className="text-sm text-[var(--brand-light)]/70 space-y-1">
                                                {group.eligibility.reasons.map((reason, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <span className="text-[var(--brand-peach)] mt-0.5">•</span>
                                                        <span className="font-medium">{reason}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 mt-4 md:mt-0 md:ml-auto w-full md:w-auto">
                                    {isMember ? (
                                        <button
                                            onClick={handleLeaveClick}
                                            className="flex-1 md:flex-initial px-6 py-2.5 bg-[var(--brand-peach)] hover:bg-[var(--brand-peach)]/90 text-[var(--dark-900)] rounded-none sm:rounded-xl font-bold transition active:scale-95"
                                        >
                                            {t('leaveGroup')}
                                        </button>
                                    ) : isPending ? (
                                        <span className="flex-1 md:flex-initial px-6 py-2.5 bg-[var(--brand-third)]/20 text-[var(--brand-third)] border border-[var(--brand-third)]/30 rounded-none sm:rounded-xl font-bold text-center">
                                            {t('applicationPending')}
                                        </span>
                                    ) : maxRejectionsReached ? (
                                        <span className="flex-1 md:flex-initial px-6 py-2.5 bg-[var(--dark-700)] text-[var(--brand-light)]/50 border border-[var(--dark-500)] rounded-none sm:rounded-xl font-bold cursor-not-allowed text-center">
                                            {t('maxApplicationsReached')}
                                        </span>
                                    ) : (
                                        <button 
                                            onClick={handleJoin} 
                                            disabled={!group.eligibility.is_eligible || maxRejectionsReached}
                                            className={`flex-1 md:flex-initial px-6 py-2.5 rounded-none sm:rounded-xl font-bold transition active:scale-95 ${
                                                (group.eligibility.is_eligible && !maxRejectionsReached)
                                                    ? 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)]' 
                                                    : 'bg-[var(--dark-700)] text-[var(--brand-light)]/40 cursor-not-allowed border border-[var(--dark-500)]'
                                            }`}
                                        >
                                            {group.eligibility.is_eligible 
                                                ? (group.group_type === 'OPEN' ? t('joinGroup') : t('applyToJoin'))
                                                : t('notEligible')}
                                        </button>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="mt-4 sm:mt-6">
                    <div className="max-w-6xl mx-auto px-0 sm:px-4 md:px-6">
                        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                            
                            {/* LEFT COLUMN - About Info (Sticky) */}
                            <aside className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-[72px] lg:self-start lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto">
                                <div className="bg-[var(--dark-700)] p-4 sm:p-6 rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] space-y-4 sm:space-y-6">
                                    <h3 className="text-xl font-bold text-[var(--brand-light)] font-heading">{t('about')}</h3>
                                    
                                    {group.description && (
                                        <div>
                                            <p className="text-[var(--brand-light)]/70 whitespace-pre-line text-sm font-medium leading-relaxed">
                                                {group.description}
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-3 text-sm">
                                        <div className="p-3 bg-[var(--dark-700)] rounded-none sm:rounded-xl border border-[var(--dark-600)]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Shield className="w-4 h-4 text-[var(--brand-purple)]" />
                                                <span className="font-bold text-[var(--brand-light)]">{t('groupType')}</span>
                                            </div>
                                            <span className="text-[var(--brand-light)]/70 font-semibold">
                                                {group.group_type === 'OPEN' ? t('openGroup') : group.group_type === 'CLOSED' ? t('privateGroup') : t('applicationRequired')}
                                            </span>
                                        </div>

                                        {(group.min_age || group.max_age) && (
                                            <div className="p-3 bg-[var(--dark-700)] rounded-none sm:rounded-xl border border-[var(--dark-600)]">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <UserCheck className="w-4 h-4 text-[var(--brand-green)]" />
                                                    <span className="font-bold text-[var(--brand-light)]">{t('ageRange')}</span>
                                                </div>
                                                <span className="text-[var(--brand-light)]/70 font-semibold">
                                                    {group.min_age || 0} - {group.max_age || tCommon('all')} {t('years')}
                                                </span>
                                            </div>
                                        )}

                                        {group.grades && group.grades.length > 0 && (
                                            <div className="p-3 bg-[var(--dark-700)] rounded-none sm:rounded-xl border border-[var(--dark-600)]">
                                                <span className="font-bold text-[var(--brand-light)] block mb-2">{t('allowedGrades')}</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {group.grades.map((grade) => (
                                                        <span key={grade} className="px-2.5 py-1 bg-[var(--brand-purple)] text-white rounded-lg text-xs font-bold">
                                                            {t('grade')} {grade}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {group.genders && group.genders.length > 0 && (
                                            <div className="p-3 bg-[var(--dark-700)] rounded-none sm:rounded-xl border border-[var(--dark-600)]">
                                                <span className="font-bold text-[var(--brand-light)] block mb-2">{t('allowedGenders')}</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {group.genders.map((gender) => (
                                                        <span key={gender} className="px-2.5 py-1 bg-[var(--brand-primary)] text-[var(--dark-900)] rounded-lg text-xs font-bold">
                                                            {gender}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-3 bg-[var(--dark-700)] rounded-none sm:rounded-xl border border-[var(--dark-600)]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Calendar className="w-4 h-4 text-[var(--brand-peach)]" />
                                                <span className="font-bold text-[var(--brand-light)]">{t('created')}</span>
                                            </div>
                                            <span className="text-[var(--brand-light)]/70 font-semibold">
                                                {new Date(group.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Eligibility Info */}
                                    {!group.eligibility.is_eligible && (
                                        <div className="p-4 bg-[var(--brand-peach)]/10 border border-[var(--brand-peach)]/30 rounded-none sm:rounded-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertCircle className="w-4 h-4 text-[var(--brand-peach)]" />
                                                <p className="text-sm font-bold text-[var(--brand-peach)]">{t('requirementsNotMetTitle')}</p>
                                            </div>
                                            <ul className="text-sm text-[var(--brand-light)]/70 space-y-1.5">
                                                {group.eligibility.reasons.map((reason, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <span className="text-[var(--brand-peach)] mt-0.5">•</span>
                                                        <span className="font-semibold">{reason}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </aside>

                            {/* RIGHT COLUMN - Posts Feed */}
                            <main className="flex-1 min-w-0">
                                {!isMember ? (
                                    <div className="text-center py-12 sm:py-16 bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-dashed border-[var(--dark-500)]">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[var(--dark-700)] rounded-none sm:rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <Users className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--brand-light)]/40" />
                                        </div>
                                        <p className="text-[var(--brand-light)] font-bold text-lg mb-2 font-heading">{t('membersOnly')}</p>
                                        <p className="text-[var(--brand-light)]/60 font-medium">{t('joinToSeePosts')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {loadingPosts ? (
                                            <div className="text-center py-12 bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)]">
                                                <div className="w-12 h-12 border-4 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto"></div>
                                                <p className="text-[var(--brand-light)]/60 font-semibold mt-4">{t('loadingPosts')}</p>
                                            </div>
                                        ) : posts.length > 0 ? (
                                            posts.map(post => (
                                                <PostCard 
                                                    key={post.id} 
                                                    post={post}
                                                    darkMode={darkMode}
                                                />
                                            ))
                                        ) : (
                                            <div className="text-center py-12 bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)]">
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[var(--dark-700)] rounded-none sm:rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                    <Users className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--brand-light)]/40" />
                                                </div>
                                                <p className="text-[var(--brand-light)] font-bold text-lg mb-2 font-heading">{t('noPostsYet')}</p>
                                                <p className="text-[var(--brand-light)]/60 font-medium">{t('beFirstToSayHello')}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </main>

                        </div>
                    </div>
                </div>
            </main>
            
            {/* Success Modal */}
            <SuccessModal
                isVisible={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                message={successMessage}
                title={t('success')}
                darkMode={darkMode}
            />
            
            {/* Leave Confirmation Modal */}
            <ConfirmationModal
                isVisible={showLeaveConfirmModal}
                onClose={() => setShowLeaveConfirmModal(false)}
                onConfirm={handleLeaveConfirm}
                title={t('leaveGroupConfirm')}
                message={t('leaveGroupMessage')}
                confirmButtonText={t('leaveGroupButton')}
                cancelButtonText={tCommon('cancel')}
                isLoading={isLeaving}
                variant="warning"
                darkMode={darkMode}
            />
            
            {/* Error Modal */}
            {showErrorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl w-full max-w-md overflow-hidden border border-[var(--dark-600)]">
                        {/* Header with error icon */}
                        <div className="bg-[var(--brand-red)] p-6 text-white text-center">
                            <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold font-heading">{t('error')}</h2>
                        </div>

                        {/* Message */}
                        <div className="p-6">
                            <p className="text-[var(--brand-light)]/80 text-center leading-relaxed">
                                {errorMessage}
                            </p>
                        </div>

                        {/* Button */}
                        <div className="p-6 pt-0">
                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="w-full bg-[var(--brand-red)] hover:bg-[var(--brand-red)]/90 text-white font-bold py-3 rounded-none sm:rounded-xl transition-colors"
                            >
                                {t('ok')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
