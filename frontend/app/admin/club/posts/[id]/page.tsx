'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Edit, Eye, MessageSquare, Calendar, User, Users, CheckCircle2, XCircle, Clock, Pin, Trash2, X, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import api from '../../../../../lib/api';
import { sanitizeHtml } from '../../../../../lib/sanitize';
import { Post } from '../../../../../types/post';
import { getMediaUrl } from '../../../../utils';
import BackButton from '@/app/components/BackButton';
import ConfirmationModal from '../../../../components/ConfirmationModal';
import { useToast } from '../../../../../hooks/useToast';

export default function PostDetailPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const postId = params?.id as string;
    const t = useTranslations('postDetail');
    
    const buildBackUrl = () => {
        const urlParams = new URLSearchParams();
        const page = searchParams.get('page');
        const search = searchParams.get('search');
        const scope = searchParams.get('scope');
        const type = searchParams.get('type');
        const status = searchParams.get('status');
        
        if (page && page !== '1') urlParams.set('page', page);
        if (search) urlParams.set('search', search);
        if (scope) urlParams.set('scope', scope);
        if (type) urlParams.set('type', type);
        if (status) urlParams.set('status', status);
        
        const queryString = urlParams.toString();
        return queryString ? `/admin/club/posts?${queryString}` : '/admin/club/posts';
    };
    
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [customFieldMap, setCustomFieldMap] = useState<Record<number, string>>({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const { success, error, info, warning } = useToast();

    const fetchData = async () => {
        if (!postId) return;
        
        try {
            const postRes = await api.get(`/posts/${postId}/`);
            setPost(postRes.data);

            const commentsRes = await api.get(`/post-comments/?post_id=${postId}`);
            setComments(commentsRes.data.results || commentsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [postId]);

    const handleApproveComment = async (commentId: number, currentStatus: boolean) => {
        try {
            await api.patch(`/post-comments/${commentId}/`, { is_approved: !currentStatus });
            fetchData();
        } catch (err) {
            error(t('failedToUpdate'));
        }
    };

    const handleDeleteComment = (commentId: number) => {
        setCommentToDelete(commentId);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!commentToDelete) return;
        setIsDeleting(true);
        try {
            await api.delete(`/post-comments/${commentToDelete}/`);
            setShowDeleteModal(false);
            setCommentToDelete(null);
            fetchData();
        } catch (err) {
            error(t('failedToDelete'));
        } finally {
            setIsDeleting(false);
        }
    };

    const hasCustomFieldRules = useMemo(() => {
        if (!post?.target_custom_fields) return false;
        return Object.keys(post.target_custom_fields).length > 0;
    }, [post?.target_custom_fields]);

    useEffect(() => {
        const fetchCustomFieldNames = async () => {
            if (!hasCustomFieldRules) return;
            try {
                const res = await api.get('/custom-fields/');
                const definitions = res.data.results || res.data || [];
                const map = definitions.reduce((acc: Record<number, string>, field: any) => {
                    acc[field.id] = field.name;
                    return acc;
                }, {});
                setCustomFieldMap(map);
            } catch (error) {
                console.error('Failed to load custom fields', error);
            }
        };

        fetchCustomFieldNames();
    }, [hasCustomFieldRules]);

    const getAuthorInitials = (author: any) => {
        if (!author) return 'A';
        const firstName = author.first_name || '';
        const lastName = author.last_name || '';
        if (firstName && lastName) {
            return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
        }
        return (firstName || lastName || 'A').charAt(0).toUpperCase();
    };

    const getTypeBadge = (postType: string) => {
        const styles: Record<string, string> = {
            'TEXT': 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30',
            'IMAGE': 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30',
            'VIDEO': 'bg-[var(--brand-pink)]/20 text-[var(--brand-pink)] border-[var(--brand-pink)]/30',
        };
        const typeLabels: Record<string, string> = {
            'TEXT': t('postTypes.text'),
            'IMAGE': t('postTypes.image'),
            'VIDEO': t('postTypes.video'),
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[postType] || 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]'}`}>
                {typeLabels[postType] || postType}
            </span>
        );
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'PUBLISHED': 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30',
            'DRAFT': 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30',
            'SCHEDULED': 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30',
            'ARCHIVED': 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]',
        };
        const statusLabels: Record<string, string> = {
            'PUBLISHED': t('postStatuses.published'),
            'DRAFT': t('postStatuses.draft'),
            'SCHEDULED': t('postStatuses.scheduled'),
            'ARCHIVED': t('postStatuses.archived'),
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]'}`}>
                {statusLabels[status] || status}
            </span>
        );
    };

    if (loading) return (
        <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center py-8 px-4">
            <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-[var(--brand-purple)]/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <FileText className="w-6 h-6 text-[var(--brand-purple)]" />
                </div>
                <p className="text-[var(--brand-light)]/60">{t('loading')}</p>
            </div>
        </div>
    );
    
    if (!post) return (
        <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center py-8 px-4">
            <div className="text-center">
                <p className="text-[var(--brand-red)] text-lg">{t('notFound')}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-6 md:py-8 px-0">
            <div className="sm:max-w-7xl sm:mx-auto sm:px-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-4 sm:px-0">
                    <BackButton
                        onClick={() => router.push(buildBackUrl())}
                        translationKey="navigation.backToList"
                    />
                    <Link href={`/admin/club/posts/edit/${post.id}?${searchParams.toString()}`}>
                        <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--dark-900)] font-semibold hover:bg-[var(--brand-primary)]/90 transition-all">
                            <Edit className="h-4 w-4" />
                            {t('editPost')}
                        </button>
                    </Link>
                </div>

                {/* Post Content Card */}
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden mb-6">
                    {/* Hero Image Section */}
                    {post.post_type === 'IMAGE' && post.images && post.images.length > 0 && (
                        <div className="relative w-full h-64 sm:h-80 md:h-96 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] cursor-pointer group" onClick={() => setSelectedImageIndex(0)}>
                            <img 
                                src={getMediaUrl(post.images[0].image) || ''} 
                                alt={post.title} 
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-900)] via-[var(--dark-900)]/60 to-transparent group-hover:from-[var(--dark-900)]/90 transition-colors" />
                            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight mb-2">
                                    {post.title}
                                </h1>
                            </div>
                            {post.is_pinned && (
                                <div className="absolute top-4 right-4">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--brand-peach)] text-[var(--dark-900)] text-xs font-bold border-none">
                                        <Pin className="h-3 w-3" />
                                        {t('pinned')}
                                    </span>
                                </div>
                            )}
                            <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-2 backdrop-blur-sm">
                                <Eye className="h-5 w-5 text-white" />
                            </div>
                        </div>
                    )}

                    <div className="p-4 sm:p-6 md:p-8 lg:p-12">
                        {/* Title (when no hero image) */}
                        {(!post.images || post.images.length === 0) && (
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    {post.is_pinned && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--brand-peach)] text-[var(--dark-900)] text-xs font-bold border-none">
                                            <Pin className="h-3 w-3" />
                                            {t('pinned')}
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--brand-light)] mb-4">
                                    {post.title}
                                </h1>
                            </div>
                        )}

                        {/* Meta Data */}
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-[var(--dark-600)]">
                            {post.author && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-[var(--dark-900)] text-xs sm:text-sm font-bold">
                                            {getAuthorInitials(post.author)}
                                        </div>
                                        <span className="font-medium text-[var(--brand-light)] text-sm sm:text-base">
                                            {post.author.first_name} {post.author.last_name}
                                        </span>
                                    </div>
                                    <span className="hidden sm:inline text-[var(--brand-light)]/30">•</span>
                                </>
                            )}
                            <div className="flex items-center gap-1.5 text-sm text-[var(--brand-light)]/60">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                            </div>
                            <span className="hidden sm:inline text-[var(--brand-light)]/30">•</span>
                            {getStatusBadge(post.status)}
                            {getTypeBadge(post.post_type)}
                        </div>

                        {/* Video Display */}
                        {post.post_type === 'VIDEO' && post.video_url && (
                            <div className="mb-6 bg-[var(--dark-700)] rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-[var(--dark-600)]">
                                <a 
                                    href={post.video_url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-[var(--brand-primary)] underline hover:text-[var(--brand-purple)] transition-colors"
                                >
                                    {t('watchVideo')} ({post.video_url})
                                </a>
                            </div>
                        )}

                        {/* Multiple Images Display as Thumbnails */}
                        {post.post_type === 'IMAGE' && post.images && post.images.length > 1 && (
                            <div className="mb-6">
                                <p className="text-sm text-[var(--brand-light)]/50 mb-3">{t('additionalImages')} ({post.images.length - 1}):</p>
                                <div className="flex flex-wrap gap-3">
                                    {post.images.slice(1).map((img, index) => (
                                        <button
                                            key={img.id}
                                            onClick={() => setSelectedImageIndex(index + 1)}
                                            className="relative group cursor-pointer hover:opacity-80 transition-opacity"
                                        >
                                            <img 
                                                src={getMediaUrl(img.image) || ''} 
                                                className="w-24 h-24 rounded-lg object-cover border-2 border-[var(--dark-600)] hover:border-[var(--brand-primary)] transition-colors" 
                                                alt={`Post image ${index + 2}`}
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
                                                <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Rich Text Content */}
                        <div 
                            className="text-[var(--brand-light)]/80 prose prose-invert max-w-none [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-[var(--brand-light)] [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-[var(--brand-light)] [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-[var(--brand-light)] [&_p]:mb-4 [&_p]:leading-relaxed [&_a]:text-[var(--brand-primary)] [&_a]:underline [&_a]:hover:text-[var(--brand-purple)] [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_li]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--brand-primary)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_blockquote]:text-[var(--brand-light)]/70 [&_code]:bg-[var(--dark-700)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:text-[var(--brand-light)] [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_th]:border [&_th]:border-[var(--dark-600)] [&_th]:px-4 [&_th]:py-2 [&_th]:bg-[var(--dark-700)] [&_th]:font-semibold [&_th]:text-[var(--brand-light)] [&_td]:border [&_td]:border-[var(--dark-600)] [&_td]:px-4 [&_td]:py-2 [&_td]:text-[var(--brand-light)]/80"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }} 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 sm:px-0">
                    
                    {/* --- LEFT COL: COMMENTS --- */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Comments Manager */}
                        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <h2 className="text-lg font-semibold text-[var(--brand-light)] flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-[var(--brand-purple)]" />
                                        {t('comments')} ({comments.length})
                                    </h2>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                        post.require_moderation 
                                            ? 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30' 
                                            : 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]'
                                    }`}>
                                        {t('moderation')}: {post.require_moderation ? t('on') : t('off')}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 sm:p-6">
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {comments.length === 0 ? (
                                        <p className="text-[var(--brand-light)]/40 italic text-center py-8">{t('noCommentsYet')}</p>
                                    ) : (
                                        comments.map(comment => (
                                            <div key={comment.id} className={`bg-[var(--dark-700)] rounded-xl p-4 border ${
                                                comment.is_approved 
                                                    ? 'border-[var(--dark-600)]' 
                                                    : 'border-[var(--brand-red)]/30 bg-[var(--brand-red)]/10'
                                            }`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-[var(--dark-900)] text-xs font-bold">
                                                            {getAuthorInitials(comment.author)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-[var(--brand-light)]">
                                                                {comment.author?.first_name} {comment.author?.last_name}
                                                            </p>
                                                            <p className="text-xs text-[var(--brand-light)]/50">
                                                                {new Date(comment.created_at).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleApproveComment(comment.id, comment.is_approved)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                                comment.is_approved 
                                                                    ? 'text-[var(--brand-blue)] border-[var(--brand-blue)]/30 hover:bg-[var(--brand-blue)]/10' 
                                                                    : 'text-[var(--brand-green)] border-[var(--brand-green)]/30 hover:bg-[var(--brand-green)]/10'
                                                            }`}
                                                        >
                                                            {comment.is_approved ? (
                                                                <>
                                                                    <XCircle className="h-3 w-3 inline mr-1" />
                                                                    {t('hide')}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <CheckCircle2 className="h-3 w-3 inline mr-1" />
                                                                    {t('approve')}
                                                                </>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--brand-red)]/30 text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 transition-all"
                                                        >
                                                            <Trash2 className="h-3 w-3 inline mr-1" />
                                                            {t('delete')}
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-[var(--brand-light)]/80 text-sm mt-2">{comment.content}</p>
                                                {!comment.is_approved && (
                                                    <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full bg-[var(--brand-red)]/20 text-[var(--brand-red)] border border-[var(--brand-red)]/30 text-xs">
                                                        ⚠ {t('pendingApproval')}
                                                    </span>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- RIGHT COL: DETAILS & ANALYTICS --- */}
                    <div className="space-y-6">
                        
                        {/* Analytics Card */}
                        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                                <h3 className="text-sm font-semibold text-[var(--brand-light)]">{t('analytics')}</h3>
                            </div>
                            <div className="p-4 sm:p-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-[var(--brand-primary)]">{post.view_count || 0}</div>
                                        <div className="text-xs text-[var(--brand-light)]/50 mt-1 flex items-center justify-center gap-1">
                                            <Eye className="h-3 w-3" />
                                            {t('views')}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-[var(--brand-primary)]">{comments.length}</div>
                                        <div className="text-xs text-[var(--brand-light)]/50 mt-1 flex items-center justify-center gap-1">
                                            <MessageSquare className="h-3 w-3" />
                                            {t('commentsLabel')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Targeting Summary */}
                        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                                <h3 className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                                    <Users className="h-5 w-5 text-[var(--brand-purple)]" />
                                    {t('targetAudience')}
                                </h3>
                            </div>
                            <div className="p-4 sm:p-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-[var(--brand-light)]/50">{t('memberType')}:</span>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]">
                                        {post.target_member_type}
                                    </span>
                                </div>
                                {post.target_groups && post.target_groups.length > 0 ? (
                                    <div>
                                        <p className="text-sm text-[var(--brand-light)]/50 mb-2">{t('targetedGroups')}:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {post.target_groups.map((g: any) => (
                                                <span key={g} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30">
                                                    {t('groupId')} {g}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-[var(--brand-light)]/50">{t('ageRange')}:</span>
                                            <span className="text-sm font-medium text-[var(--brand-light)]">
                                                {post.target_min_age || 0} - {post.target_max_age || t('any')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-[var(--brand-light)]/50">{t('gender')}:</span>
                                            <span className="text-sm font-medium text-[var(--brand-light)]">
                                                {post.target_genders && post.target_genders.length > 0 ? post.target_genders.join(', ') : t('all')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-[var(--brand-light)]/50">{t('grades')}:</span>
                                            <span className="text-sm font-medium text-[var(--brand-light)]">
                                                {post.target_grades && post.target_grades.length > 0 ? post.target_grades.join(', ') : t('all')}
                                            </span>
                                        </div>
                                    </>
                                )}
                                {hasCustomFieldRules && (
                                    <div className="space-y-2 pt-2 border-t border-[var(--dark-600)]">
                                        <p className="text-sm text-[var(--brand-light)]/50 mb-2">{t('customFieldRules')}:</p>
                                        <div className="flex flex-col gap-2">
                                            {Object.entries(post.target_custom_fields || {}).map(([fieldId, value]) => {
                                                const id = Number(fieldId);
                                                const fieldName = customFieldMap[id] || `Custom Field #${fieldId}`;
                                                let displayValue: string;
                                                if (typeof value === 'boolean') displayValue = value ? 'Yes' : 'No';
                                                else displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                                                return (
                                                    <span key={fieldId} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)] justify-start">
                                                        <strong className="mr-1">{fieldName}:</strong> {displayValue || t('any')}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Settings Summary */}
                        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
                            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50">
                                <h3 className="text-sm font-semibold text-[var(--brand-light)] flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-[var(--brand-purple)]" />
                                    {t('configuration')}
                                </h3>
                            </div>
                            <div className="p-4 sm:p-6 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--brand-light)]/50">{t('commentsConfig')}:</span>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                        post.allow_comments 
                                            ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30' 
                                            : 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30'
                                    }`}>
                                        {post.allow_comments ? (
                                            <>
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                {t('allowed')}
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-3 w-3 mr-1" />
                                                {t('disabled')}
                                            </>
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--brand-light)]/50">{t('moderation')}:</span>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                        post.require_moderation 
                                            ? 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30' 
                                            : 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]'
                                    }`}>
                                        {post.require_moderation ? t('on') : t('off')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--brand-light)]/50">{t('pushNotification')}:</span>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                        post.send_push_notification 
                                            ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30' 
                                            : 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]'
                                    }`}>
                                        {post.send_push_notification ? t('sent') : t('notSent')}
                                    </span>
                                </div>
                                {post.visibility_end_date && (
                                    <div className="flex items-center justify-between pt-2 border-t border-[var(--dark-600)]">
                                        <span className="text-sm text-[var(--brand-light)]/50">{t('expires')}:</span>
                                        <span className="text-sm font-medium text-[var(--brand-peach)]">
                                            {new Date(post.visibility_end_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                <ConfirmationModal
                    isVisible={showDeleteModal}
                    onClose={() => { if (!isDeleting) { setShowDeleteModal(false); setCommentToDelete(null); } }}
                    onConfirm={handleDeleteConfirm}
                    title={t('deleteComment')}
                    message={t('deleteCommentConfirm')}
                    confirmButtonText={t('deleteCommentAction')}
                    cancelButtonText={t('cancel')}
                    variant="danger"
                    darkMode={true}
                    isLoading={isDeleting}
                />

                {/* Image Lightbox Modal */}
                {selectedImageIndex !== null && post.images && post.images.length > 0 && (
                    <div 
                        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedImageIndex(null)}
                    >
                        <div 
                            className="relative max-w-5xl max-h-[90vh] w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close button */}
                            <button
                                onClick={() => setSelectedImageIndex(null)}
                                className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2 backdrop-blur-sm"
                            >
                                <X className="h-6 w-6" />
                            </button>
                            
                            {/* Current image */}
                            <img
                                src={getMediaUrl(post.images[selectedImageIndex].image) || ''}
                                alt={`Post image ${selectedImageIndex + 1}`}
                                className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
                            />
                            
                            {/* Navigation arrows */}
                            {post.images.length > 1 && (
                                <>
                                    {selectedImageIndex > 0 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedImageIndex(selectedImageIndex - 1);
                                            }}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2 backdrop-blur-sm"
                                        >
                                            <ChevronLeft className="h-6 w-6" />
                                        </button>
                                    )}
                                    {selectedImageIndex < post.images.length - 1 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedImageIndex(selectedImageIndex + 1);
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2 backdrop-blur-sm"
                                        >
                                            <ChevronRight className="h-6 w-6" />
                                        </button>
                                    )}
                                </>
                            )}
                            
                            {/* Image counter */}
                            {post.images.length > 1 && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white bg-black/50 rounded-full px-4 py-2 backdrop-blur-sm text-sm">
                                    {selectedImageIndex + 1} / {post.images.length}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
