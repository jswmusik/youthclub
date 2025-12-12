'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Edit, Eye, MessageSquare, Calendar, User, Globe, Building, Users, CheckCircle2, XCircle, Clock, Pin, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../../../lib/api';
import { Post } from '../../../../../types/post';
import { getMediaUrl } from '../../../../utils';
import ConfirmationModal from '../../../../components/ConfirmationModal';

// Shadcn
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

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
        return queryString ? `/admin/super/posts?${queryString}` : '/admin/super/posts';
    };
    
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [customFieldMap, setCustomFieldMap] = useState<Record<number, string>>({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    const fetchData = async () => {
        if (!postId) return;
        
        try {
            // 1. Fetch Post Details
            const postRes = await api.get(`/posts/${postId}/`);
            setPost(postRes.data);

            // 2. Fetch Comments for this post
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
            fetchData(); // Refresh list
        } catch (err) {
            alert('Failed to update comment');
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
            fetchData(); // Refresh list
        } catch (err) {
            alert('Failed to delete comment');
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

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-pulse text-gray-400">Loading post...</div>
        </div>
    );
    if (!post) return <div className="p-12 text-center text-red-500">Post not found.</div>;

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
        if (post.is_global) {
            return (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    Global
                </Badge>
            );
        }
        if (post.target_municipalities_details && post.target_municipalities_details.length > 0) {
            const count = post.target_municipalities_details.length;
            const name = post.target_municipalities_details[0].name;
            return (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                    <Building className="h-3 w-3 mr-1" />
                    {count > 1 ? `${count} Municipalities` : name}
                </Badge>
            );
        }
        if (post.target_clubs_details && post.target_clubs_details.length > 0) {
            const count = post.target_clubs_details.length;
            const name = post.target_clubs_details[0].name;
            return (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {count > 1 ? `${count} Clubs` : name}
                </Badge>
            );
        }
        return null;
    };

    return (
        <div className="p-8 space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" onClick={() => router.push(buildBackUrl())}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to List
                    </Button>
                </div>
                <Link href={`/admin/super/posts/edit/${post.id}?${searchParams.toString()}`}>
                    <Button size="sm" className="gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white">
                        <Edit className="h-4 w-4" />
                        Edit Post
                    </Button>
                </Link>
            </div>

            {/* Post Content Card */}
            <Card className="border-none shadow-sm overflow-hidden">
                {/* Hero Image Section */}
                {post.post_type === 'IMAGE' && post.images && post.images.length > 0 && (
                    <div className="relative w-full h-48 sm:h-64 md:h-96 bg-gradient-to-r from-[#4D4DA4] via-[#4D4DA4]/80 to-[#FF5485] cursor-pointer group" onClick={() => setSelectedImageIndex(0)}>
                        <img 
                            src={getMediaUrl(post.images[0].image) || ''} 
                            alt={post.title} 
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-colors" />
                        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight mb-2">
                                {post.title}
                            </h1>
                        </div>
                        {post.is_pinned && (
                            <div className="absolute top-4 right-4">
                                <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400 border-none font-bold flex items-center gap-1">
                                    <Pin className="h-3 w-3" />
                                    PINNED
                                </Badge>
                            </div>
                        )}
                        <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-2 backdrop-blur-sm">
                            <Eye className="h-5 w-5 text-white" />
                        </div>
                    </div>
                )}

                <CardContent className="p-4 sm:p-6 md:p-8 lg:p-12 !pt-4 sm:!pt-6 md:!pt-8 lg:!pt-12">
                    {/* Title (when no hero image) */}
                    {(!post.images || post.images.length === 0) && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                {post.is_pinned && (
                                    <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400 border-none font-bold flex items-center gap-1">
                                        <Pin className="h-3 w-3" />
                                        PINNED
                                    </Badge>
                                )}
                            </div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#121213] mb-4">
                                {post.title}
                            </h1>
                        </div>
                    )}

                    {/* Meta Data */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-100">
                        {post.author && (
                            <>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-gray-200 bg-[#EBEBFE]">
                                        <AvatarFallback className="rounded-full font-bold text-xs sm:text-sm text-[#4D4DA4] bg-[#EBEBFE]">
                                            {getAuthorInitials(post.author)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium text-[#121213] text-sm sm:text-base">
                                        {post.author.first_name} {post.author.last_name}
                                    </span>
                                </div>
                                <span className="hidden sm:inline text-gray-400">•</span>
                            </>
                        )}
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                        <span className="hidden sm:inline text-gray-400">•</span>
                        <Badge variant="outline" className={
                            post.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 border-green-200' :
                            post.status === 'DRAFT' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                        }>
                            {post.status}
                        </Badge>
                        {getScopeBadge() && (
                            <>
                                <span className="hidden sm:inline text-gray-400">•</span>
                                {getScopeBadge()}
                            </>
                        )}
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 ml-auto">
                            {post.post_type}
                        </Badge>
                    </div>

                    {/* Video Display */}
                    {post.post_type === 'VIDEO' && post.video_url && (
                        <div className="mb-6 bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                            <a 
                                href={post.video_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-white underline hover:text-[#FF5485] transition-colors"
                            >
                                Watch Video ({post.video_url})
                            </a>
                        </div>
                    )}

                    {/* Multiple Images Display as Thumbnails */}
                    {post.post_type === 'IMAGE' && post.images && post.images.length > 1 && (
                        <div className="mb-6">
                            <p className="text-sm text-gray-500 mb-3">Additional Images ({post.images.length - 1}):</p>
                            <div className="flex flex-wrap gap-3">
                                {post.images.slice(1).map((img, index) => (
                                    <button
                                        key={img.id}
                                        onClick={() => setSelectedImageIndex(index + 1)}
                                        className="relative group cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                        <img 
                                            src={getMediaUrl(img.image) || ''} 
                                            className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200 hover:border-[#4D4DA4] transition-colors" 
                                            alt={`Post image ${index + 2}`}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center">
                                            <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Rich Text Content */}
                    <div 
                        className="text-gray-700 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-[#121213] [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-[#121213] [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-[#121213] [&_p]:mb-4 [&_p]:leading-relaxed [&_a]:text-[#4D4DA4] [&_a]:underline [&_a]:hover:text-[#FF5485] [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_li]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-[#4D4DA4] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_th]:border [&_th]:border-gray-300 [&_th]:px-4 [&_th]:py-2 [&_th]:bg-gray-50 [&_th]:font-semibold [&_td]:border [&_td]:border-gray-300 [&_td]:px-4 [&_td]:py-2"
                        dangerouslySetInnerHTML={{ __html: post.content }} 
                    />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* --- LEFT COL: COMMENTS --- */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Comments Manager */}
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-[#4D4DA4]" />
                                    Comments ({comments.length})
                                </CardTitle>
                                <Badge variant="outline" className={post.require_moderation ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-700 border-gray-200'}>
                                    Moderation: {post.require_moderation ? 'On' : 'Off'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-6">
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {comments.length === 0 ? (
                                    <p className="text-gray-400 italic text-center py-8">No comments yet.</p>
                                ) : (
                                    comments.map(comment => (
                                        <Card key={comment.id} className={`border ${comment.is_approved ? 'border-gray-200' : 'border-red-200 bg-red-50/50'}`}>
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-8 w-8 rounded-full border border-gray-200 bg-[#EBEBFE]">
                                                            <AvatarFallback className="rounded-full font-bold text-xs text-[#4D4DA4] bg-[#EBEBFE]">
                                                                {getAuthorInitials(comment.author)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="text-sm font-semibold text-[#121213]">
                                                                {comment.author?.first_name} {comment.author?.last_name}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {new Date(comment.created_at).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleApproveComment(comment.id, comment.is_approved)}
                                                            className={comment.is_approved ? 'text-yellow-700 border-yellow-200 hover:bg-yellow-50' : 'text-green-700 border-green-200 hover:bg-green-50'}
                                                        >
                                                            {comment.is_approved ? (
                                                                <>
                                                                    <XCircle className="h-3 w-3 mr-1" />
                                                                    Hide
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                    Approve
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-3 w-3 mr-1" />
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                                <p className="text-gray-800 text-sm mt-2">{comment.content}</p>
                                                {!comment.is_approved && (
                                                    <Badge variant="outline" className="mt-2 bg-red-50 text-red-700 border-red-200 text-xs">
                                                        ⚠ Pending Approval
                                                    </Badge>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- RIGHT COL: DETAILS & ANALYTICS --- */}
                <div className="space-y-6">
                    
                    {/* Analytics Card */}
                    <Card className="bg-[#EBEBFE]/30 border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-gray-500">Analytics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-[#4D4DA4]">{post.view_count || 0}</div>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                                        <Eye className="h-3 w-3" />
                                        Views
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-[#4D4DA4]">{comments.length}</div>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                                        <MessageSquare className="h-3 w-3" />
                                        Comments
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Targeting Summary */}
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-[#4D4DA4]" />
                                Target Audience
                            </CardTitle>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Member Type:</span>
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                    {post.target_member_type}
                                </Badge>
                            </div>
                            {post.target_groups && post.target_groups.length > 0 ? (
                                <div>
                                    <p className="text-sm text-gray-500 mb-2">Targeted Groups:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {post.target_groups.map((g: any) => (
                                            <Badge key={g} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                                Group ID {g}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Age Range:</span>
                                        <span className="text-sm font-medium text-[#121213]">
                                            {post.target_min_age || 0} - {post.target_max_age || 'Any'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Gender:</span>
                                        <span className="text-sm font-medium text-[#121213]">
                                            {post.target_genders && post.target_genders.length > 0 ? post.target_genders.join(', ') : 'All'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Grades:</span>
                                        <span className="text-sm font-medium text-[#121213]">
                                            {post.target_grades && post.target_grades.length > 0 ? post.target_grades.join(', ') : 'All'}
                                        </span>
                                    </div>
                                </>
                            )}
                            {hasCustomFieldRules && (
                                <div className="space-y-2 pt-2 border-t border-gray-100">
                                    <p className="text-sm text-gray-500 mb-2">Custom Field Rules:</p>
                                    <div className="flex flex-col gap-2">
                                        {Object.entries(post.target_custom_fields || {}).map(([fieldId, value]) => {
                                            const id = Number(fieldId);
                                            const fieldName = customFieldMap[id] || `Custom Field #${fieldId}`;
                                            let displayValue: string;
                                            if (typeof value === 'boolean') displayValue = value ? 'Yes' : 'No';
                                            else displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                                            return (
                                                <Badge key={fieldId} variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs justify-start">
                                                    <strong className="mr-1">{fieldName}:</strong> {displayValue || 'Any'}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Settings Summary */}
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-[#4D4DA4]" />
                                Configuration
                            </CardTitle>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-6 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Comments:</span>
                                <Badge variant="outline" className={post.allow_comments ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                                    {post.allow_comments ? (
                                        <>
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Allowed
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="h-3 w-3 mr-1" />
                                            Disabled
                                        </>
                                    )}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Moderation:</span>
                                <Badge variant="outline" className={post.require_moderation ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-700 border-gray-200'}>
                                    {post.require_moderation ? 'On' : 'Off'}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Push Notification:</span>
                                <Badge variant="outline" className={post.send_push_notification ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}>
                                    {post.send_push_notification ? 'Sent' : 'Not Sent'}
                                </Badge>
                            </div>
                            {post.visibility_end_date && (
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                    <span className="text-sm text-gray-500">Expires:</span>
                                    <span className="text-sm font-medium text-orange-600">
                                        {new Date(post.visibility_end_date).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>

            <ConfirmationModal
                isVisible={showDeleteModal}
                onClose={() => { if (!isDeleting) { setShowDeleteModal(false); setCommentToDelete(null); } }}
                onConfirm={handleDeleteConfirm}
                title="Delete Comment"
                message="Are you sure you want to delete this comment? This action cannot be undone."
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
                variant="danger"
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
    );
}