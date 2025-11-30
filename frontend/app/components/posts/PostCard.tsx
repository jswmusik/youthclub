'use client';

import { useState, useRef, useEffect } from 'react';
import { Post } from '../../../types/post';
import { addPostReaction, updatePostReaction, removePostReaction, fetchPostComments, createPostComment, deletePostComment } from '../../../lib/api';
import { getMediaUrl } from '../../utils';
import { useAuth } from '../../../context/AuthContext';

// Helper function to convert YouTube URLs to embed format
const getYouTubeEmbedUrl = (url: string): string => {
    if (!url) return '';
    
    // If already an embed URL, return as is
    if (url.includes('youtube.com/embed/')) {
        return url;
    }
    
    let videoId = '';
    
    // Handle different YouTube URL formats
    // Format 1: https://www.youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/[?&]v=([^&]+)/);
    if (watchMatch) {
        videoId = watchMatch[1];
    }
    // Format 2: https://youtu.be/VIDEO_ID
    else {
        const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
        if (shortMatch) {
            videoId = shortMatch[1];
        }
        // Format 3: https://www.youtube.com/embed/VIDEO_ID (already embed)
        else if (url.includes('youtube.com/embed/')) {
            return url;
        }
    }
    
    // Clean video ID (remove any query parameters)
    videoId = videoId.split('?')[0].split('&')[0];
    
    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // If we can't parse it, return original URL
    return url;
};

type ReactionType = 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD' | 'ANGRY';

interface PostCardProps {
    post: Post;
}

// Helper function to get initials from name
export const getInitials = (firstName: string, lastName: string): string => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return `${first}${last}` || '?';
};

// Helper function to get a color based on name (for consistent avatar colors)
export const getAvatarColor = (name: string): string => {
    const colors = [
        'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
        'bg-yellow-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500',
        'bg-orange-500', 'bg-cyan-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

// Avatar component with initials fallback
export const Avatar = ({ 
    src, 
    alt, 
    firstName, 
    lastName, 
    size = 'md' 
}: { 
    src?: string | null; 
    alt: string; 
    firstName: string; 
    lastName: string;
    size?: 'sm' | 'md' | 'lg';
}) => {
    const sizeClasses = {
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-10 h-10 text-base'
    };
    const sizeClass = sizeClasses[size];
    
    if (src) {
        return (
            <img
                src={getMediaUrl(src)}
                alt={alt}
                className={`${sizeClass} rounded-full object-cover border border-gray-200 flex-shrink-0`}
            />
        );
    }
    
    const initials = getInitials(firstName, lastName);
    const colorClass = getAvatarColor(`${firstName}${lastName}`);
    
    return (
        <div className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center text-white font-semibold border border-gray-200 flex-shrink-0`}>
            {initials}
        </div>
    );
};

interface Comment {
    id: number;
    post: number;
    author: {
        id: number;
        first_name: string;
        last_name: string;
        avatar?: string | null;
    };
    content: string;
    parent: number | null;
    is_approved: boolean;
    created_at: string;
    replies?: Comment[];
}

const REACTION_EMOJIS: Record<ReactionType, string> = {
    LIKE: '👍',
    LOVE: '❤️',
    LAUGH: '😂',
    WOW: '😮',
    SAD: '😢',
    ANGRY: '😠',
};

const REACTION_COLORS: Record<ReactionType, string> = {
    LIKE: 'text-blue-500',
    LOVE: 'text-red-500',
    LAUGH: 'text-yellow-500',
    WOW: 'text-yellow-500',
    SAD: 'text-blue-500',
    ANGRY: 'text-red-500',
};

export default function PostCard({ post }: PostCardProps) {
    const { user } = useAuth();
    const [userReaction, setUserReaction] = useState<ReactionType | null>(post.user_reaction || null);
    const [reactionBreakdown, setReactionBreakdown] = useState(post.reaction_breakdown || {});
    const [totalReactions, setTotalReactions] = useState(post.reaction_count);
    const [isAnimating, setIsAnimating] = useState(false);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentCount, setCommentCount] = useState(post.comment_count);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [commentSubmitted, setCommentSubmitted] = useState(false);
    const [isContentExpanded, setIsContentExpanded] = useState(false);
    const [shouldTruncate, setShouldTruncate] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);

    // Check if content should be truncated based on height
    useEffect(() => {
        if (contentRef.current) {
            // Check if content height exceeds a certain threshold (approximately 6 lines)
            const lineHeight = 24; // Approximate line height in pixels
            const maxHeight = lineHeight * 6; // 6 lines
            const actualHeight = contentRef.current.scrollHeight;
            setShouldTruncate(actualHeight > maxHeight);
        }
    }, [post.content]);

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowReactionPicker(false);
                setIsPickerOpen(false);
            }
        };
        if (showReactionPicker || isPickerOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showReactionPicker, isPickerOpen]);

    // Keyboard navigation for image carousel and prevent body scroll
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (currentImageIndex === null) return;
            
            if (event.key === 'Escape') {
                setCurrentImageIndex(null);
            } else if (event.key === 'ArrowLeft' && post.images.length > 1) {
                setCurrentImageIndex((prev) => 
                    prev !== null && prev > 0 ? prev - 1 : post.images.length - 1
                );
            } else if (event.key === 'ArrowRight' && post.images.length > 1) {
                setCurrentImageIndex((prev) => 
                    prev !== null && prev < post.images.length - 1 ? prev + 1 : 0
                );
            }
        };
        
        if (currentImageIndex !== null) {
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.body.style.overflow = 'unset';
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [currentImageIndex, post.images.length]);

    const openPicker = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setShowReactionPicker(true);
        setIsPickerOpen(true);
    };

    const scheduleClose = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
        }
        closeTimeoutRef.current = setTimeout(() => {
            setShowReactionPicker(false);
            setIsPickerOpen(false);
        }, 300);
    };

    // Load comments when comments section is opened
    useEffect(() => {
        if (showComments && comments.length === 0 && !loadingComments) {
            loadComments();
        }
    }, [showComments]);

    const loadComments = async () => {
        if (!post.allow_comments) return;
        setLoadingComments(true);
        try {
            const response = await fetchPostComments(post.id);
            const commentsData = response.data.results || response.data || [];
            // Filter only approved comments
            const approvedComments = commentsData.filter((c: Comment) => c.is_approved);
            // Organize comments into parent-child structure
            const parentComments = approvedComments.filter((c: Comment) => !c.parent);
            const organizedComments = parentComments.map((parent: Comment) => {
                const replies = approvedComments.filter((c: Comment) => c.parent === parent.id);
                return { ...parent, replies };
            });
            setComments(organizedComments);
            // Update count based on actual approved comments (including replies)
            setCommentCount(approvedComments.length);
        } catch (error) {
            console.error('Failed to load comments:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || submittingComment) return;

        setSubmittingComment(true);
        try {
            await createPostComment(post.id, newComment.trim());
            setNewComment('');
            // Show success message
            setCommentSubmitted(true);
            setTimeout(() => setCommentSubmitted(false), 5000); // Hide after 5 seconds
            // Reload comments - this will update the count correctly
            await loadComments();
        } catch (error) {
            console.error('Failed to post comment:', error);
        } finally {
            setSubmittingComment(false);
        }
    };

    const toggleComments = () => {
        setShowComments(!showComments);
        if (!showComments) {
            // Focus comment input when opening
            setTimeout(() => {
                commentInputRef.current?.focus();
            }, 100);
        }
    };

    const handleDeleteComment = async (commentId: number, isReply: boolean = false) => {
        if (!confirm('Are you sure you want to delete this comment?')) {
            return;
        }

        try {
            await deletePostComment(commentId);
            // Reload comments - this will update the count correctly
            await loadComments();
        } catch (error) {
            console.error('Failed to delete comment:', error);
            alert('Failed to delete comment. Please try again.');
        }
    };

    const handleReaction = async (reactionType: ReactionType) => {
        const previousReaction = userReaction;
        const previousBreakdown = { ...reactionBreakdown };
        
        // Optimistic UI update
        if (previousReaction === reactionType) {
            // Remove reaction if clicking the same one
            setUserReaction(null);
            setReactionBreakdown(prev => ({
                ...prev,
                [reactionType]: Math.max(0, (prev[reactionType] || 0) - 1)
            }));
            setTotalReactions(prev => Math.max(0, prev - 1));
        } else {
            // Add or update reaction
            setUserReaction(reactionType);
            if (previousReaction) {
                // Remove previous reaction count
                setReactionBreakdown(prev => ({
                    ...prev,
                    [previousReaction]: Math.max(0, (prev[previousReaction] || 0) - 1)
                }));
            }
            // Add new reaction count
            setReactionBreakdown(prev => ({
                ...prev,
                [reactionType]: (prev[reactionType] || 0) + 1
            }));
            setTotalReactions(prev => previousReaction ? prev : prev + 1);
        }
        
        setIsAnimating(true);
        setShowReactionPicker(false);
        setTimeout(() => setIsAnimating(false), 300);

        try {
            console.log('Reacting to post:', post.id, 'with reaction:', reactionType);
            if (previousReaction === reactionType) {
                // Remove reaction
                console.log('Removing reaction');
                const response = await removePostReaction(post.id, reactionType);
                console.log('Remove response:', response);
                if (response.data) {
                    setReactionBreakdown(response.data.reaction_breakdown || {});
                    setTotalReactions(response.data.reaction_count || 0);
                }
            } else if (previousReaction) {
                // Update reaction
                console.log('Updating reaction');
                const response = await updatePostReaction(post.id, reactionType);
                console.log('Update response:', response);
                if (response.data) {
                    setReactionBreakdown(response.data.reaction_breakdown || {});
                    setTotalReactions(response.data.reaction_count || 0);
                }
            } else {
                // Add new reaction
                console.log('Adding new reaction');
                const response = await addPostReaction(post.id, reactionType);
                console.log('Add response:', response);
                if (response.data) {
                    setReactionBreakdown(response.data.reaction_breakdown || {});
                    setTotalReactions(response.data.reaction_count || 0);
                }
            }
        } catch (error: any) {
            // Revert on error
            setUserReaction(previousReaction);
            setReactionBreakdown(previousBreakdown);
            setTotalReactions(post.reaction_count);
            
            // Detailed error logging
            console.error('Failed to update reaction - Full error:', error);
            console.error('Error type:', typeof error);
            console.error('Error keys:', Object.keys(error || {}));
            console.error('Error details:', {
                message: error?.message,
                name: error?.name,
                stack: error?.stack,
                response: error?.response,
                request: error?.request,
                config: error?.config,
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                data: error?.response?.data,
                url: error?.config?.url || error?.request?.responseURL,
                method: error?.config?.method,
                baseURL: error?.config?.baseURL,
                postId: post.id,
                reactionType
            });
        }
    };

    const getReactionDisplay = () => {
        if (!userReaction) return { emoji: '👍', text: 'Like', color: 'text-gray-500 hover:text-blue-500' };
        return {
            emoji: REACTION_EMOJIS[userReaction],
            text: userReaction,
            color: REACTION_COLORS[userReaction]
        };
    };

    // Use organization info if available, otherwise fall back to author
    const displayAvatar = post.organization_avatar 
        ? getMediaUrl(post.organization_avatar) 
        : (post.author?.avatar ? getMediaUrl(post.author.avatar) : '/default-avatar.png');

    const displayName = post.organization_name || 
        (post.author ? `${post.author.first_name} ${post.author.last_name}` : 'Unknown');
    
    // Check if we should show "UA" placeholder for Ungdomsappen
    const showUAPlaceholder = post.organization_name === 'Ungdomsappen' && !post.organization_avatar;

    const publishedDate = post.published_at 
        ? new Date(post.published_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        : new Date(post.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });

    return (
        <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            {/* Header */}
            <div className="p-4 flex items-center gap-3">
                {showUAPlaceholder ? (
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center border border-gray-200">
                        <span className="text-white font-bold text-sm">UA</span>
                    </div>
                ) : post.organization_avatar ? (
                    <img 
                        src={displayAvatar || '/default-avatar.png'} 
                        alt={displayName} 
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                    />
                ) : post.author ? (
                    <Avatar
                        src={post.author.avatar}
                        alt={displayName}
                        firstName={post.author.first_name}
                        lastName={post.author.last_name}
                        size="lg"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center border border-gray-200">
                        <span className="text-white font-bold text-sm">?</span>
                    </div>
                )}
                <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{displayName}</h4>
                    <p className="text-xs text-gray-500">{publishedDate}</p>
                </div>
                {post.is_pinned && (
                    <span className="ml-auto bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">
                        Pinned
                    </span>
                )}
            </div>

            {/* Content (Text) */}
            <div className="px-4 pb-2">
                <h3 className="text-lg font-bold mb-2">{post.title}</h3>
                <div 
                    ref={contentRef}
                    className={`text-gray-700 prose prose-sm max-w-none overflow-hidden transition-all ${
                        shouldTruncate && !isContentExpanded ? 'max-h-[144px]' : ''
                    }`}
                    dangerouslySetInnerHTML={{ __html: post.content }} 
                />
                {shouldTruncate && (
                    <button
                        onClick={() => setIsContentExpanded(!isContentExpanded)}
                        className="mt-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                    >
                        {isContentExpanded ? 'Show less' : 'Show more'}
                    </button>
                )}
            </div>

            {/* Media Area */}
            {post.post_type === 'IMAGE' && post.images.length > 0 && (
                <div className="mt-2 relative">
                    {post.images.length === 1 ? (
                        // Single image
                        <img 
                            src={getMediaUrl(post.images[0].image) || ''} 
                            alt="Post content" 
                            className="w-full h-auto max-h-[500px] object-cover bg-gray-50"
                        />
                    ) : post.images.length === 2 ? (
                        // Two images side by side
                        <div className="grid grid-cols-2 gap-1">
                            {post.images.map((img, idx) => (
                                <img
                                    key={img.id}
                                    src={getMediaUrl(img.image) || ''}
                                    alt={`Post image ${idx + 1}`}
                                    className="w-full h-[300px] object-cover bg-gray-50 cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setCurrentImageIndex(idx)}
                                />
                            ))}
                        </div>
                    ) : post.images.length === 3 ? (
                        // Three images: 2 on top, 1 on bottom
                        <div className="grid grid-cols-2 gap-1">
                            <img
                                src={getMediaUrl(post.images[0].image) || ''}
                                alt="Post image 1"
                                className="w-full h-[300px] object-cover bg-gray-50 cursor-pointer hover:opacity-90 transition-opacity row-span-2"
                                onClick={() => setCurrentImageIndex(0)}
                            />
                            <img
                                src={getMediaUrl(post.images[1].image) || ''}
                                alt="Post image 2"
                                className="w-full h-[149.5px] object-cover bg-gray-50 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setCurrentImageIndex(1)}
                            />
                            <img
                                src={getMediaUrl(post.images[2].image) || ''}
                                alt="Post image 3"
                                className="w-full h-[149.5px] object-cover bg-gray-50 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setCurrentImageIndex(2)}
                            />
                        </div>
                    ) : (
                        // More than 3 images: Show first 3 in grid, with indicator
                        <div className="relative">
                            <div className="grid grid-cols-2 gap-1">
                                <img
                                    src={getMediaUrl(post.images[0].image) || ''}
                                    alt="Post image 1"
                                    className="w-full h-[300px] object-cover bg-gray-50 cursor-pointer hover:opacity-90 transition-opacity row-span-2"
                                    onClick={() => setCurrentImageIndex(0)}
                                />
                                <img
                                    src={getMediaUrl(post.images[1].image) || ''}
                                    alt="Post image 2"
                                    className="w-full h-[149.5px] object-cover bg-gray-50 cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setCurrentImageIndex(1)}
                                />
                                <div className="relative">
                                    <img
                                        src={getMediaUrl(post.images[2].image) || ''}
                                        alt="Post image 3"
                                        className="w-full h-[149.5px] object-cover bg-gray-50 cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => setCurrentImageIndex(2)}
                                    />
                                    {/* Overlay showing remaining count */}
                                    <div 
                                        className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center cursor-pointer"
                                        onClick={() => setCurrentImageIndex(2)}
                                    >
                                        <span className="text-white font-bold text-xl">
                                            +{post.images.length - 3}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Image Carousel Modal */}
                    {currentImageIndex !== null && (
                        <div 
                            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
                            onClick={() => setCurrentImageIndex(null)}
                        >
                            <div 
                                className="relative max-w-4xl max-h-[90vh] w-full mx-4"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Close button */}
                                <button
                                    onClick={() => setCurrentImageIndex(null)}
                                    className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                
                                {/* Current image */}
                                <img
                                    src={getMediaUrl(post.images[currentImageIndex].image) || ''}
                                    alt={`Post image ${currentImageIndex + 1}`}
                                    className="w-full h-auto max-h-[90vh] object-contain"
                                />
                                
                                {/* Navigation arrows */}
                                {post.images.length > 1 && (
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentImageIndex((prev) => 
                                                    prev !== null && prev > 0 ? prev - 1 : post.images.length - 1
                                                );
                                            }}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCurrentImageIndex((prev) => 
                                                    prev !== null && prev < post.images.length - 1 ? prev + 1 : 0
                                                );
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </>
                                )}
                                
                                {/* Image counter */}
                                {post.images.length > 1 && currentImageIndex !== null && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
                                        {currentImageIndex + 1} / {post.images.length}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {post.post_type === 'VIDEO' && post.video_url && (
                <div className="relative w-full pb-[56.25%] bg-black">
                     <iframe 
                        className="absolute top-0 left-0 w-full h-full"
                        src={getYouTubeEmbedUrl(post.video_url)}
                        allowFullScreen 
                        title="Post Video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                </div>
            )}

            {/* Action Bar */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-6 relative">
                {/* Reaction Button with Picker */}
                <div 
                    className="relative" 
                    ref={pickerRef}
                    onMouseEnter={openPicker}
                    onMouseLeave={scheduleClose}
                >
                    <button 
                        onMouseEnter={openPicker}
                        onClick={(e) => {
                            // If picker is open, don't trigger reaction on button click
                            if (!isPickerOpen) {
                                handleReaction(userReaction || 'LIKE');
                            }
                        }}
                        className={`flex items-center gap-2 transition-colors ${getReactionDisplay().color}`}
                    >
                        <span className={`text-2xl transition-transform ${isAnimating ? 'scale-125' : 'scale-100'}`}>
                            {getReactionDisplay().emoji}
                        </span>
                        <span className="font-medium">{totalReactions || 0}</span>
                    </button>

                    {/* Reaction Picker - positioned very close with no gap */}
                    {(showReactionPicker || isPickerOpen) && (
                        <div 
                            className="absolute bottom-full left-0 bg-white rounded-full shadow-xl border border-gray-200 p-2 flex gap-1 z-50"
                            onMouseEnter={openPicker}
                            onMouseLeave={scheduleClose}
                            style={{ 
                                marginBottom: '2px', // Minimal gap
                                transform: 'translateY(0)',
                            }}
                        >
                            {/* Invisible bridge area to fill any gap */}
                            <div 
                                className="absolute -bottom-2 left-0 right-0 h-2"
                                onMouseEnter={openPicker}
                            />
                            
                            {(Object.keys(REACTION_EMOJIS) as ReactionType[]).map((reactionType) => (
                                <button
                                    key={reactionType}
                                    onClick={() => handleReaction(reactionType)}
                                    onMouseEnter={openPicker}
                                    className="text-2xl hover:scale-150 transition-transform p-1 cursor-pointer"
                                    title={reactionType}
                                >
                                    {REACTION_EMOJIS[reactionType]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Reaction Breakdown Tooltip */}
                {totalReactions > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                        {Object.entries(reactionBreakdown).map(([type, count]) => (
                            count > 0 && (
                                <span key={type} className="flex items-center gap-1">
                                    <span>{REACTION_EMOJIS[type as ReactionType]}</span>
                                    <span>{count}</span>
                                </span>
                            )
                        ))}
                    </div>
                )}

                {post.allow_comments ? (
                    <button 
                        onClick={toggleComments}
                        className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors ml-auto"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="font-medium">{commentCount}</span>
                    </button>
                ) : (
                    <div className="flex items-center gap-2 text-gray-300 cursor-not-allowed ml-auto" title="Comments are disabled for this post">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="font-medium">{commentCount}</span>
                    </div>
                )}
            </div>

            {/* Comments Section */}
            {showComments && post.allow_comments && (
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                    {/* Moderation Notice */}
                    {post.require_moderation && (
                        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-blue-800">
                                Comments on this post are moderated and will be reviewed before being published.
                            </p>
                        </div>
                    )}

                    {/* Success Message */}
                    {commentSubmitted && post.require_moderation && (
                        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-green-800">
                                Your comment has been submitted and is pending approval.
                            </p>
                        </div>
                    )}

                    {/* Comment Input */}
                    <form onSubmit={handleCommentSubmit} className="mb-4">
                        <div className="flex gap-2">
                            <Avatar
                                src={user?.avatar || null}
                                alt={`${user?.first_name || ''} ${user?.last_name || ''}`}
                                firstName={user?.first_name || ''}
                                lastName={user?.last_name || ''}
                                size="md"
                            />
                            <div className="flex-1">
                                <textarea
                                    ref={commentInputRef}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={2}
                                    maxLength={1000}
                                />
                                <div className="flex justify-end mt-2">
                                    <button
                                        type="submit"
                                        disabled={!newComment.trim() || submittingComment}
                                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {submittingComment ? 'Posting...' : 'Post'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Comments List */}
                    {loadingComments ? (
                        <div className="text-center py-4 text-gray-500 text-sm">Loading comments...</div>
                    ) : comments.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">No comments yet. Be the first to comment!</div>
                    ) : (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                    <Avatar
                                        src={comment.author.avatar || null}
                                        alt={`${comment.author.first_name} ${comment.author.last_name}`}
                                        firstName={comment.author.first_name}
                                        lastName={comment.author.last_name}
                                        size="md"
                                    />
                                    <div className="flex-1">
                                        <div className="bg-white rounded-lg px-3 py-2">
                                            <div className="flex items-baseline gap-2 mb-1 justify-between">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-semibold text-gray-900 text-sm">
                                                        {comment.author.first_name} {comment.author.last_name}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(comment.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: 'numeric',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                {user && comment.author.id === user.id && (
                                                    <button
                                                        onClick={() => handleDeleteComment(comment.id, false)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                        title="Delete comment"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-gray-800 text-sm whitespace-pre-wrap">{comment.content}</p>
                                        </div>
                                        {/* Replies */}
                                        {comment.replies && comment.replies.length > 0 && (
                                            <div className="ml-4 mt-2 space-y-2">
                                                {comment.replies.map((reply) => (
                                                    <div key={reply.id} className="flex gap-2">
                                                        <Avatar
                                                            src={reply.author.avatar || null}
                                                            alt={`${reply.author.first_name} ${reply.author.last_name}`}
                                                            firstName={reply.author.first_name}
                                                            lastName={reply.author.last_name}
                                                            size="sm"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="bg-white rounded-lg px-3 py-2">
                                                                <div className="flex items-baseline gap-2 mb-1 justify-between">
                                                                    <div className="flex items-baseline gap-2">
                                                                        <span className="font-semibold text-gray-900 text-xs">
                                                                            {reply.author.first_name} {reply.author.last_name}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500">
                                                                            {new Date(reply.created_at).toLocaleDateString('en-US', {
                                                                                month: 'short',
                                                                                day: 'numeric',
                                                                                hour: 'numeric',
                                                                                minute: '2-digit'
                                                                            })}
                                                                        </span>
                                                                    </div>
                                                                    {user && reply.author.id === user.id && (
                                                                        <button
                                                                            onClick={() => handleDeleteComment(reply.id, true)}
                                                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                                                            title="Delete reply"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                            </svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <p className="text-gray-800 text-xs whitespace-pre-wrap">{reply.content}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

