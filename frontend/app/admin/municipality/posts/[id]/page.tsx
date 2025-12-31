'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { 
    Edit, Eye, MessageSquare, Calendar, Globe, Building, Users, 
    CheckCircle2, XCircle, Clock, Pin, Trash2, X, ChevronLeft, ChevronRight,
    FileText, Bell, Settings, Target, Heart, BarChart3, Image, Video
} from 'lucide-react';
import api from '../../../../../lib/api';
import { sanitizeHtml } from '../../../../../lib/sanitize';
import { Post } from '../../../../../types/post';
import { getMediaUrl } from '../../../../utils';
import ConfirmationModal from '../../../../components/ConfirmationModal';
import { useToast } from '../../../../../hooks/useToast';
import BackButton from '@/app/components/BackButton';

export default function PostDetailPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const postId = params?.id as string;
    
    const buildBackUrl = () => {
        const params = new URLSearchParams();
        const page = searchParams.get('page');
        const search = searchParams.get('search');
        const scope = searchParams.get('scope');
        const type = searchParams.get('type');
        const status = searchParams.get('status');
        
        if (page && page !== '1') params.set('page', page);
        if (search) params.set('search', search);
        if (scope) params.set('scope', scope);
        if (type) params.set('type', type);
        if (status) params.set('status', status);
        
        const queryString = params.toString();
        return queryString ? `/admin/municipality/posts?${queryString}` : '/admin/municipality/posts';
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
            success(currentStatus ? 'Comment hidden' : 'Comment approved');
            fetchData();
        } catch (err) {
            error('Failed to update comment');
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
            success('Comment deleted');
            fetchData();
        } catch (err) {
            error('Failed to delete comment');
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

    const getScopeBadge = () => {
        if (post?.is_global) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--dark-600)] text-[var(--brand-light)]/70 text-xs font-medium border border-[var(--dark-500)]">
                    <Globe className="h-3 w-3" />
                    Global
                </span>
            );
        }
        if (post?.target_municipalities_details && post.target_municipalities_details.length > 0) {
            const count = post.target_municipalities_details.length;
            const name = post.target_municipalities_details[0].name;
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] text-xs font-medium border border-[var(--brand-blue)]/30">
                    <Building className="h-3 w-3" />
                    {count > 1 ? `${count} Municipalities` : name}
                </span>
            );
        }
        if (post?.target_clubs_details && post.target_clubs_details.length > 0) {
            const count = post.target_clubs_details.length;
            const name = post.target_clubs_details[0].name;
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] text-xs font-medium border border-[var(--brand-purple)]/30">
                    <Users className="h-3 w-3" />
                    {count > 1 ? `${count} Clubs` : name}
                </span>
            );
        }
        return null;
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'PUBLISHED': 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] border-[var(--brand-green)]/30',
            'DRAFT': 'bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] border-[var(--brand-blue)]/30',
            'SCHEDULED': 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border-[var(--brand-primary)]/30',
            'ARCHIVED': 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]',
        };
        return (
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border-[var(--dark-500)]'}`}>
                {status}
            </span>
        );
    };

    const getTypeBadge = (postType: string) => {
        const config: Record<string, { icon: any; color: string }> = {
            'TEXT': { icon: FileText, color: 'var(--brand-primary)' },
            'IMAGE': { icon: Image, color: 'var(--brand-blue)' },
            'VIDEO': { icon: Video, color: 'var(--brand-pink)' },
        };
        const { icon: Icon, color } = config[postType] || { icon: FileText, color: 'var(--brand-light)' };
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border" style={{ backgroundColor: `${color}20`, color, borderColor: `${color}30` }}>
                <Icon className="h-3 w-3" />
                {postType}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] animate-pulse">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-[var(--brand-light)]/60">Loading post...</p>
                </div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
                <div className="text-center">
                    <FileText className="w-12 h-12 text-[var(--brand-light)]/20 mx-auto mb-4" />
                    <p className="text-[var(--brand-light)]/60">Post not found</p>
                    <button 
                        onClick={() => router.push(buildBackUrl())}
                        className="mt-4 px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium hover:bg-[var(--brand-primary)]/90 transition-colors"
                    >
                        Back to Posts
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-6 md:py-8 px-0">
            <div className="sm:max-w-6xl sm:mx-auto sm:px-6">
                
                {/* Header */}
                <div className="flex items-center justify-between gap-4 mb-6 px-4 sm:px-0">
                    <div className="flex items-center gap-4">
                        <BackButton 
                            onClick={() => router.push(buildBackUrl())}
                            translationKey="backToList"
                        />
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)]">Post Details</h1>
                            <p className="text-sm text-[var(--brand-light)]/50 mt-0.5">View and manage post</p>
                        </div>
                    </div>
                    <Link href={`/admin/municipality/posts/edit/${post.id}?${searchParams.toString()}`}>
                        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] text-white font-semibold hover:opacity-90 transition-all text-sm">
                            <Edit className="h-4 w-4" />
                            <span className="hidden sm:inline">Edit Post</span>
                        </button>
                    </Link>
                </div>

                {/* Hero Image */}
                {post.post_type === 'IMAGE' && post.images && post.images.length > 0 && (
                    <div 
                        className="relative w-full h-48 sm:h-64 md:h-80 bg-[var(--dark-800)] cursor-pointer group mb-6 sm:rounded-2xl overflow-hidden"
                        onClick={() => setSelectedImageIndex(0)}
                    >
                        <img 
                            src={getMediaUrl(post.images[0].image) || ''} 
                            alt={post.title} 
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-900)] via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                            <div className="flex items-center gap-2 mb-2">
                                {post.is_pinned && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--brand-peach)] text-white text-xs font-bold">
                                        <Pin className="h-3 w-3" />
                                        PINNED
                                    </span>
                                )}
                            </div>
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">
                                {post.title}
                            </h2>
                        </div>
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-medium backdrop-blur-sm">
                                <Eye className="h-3 w-3" />
                                View Full
                            </span>
                        </div>
                    </div>
                )}

                {/* Post Content Card */}
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                    <div className="p-4 sm:p-6 md:p-8">
                        {/* Title (when no hero image) */}
                        {(!post.images || post.images.length === 0) && (
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    {post.is_pinned && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--brand-peach)] text-white text-xs font-bold">
                                            <Pin className="h-3 w-3" />
                                            PINNED
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">
                                    {post.title}
                                </h2>
                            </div>
                        )}

                        {/* Meta Data */}
                        <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-[var(--dark-600)]">
                            {post.author && (
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center text-white text-xs font-bold">
                                        {getAuthorInitials(post.author)}
                                    </div>
                                    <span className="text-sm font-medium text-[var(--brand-light)]">
                                        {post.author.first_name} {post.author.last_name}
                                    </span>
                                </div>
                            )}
                            <span className="text-[var(--dark-500)]">•</span>
                            <div className="flex items-center gap-1.5 text-sm text-[var(--brand-light)]/60">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                            </div>
                            <span className="text-[var(--dark-500)]">•</span>
                            {getStatusBadge(post.status)}
                            {getScopeBadge() && (
                                <>
                                    <span className="hidden sm:inline text-[var(--dark-500)]">•</span>
                                    {getScopeBadge()}
                                </>
                            )}
                            <div className="ml-auto">
                                {getTypeBadge(post.post_type)}
                            </div>
                        </div>

                        {/* Video Display */}
                        {post.post_type === 'VIDEO' && post.video_url && (
                            <div className="mb-6 bg-[var(--dark-700)] rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-[var(--dark-600)]">
                                <a 
                                    href={post.video_url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-[var(--brand-primary)] hover:text-[var(--brand-purple)] transition-colors flex items-center gap-2"
                                >
                                    <Video className="h-5 w-5" />
                                    Watch Video
                                </a>
                            </div>
                        )}

                        {/* Multiple Images Display */}
                        {post.post_type === 'IMAGE' && post.images && post.images.length > 1 && (
                            <div className="mb-6">
                                <p className="text-sm text-[var(--brand-light)]/50 mb-3">
                                    {post.images.length} images attached
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {post.images.map((img, index) => (
                                        <button
                                            key={img.id}
                                            onClick={() => setSelectedImageIndex(index)}
                                            className={`relative group cursor-pointer transition-all ${index === 0 ? 'ring-2 ring-[var(--brand-primary)]' : ''}`}
                                        >
                                            <img 
                                                src={getMediaUrl(img.image) || ''} 
                                                className="w-20 h-20 rounded-xl object-cover border-2 border-[var(--dark-600)] hover:border-[var(--brand-primary)] transition-colors" 
                                                alt={`Post image ${index + 1}`}
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-xl transition-colors flex items-center justify-center">
                                                <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Rich Text Content */}
                        <div 
                            className="prose prose-invert max-w-none text-[var(--brand-light)]/80 
                                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-[var(--brand-light)] 
                                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-[var(--brand-light)] 
                                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-[var(--brand-light)] 
                                [&_p]:mb-4 [&_p]:leading-relaxed 
                                [&_a]:text-[var(--brand-primary)] [&_a]:hover:text-[var(--brand-purple)] 
                                [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 
                                [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 
                                [&_li]:mb-2 
                                [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--brand-primary)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 
                                [&_code]:bg-[var(--dark-700)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm 
                                [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-4"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }} 
                        />
                    </div>
                </div>

                {/* Analytics Dashboard */}
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] mb-6">
                    <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-[var(--brand-primary)]" />
                            <span className="text-sm font-semibold text-[var(--brand-light)]">Analytics</span>
                        </div>
                    </div>
                    <div className="p-4 sm:p-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <Eye className="h-4 w-4 text-[var(--brand-primary)]" />
                                    <span className="text-xs text-[var(--brand-light)]/60">Views</span>
                                </div>
                                <div className="text-2xl font-bold text-[var(--brand-light)]">{post.view_count || 0}</div>
                            </div>
                            <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare className="h-4 w-4 text-[var(--brand-blue)]" />
                                    <span className="text-xs text-[var(--brand-light)]/60">Comments</span>
                                </div>
                                <div className="text-2xl font-bold text-[var(--brand-light)]">{comments.length}</div>
                            </div>
                            <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <Heart className="h-4 w-4 text-[var(--brand-pink)]" />
                                    <span className="text-xs text-[var(--brand-light)]/60">Reactions</span>
                                </div>
                                <div className="text-2xl font-bold text-[var(--brand-light)]">{(post as any).reaction_count || 0}</div>
                            </div>
                            <div className="bg-[var(--dark-700)] rounded-xl p-4 border border-[var(--dark-600)]">
                                <div className="flex items-center gap-2 mb-2">
                                    <Bell className="h-4 w-4 text-[var(--brand-peach)]" />
                                    <span className="text-xs text-[var(--brand-light)]/60">Push Sent</span>
                                </div>
                                <div className="text-2xl font-bold text-[var(--brand-light)]">{post.send_push_notification ? 'Yes' : 'No'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 sm:px-0">
                    
                    {/* Comments Section */}
                    <div className="lg:col-span-2">
                        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)]">
                            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4 text-[var(--brand-primary)]" />
                                        <span className="text-sm font-semibold text-[var(--brand-light)]">
                                            Comments ({comments.length})
                                        </span>
                                    </div>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                        post.require_moderation 
                                            ? 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border border-[var(--brand-peach)]/30' 
                                            : 'bg-[var(--dark-600)] text-[var(--brand-light)]/60 border border-[var(--dark-500)]'
                                    }`}>
                                        Moderation: {post.require_moderation ? 'On' : 'Off'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 sm:p-6">
                                {comments.length === 0 ? (
                                    <div className="text-center py-8">
                                        <MessageSquare className="w-10 h-10 text-[var(--brand-light)]/20 mx-auto mb-3" />
                                        <p className="text-[var(--brand-light)]/50 text-sm">No comments yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {comments.map(comment => (
                                            <div 
                                                key={comment.id} 
                                                className={`p-4 rounded-xl border ${
                                                    comment.is_approved 
                                                        ? 'bg-[var(--dark-700)] border-[var(--dark-600)]' 
                                                        : 'bg-[var(--brand-red)]/5 border-[var(--brand-red)]/30'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center text-white text-xs font-bold">
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
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                                comment.is_approved 
                                                                    ? 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] hover:bg-[var(--brand-peach)]/30' 
                                                                    : 'bg-[var(--brand-green)]/20 text-[var(--brand-green)] hover:bg-[var(--brand-green)]/30'
                                                            }`}
                                                        >
                                                            {comment.is_approved ? (
                                                                <span className="flex items-center gap-1">
                                                                    <XCircle className="h-3 w-3" />
                                                                    Hide
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1">
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    Approve
                                                                </span>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--brand-red)]/20 text-[var(--brand-red)] hover:bg-[var(--brand-red)]/30 transition-colors"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-[var(--brand-light)]/80">{comment.content}</p>
                                                {!comment.is_approved && (
                                                    <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-[var(--brand-red)]/20 text-[var(--brand-red)] text-xs font-medium">
                                                        ⚠ Pending Approval
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        
                        {/* Target Audience */}
                        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)]">
                            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                                <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-[var(--brand-primary)]" />
                                    <span className="text-sm font-semibold text-[var(--brand-light)]">Target Audience</span>
                                </div>
                            </div>
                            <div className="p-4 sm:p-6 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-[var(--brand-light)]/60">Member Type</span>
                                    <span className="text-sm font-medium text-[var(--brand-light)]">{post.target_member_type}</span>
                                </div>
                                {post.target_groups && post.target_groups.length > 0 ? (
                                    <div>
                                        <p className="text-sm text-[var(--brand-light)]/60 mb-2">Targeted Groups</p>
                                        <div className="flex flex-wrap gap-2">
                                            {post.target_groups.map((g: any) => (
                                                <span key={g} className="px-2 py-1 rounded-lg bg-[var(--brand-blue)]/20 text-[var(--brand-blue)] text-xs font-medium">
                                                    Group {g}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-[var(--brand-light)]/60">Age Range</span>
                                            <span className="text-sm font-medium text-[var(--brand-light)]">
                                                {post.target_min_age || 0} - {post.target_max_age || 'Any'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-[var(--brand-light)]/60">Gender</span>
                                            <span className="text-sm font-medium text-[var(--brand-light)]">
                                                {post.target_genders && post.target_genders.length > 0 ? post.target_genders.join(', ') : 'All'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-[var(--brand-light)]/60">Grades</span>
                                            <span className="text-sm font-medium text-[var(--brand-light)]">
                                                {post.target_grades && post.target_grades.length > 0 ? post.target_grades.join(', ') : 'All'}
                                            </span>
                                        </div>
                                    </>
                                )}
                                {hasCustomFieldRules && (
                                    <div className="pt-3 border-t border-[var(--dark-600)]">
                                        <p className="text-sm text-[var(--brand-light)]/60 mb-2">Custom Field Rules</p>
                                        <div className="space-y-2">
                                            {Object.entries(post.target_custom_fields || {}).map(([fieldId, value]) => {
                                                const id = Number(fieldId);
                                                const fieldName = customFieldMap[id] || `Field #${fieldId}`;
                                                let displayValue: string;
                                                if (typeof value === 'boolean') displayValue = value ? 'Yes' : 'No';
                                                else displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                                                return (
                                                    <div key={fieldId} className="text-xs">
                                                        <span className="text-[var(--brand-light)]/60">{fieldName}:</span>
                                                        <span className="ml-1 text-[var(--brand-light)]">{displayValue || 'Any'}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Configuration */}
                        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)]">
                            <div className="px-4 sm:px-6 py-4 border-b border-[var(--dark-600)] bg-[var(--dark-700)]/50 sm:rounded-t-2xl">
                                <div className="flex items-center gap-2">
                                    <Settings className="h-4 w-4 text-[var(--brand-primary)]" />
                                    <span className="text-sm font-semibold text-[var(--brand-light)]">Configuration</span>
                                </div>
                            </div>
                            <div className="p-4 sm:p-6 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-[var(--brand-light)]/60">Comments</span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                                        post.allow_comments 
                                            ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)]' 
                                            : 'bg-[var(--brand-red)]/20 text-[var(--brand-red)]'
                                    }`}>
                                        {post.allow_comments ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                        {post.allow_comments ? 'Allowed' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-[var(--brand-light)]/60">Moderation</span>
                                    <span className="text-sm font-medium text-[var(--brand-light)]">
                                        {post.require_moderation ? 'Required' : 'Off'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-[var(--brand-light)]/60">Push Notification</span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                                        post.send_push_notification 
                                            ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)]' 
                                            : 'bg-[var(--dark-600)] text-[var(--brand-light)]/60'
                                    }`}>
                                        {post.send_push_notification ? 'Sent' : 'Not Sent'}
                                    </span>
                                </div>
                                {post.visibility_end_date && (
                                    <div className="flex justify-between items-center pt-3 border-t border-[var(--dark-600)]">
                                        <span className="text-sm text-[var(--brand-light)]/60">Expires</span>
                                        <span className="text-sm font-medium text-[var(--brand-peach)]">
                                            {new Date(post.visibility_end_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Delete Comment Modal */}
                <ConfirmationModal
                    isVisible={showDeleteModal}
                    onClose={() => { if (!isDeleting) { setShowDeleteModal(false); setCommentToDelete(null); } }}
                    onConfirm={handleDeleteConfirm}
                    title="Delete Comment"
                    message="Are you sure you want to delete this comment? This action cannot be undone."
                    confirmButtonText="Delete"
                    cancelButtonText="Cancel"
                    variant="danger"
                    darkMode={true}
                    isLoading={isDeleting}
                />

                {/* Image Lightbox Modal */}
                {selectedImageIndex !== null && post.images && post.images.length > 0 && (
                    <div 
                        className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedImageIndex(null)}
                    >
                        <div 
                            className="relative max-w-5xl max-h-[90vh] w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedImageIndex(null)}
                                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] flex items-center justify-center text-[var(--brand-light)]/60 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                            
                            <img
                                src={getMediaUrl(post.images[selectedImageIndex].image) || ''}
                                alt={`Post image ${selectedImageIndex + 1}`}
                                className="w-full h-auto max-h-[90vh] object-contain rounded-2xl"
                            />
                            
                            {post.images.length > 1 && (
                                <>
                                    {selectedImageIndex > 0 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedImageIndex(selectedImageIndex - 1);
                                            }}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] flex items-center justify-center text-[var(--brand-light)]/60 hover:text-white transition-colors"
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </button>
                                    )}
                                    {selectedImageIndex < post.images.length - 1 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedImageIndex(selectedImageIndex + 1);
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] flex items-center justify-center text-[var(--brand-light)]/60 hover:text-white transition-colors"
                                        >
                                            <ChevronRight className="h-5 w-5" />
                                        </button>
                                    )}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)] text-sm font-medium">
                                        {selectedImageIndex + 1} / {post.images.length}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                </div>
        </div>
    );
}
