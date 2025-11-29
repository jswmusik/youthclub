'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import api from '../../../../../lib/api';
import { Post } from '../../../../../types/post';

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

    const handleDeleteComment = async (commentId: number) => {
        if (!confirm("Delete this comment permanently?")) return;
        try {
            await api.delete(`/post-comments/${commentId}/`);
            fetchData(); // Refresh list
        } catch (err) {
            alert('Failed to delete comment');
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

    if (loading) return <div className="p-8">Loading...</div>;
    if (!post) return <div className="p-8">Post not found</div>;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* --- HEADER --- */}
            <div className="flex justify-between items-start">
                <div>
                    <button onClick={() => router.push(buildBackUrl())} className="text-sm text-gray-500 mb-1 hover:underline">← Back to List</button>
                    <h1 className="text-3xl font-bold text-gray-900">{post.title}</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            post.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                            post.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                            {post.status}
                        </span>
                        <span className="text-sm text-gray-500">Created: {new Date(post.created_at).toLocaleDateString()}</span>
                        {post.is_pinned && <span className="text-sm text-red-500 font-medium">📌 Pinned</span>}
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link 
                        href={`/admin/super/posts/edit/${post.id}?${searchParams.toString()}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                    >
                        Edit Post
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* --- LEFT COL: PREVIEW --- */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Content Preview Card */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Content Preview</h3>
                        
                        {/* Video Display */}
                        {post.post_type === 'VIDEO' && post.video_url && (
                            <div className="mb-4 bg-black rounded overflow-hidden aspect-video flex items-center justify-center text-white">
                                {/* Simple placeholder if specific youtube embed logic isn't added yet */}
                                <a href={post.video_url} target="_blank" rel="noreferrer" className="underline">
                                    Watch Video ({post.video_url})
                                </a>
                            </div>
                        )}

                        {/* Image Display */}
                        {post.post_type === 'IMAGE' && post.images && post.images.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto mb-4 pb-2">
                                {post.images.map(img => (
                                    <img key={img.id} src={img.image} className="h-48 rounded object-cover border" alt="Post media" />
                                ))}
                            </div>
                        )}

                        {/* Text Content */}
                        <div 
                            className="prose max-w-none text-gray-700 bg-gray-50 p-4 rounded border"
                            dangerouslySetInnerHTML={{ __html: post.content }} 
                        />
                    </div>

                    {/* Comments Manager */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Comments ({comments.length})</h3>
                            <span className="text-xs text-gray-500">Moderation: {post.require_moderation ? 'On' : 'Off'}</span>
                        </div>
                        
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {comments.length === 0 ? (
                                <p className="text-gray-400 italic">No comments yet.</p>
                            ) : (
                                comments.map(comment => (
                                    <div key={comment.id} className={`p-3 rounded border ${comment.is_approved ? 'bg-white' : 'bg-red-50 border-red-200'}`}>
                                        <div className="flex justify-between">
                                            <p className="text-sm font-bold text-gray-700">
                                                {comment.author?.first_name} {comment.author?.last_name}
                                                <span className="text-gray-400 font-normal ml-2 text-xs">
                                                    {new Date(comment.created_at).toLocaleString()}
                                                </span>
                                            </p>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleApproveComment(comment.id, comment.is_approved)}
                                                    className={`text-xs px-2 py-1 rounded ${comment.is_approved ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}
                                                >
                                                    {comment.is_approved ? 'Hide' : 'Approve'}
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-gray-800 mt-1 text-sm">{comment.content}</p>
                                        {!comment.is_approved && (
                                            <p className="text-xs text-red-600 font-bold mt-1">⚠ Pending Approval</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COL: DETAILS & ANALYTICS --- */}
                <div className="space-y-6">
                    
                    {/* Analytics Card */}
                    <div className="bg-white p-6 rounded-lg shadow border-t-4 border-blue-500">
                        <h3 className="font-bold text-gray-800 mb-4">Analytics</h3>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-2 bg-gray-50 rounded">
                                <p className="text-2xl font-bold text-blue-600">{post.view_count}</p>
                                <p className="text-xs text-gray-500">Views</p>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                                <p className="text-2xl font-bold text-green-600">{comments.length}</p>
                                <p className="text-xs text-gray-500">Comments</p>
                            </div>
                        </div>
                    </div>

                    {/* Targeting Summary */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="font-bold text-gray-800 mb-4">Target Audience</h3>
                        <ul className="space-y-3 text-sm">
                            <li className="flex justify-between">
                                <span className="text-gray-500">Member Type:</span>
                                <span className="font-medium">{post.target_member_type}</span>
                            </li>
                            {post.target_groups.length > 0 ? (
                                <div>
                                    <p className="text-gray-500 mb-1">Targeted Groups:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {post.target_groups.map(g => (
                                            <span key={g} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">Group ID {g}</span>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <li className="flex justify-between">
                                        <span className="text-gray-500">Age Range:</span>
                                        <span className="font-medium">
                                            {post.target_min_age || 0} - {post.target_max_age || 'Any'}
                                        </span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span className="text-gray-500">Gender:</span>
                                        <span className="font-medium">
                                            {post.target_genders.length > 0 ? post.target_genders.join(', ') : 'All'}
                                        </span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span className="text-gray-500">Grades:</span>
                                        <span className="font-medium">
                                            {post.target_grades.length > 0 ? post.target_grades.join(', ') : 'All'}
                                        </span>
                                    </li>
                                </>
                            )}
                            {hasCustomFieldRules && (
                                <li className="flex flex-col gap-2">
                                    <span className="text-gray-500">Custom Field Rules:</span>
                                    <div className="flex flex-col gap-1">
                                        {Object.entries(post.target_custom_fields || {}).map(([fieldId, value]) => {
                                            const id = Number(fieldId);
                                            const fieldName = customFieldMap[id] || `Custom Field #${fieldId}`;
                                            let displayValue: string;
                                            if (typeof value === 'boolean') displayValue = value ? 'Yes' : 'No';
                                            else displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                                            return (
                                                <span
                                                    key={fieldId}
                                                    className="text-sm text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-100"
                                                >
                                                    <strong>{fieldName}:</strong> {displayValue || 'Any'}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Settings Summary */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="font-bold text-gray-800 mb-4">Configuration</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li>• {post.allow_comments ? '✅ Comments Allowed' : '❌ Comments Disabled'}</li>
                            <li>• {post.require_moderation ? '✅ Moderation On' : '⚪ Moderation Off'}</li>
                            <li>• {post.send_push_notification ? '✅ Push Notification Sent' : '⚪ No Push Notification'}</li>
                            {post.visibility_end_date && (
                                <li className="text-orange-600">• Expires: {new Date(post.visibility_end_date).toLocaleDateString()}</li>
                            )}
                        </ul>
                    </div>

                </div>
            </div>
        </div>
    );
}