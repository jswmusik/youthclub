'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Post } from '../../../types/post';
import { addPostReaction, updatePostReaction, removePostReaction, fetchPostComments, createPostComment, deletePostComment } from '../../../lib/api';
import { getMediaUrl } from '../../utils';
import { useAuth } from '../../../context/AuthContext';
import ConfirmationModal from '../ConfirmationModal';

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
    darkMode?: boolean;
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

// Flat icon components for reactions
const ReactionIcon = ({ type, className = "w-6 h-6" }: { type: ReactionType, className?: string }) => {
    const icons: Record<ReactionType, JSX.Element> = {
        LIKE: (
            <svg className={className} fill="currentColor" viewBox="0 0 24 24">
                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
            </svg>
        ),
        LOVE: (
            <svg className={className} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
        ),
        LAUGH: (
            <svg className={className} fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor"/>
                <circle cx="15.5" cy="9.5" r="1.5" fill="currentColor"/>
                <path d="M8 15c1.5 1 3 1.5 4 1.5s2.5-.5 4-1.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
        ),
        WOW: (
            <svg className={className} fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor"/>
                <circle cx="15.5" cy="9.5" r="1.5" fill="currentColor"/>
            </svg>
        ),
        SAD: (
            <svg className={className} fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor"/>
                <circle cx="15.5" cy="9.5" r="1.5" fill="currentColor"/>
                <path d="M8 16c1.5-1 3-1.5 4-1.5s2.5.5 4 1.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
        ),
        ANGRY: (
            <svg className={className} fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 10.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5S10.33 9 9.5 9 8 9.67 8 10.5zm5 0c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5S15.33 9 14.5 9 13 9.67 13 10.5z"/>
                <path d="M8 16c1.5 1 3 1.5 4 1.5s2.5-.5 4-1.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
        ),
    };
    return icons[type];
};

const REACTION_COLORS: Record<ReactionType, string> = {
    LIKE: 'text-[#6D6DD4]',
    LOVE: 'text-[#FF5485]',
    LAUGH: 'text-[#6D6DD4]',
    WOW: 'text-[#FF5485]',
    SAD: 'text-[#4D4DA4]',
    ANGRY: 'text-[#FF5485]',
};

export default function PostCard({ post, darkMode = false }: PostCardProps) {
    const { user } = useAuth();
    const router = useRouter();
    const t = useTranslations('posts');
    const tCommon = useTranslations('common');
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
    const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
    const [isDeletingComment, setIsDeletingComment] = useState(false);
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

    const handleDeleteComment = (commentId: number, isReply: boolean = false) => {
        setCommentToDelete(commentId);
        setShowDeleteCommentModal(true);
    };

    const handleDeleteCommentConfirm = async () => {
        if (!commentToDelete) return;

        try {
            setIsDeletingComment(true);
            await deletePostComment(commentToDelete);
            // Reload comments - this will update the count correctly
            await loadComments();
            setShowDeleteCommentModal(false);
            setCommentToDelete(null);
        } catch (error) {
            console.error('Failed to delete comment:', error);
            alert('Failed to delete comment. Please try again.');
        } finally {
            setIsDeletingComment(false);
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
        if (!userReaction) return { icon: 'LIKE', text: 'Like', color: darkMode ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)]' : 'text-gray-600 hover:text-[#6D6DD4]' };
        return {
            icon: userReaction,
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
    
    // Check if this is a club post (has club ID)
    const isClubPost = post.club !== null && post.club !== undefined;

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

    // Check if this is a group announcement post
    const isGroupAnnouncement = post.title.startsWith('Ny Grupp:') || post.title.startsWith('New Group:');
    
    // Extract group ID from post content
    const groupIdMatch = post.content?.match(/\/dashboard\/youth\/groups\/(\d+)/);
    const groupId = groupIdMatch ? groupIdMatch[1] : null;
    
    // Extract group name from title
    const groupName = isGroupAnnouncement && post.title.includes(':') 
        ? post.title.split(':')[1].trim() 
        : null;
    
    // Extract description excerpt from content (first paragraph after the title)
    const descriptionMatch = post.content?.match(/<p>(.*?)<\/p>/g);
    const descriptionExcerpt = descriptionMatch && descriptionMatch.length > 1 
        ? descriptionMatch[1].replace(/<[^>]*>/g, '').substring(0, 100) + '...'
        : null;

    return (
        <div className={`${darkMode ? 'bg-[var(--dark-900)]' : (isGroupAnnouncement ? 'bg-white' : 'bg-white')} rounded-none sm:rounded-2xl ${darkMode ? 'mb-6' : 'shadow-lg mb-6'} border-t sm:border ${darkMode ? 'border-[var(--dark-500)]' : (isGroupAnnouncement ? 'border-[#4D4DA4]/40' : 'border-gray-200')} overflow-hidden`}>
            {/* Header */}
            <div className={`p-4 flex items-center gap-3 border-b ${darkMode ? 'border-[var(--dark-500)]' : 'border-gray-200'}`}>
                {showUAPlaceholder ? (
                    <div className="h-10 w-auto flex items-center justify-center flex-shrink-0">
                        <img 
                            src="/ua-icon-2026.svg" 
                            alt="Ungdomsappen Logo" 
                            className="h-full w-auto object-contain"
                        />
                    </div>
                ) : post.organization_avatar ? (
                    <button
                        onClick={() => {
                            if (isClubPost && post.club) {
                                router.push(`/dashboard/youth/club/${post.club}`);
                            }
                        }}
                        className={isClubPost ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
                        disabled={!isClubPost}
                    >
                        <img 
                            src={displayAvatar || '/default-avatar.png'} 
                            alt={displayName} 
                            className={`w-10 h-10 rounded-full object-cover border ${darkMode ? 'border-[var(--dark-500)]' : 'border-gray-200'} ${isClubPost ? 'hover:border-[var(--brand-primary)]' : ''}`}
                        />
                    </button>
                ) : post.author ? (
                    <Avatar
                        src={post.author.avatar}
                        alt={displayName}
                        firstName={post.author.first_name}
                        lastName={post.author.last_name}
                        size="lg"
                    />
                ) : (
                    <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-[var(--dark-500)]' : 'bg-gray-300'} flex items-center justify-center border ${darkMode ? 'border-[var(--dark-400)]' : 'border-gray-200'}`}>
                        <span className={`${darkMode ? 'text-[var(--brand-light)]' : 'text-white'} font-bold text-sm`}>?</span>
                    </div>
                )}
                <div className="flex-1">
                    {isClubPost && post.club ? (
                        <button
                            onClick={() => router.push(`/dashboard/youth/club/${post.club}`)}
                            className="text-left hover:opacity-80 transition-opacity"
                        >
                            <h4 className={`font-bold ${darkMode ? 'text-[var(--brand-light)] hover:text-[var(--brand-primary)]' : 'text-gray-800 hover:text-[#6D6DD4]'}`}>{displayName}</h4>
                        </button>
                    ) : (
                        <h4 className={`font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{displayName}</h4>
                    )}
                    <p className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{publishedDate}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {isGroupAnnouncement && (
                        <span className={`${darkMode ? 'bg-[var(--brand-secondary)]/20 text-[var(--brand-purple)] border-[var(--brand-secondary)]/30' : 'bg-[#4D4DA4]/20 text-[#6D6DD4] border-[#4D4DA4]/30'} text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 border`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {t('group')}
                        </span>
                    )}
                    {post.is_pinned && (
                        <span className={`${darkMode ? 'bg-[var(--brand-secondary)]/20 text-[var(--brand-purple)] border-[var(--brand-secondary)]/30' : 'bg-[#4D4DA4]/20 text-[#6D6DD4] border-[#4D4DA4]/30'} text-xs px-2 py-1 rounded-full font-bold border`}>
                            {t('pinned')}
                        </span>
                    )}
                </div>
            </div>

            {/* Content (Text) - Hidden for group announcements since we show it in the header */}
            {!isGroupAnnouncement && (
                <div className="px-4 pt-4 pb-2">
                    <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{post.title}</h3>
                    <div 
                        ref={contentRef}
                        className={`${darkMode ? 'text-[var(--brand-light)]/80 prose-headings:text-[var(--brand-light)] prose-p:text-[var(--brand-light)]/80 prose-a:text-[var(--brand-primary)] prose-strong:text-[var(--brand-light)] prose-li:text-[var(--brand-light)]/80 prose-ul:text-[var(--brand-light)]/80 prose-ol:text-[var(--brand-light)]/80' : 'text-gray-700 prose-headings:text-gray-800 prose-p:text-gray-700 prose-a:text-[#6D6DD4] prose-strong:text-gray-800 prose-li:text-gray-700 prose-ul:text-gray-700 prose-ol:text-gray-700'} prose prose-sm max-w-none overflow-hidden transition-all ${
                            shouldTruncate && !isContentExpanded ? 'max-h-[144px]' : ''
                        }`}
                        dangerouslySetInnerHTML={{ __html: post.content }} 
                    />
                    {shouldTruncate && (
                        <button
                            onClick={() => setIsContentExpanded(!isContentExpanded)}
                            className={`mt-2 ${darkMode ? 'text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/80' : 'text-[#6D6DD4] hover:text-[#7D7DE4]'} font-medium text-sm transition-colors`}
                        >
                            {isContentExpanded ? t('showLess') : t('showMore')}
                        </button>
                    )}
                </div>
            )}

            {/* Group Announcement Header (above image) */}
            {isGroupAnnouncement && groupName && (
                <div className={`px-4 pt-4 pb-3 ${darkMode ? 'bg-[var(--dark-600)] border-b border-[var(--dark-500)]' : 'bg-[#4D4DA4]/10 border-b border-[#4D4DA4]/20'}`}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <h3 className={`text-lg font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'} mb-1`}>{groupName}</h3>
                            {descriptionExcerpt && (
                                <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'} line-clamp-2`}>{descriptionExcerpt}</p>
                            )}
                        </div>
                        {groupId && (
                            <button
                                onClick={() => router.push(`/dashboard/youth/groups/${groupId}`)}
                                className={`px-4 py-2 ${darkMode ? 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 text-[var(--dark-900)]' : 'bg-[#4D4DA4] hover:bg-[#5D5DB4] text-white shadow-lg shadow-[#4D4DA4]/20'} font-semibold rounded-lg transition-colors whitespace-nowrap flex-shrink-0`}
                            >
                                {t('viewGroup')}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Media Area */}
            {post.post_type === 'IMAGE' && post.images.length > 0 && (
                <div className={`${isGroupAnnouncement ? '' : 'mt-2'} relative`}>
                    {post.images.length === 1 ? (
                        // Single image
                        <img 
                            src={getMediaUrl(post.images[0].image) || ''} 
                            alt={t('postContent')}
                            className="w-full h-auto max-h-[500px] object-cover bg-black"
                        />
                    ) : post.images.length === 2 ? (
                        // Two images side by side
                        <div className="grid grid-cols-2 gap-1">
                            {post.images.map((img, idx) => (
                                <img
                                    key={img.id}
                                    src={getMediaUrl(img.image) || ''}
                                    alt={`${t('postImage')} ${idx + 1}`}
                                    className="w-full h-[300px] object-cover bg-black cursor-pointer hover:opacity-90 transition-opacity"
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
                        title={t('postVideo')}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                </div>
            )}

            {/* Action Bar */}
            <div className={`px-4 py-3 border-t ${darkMode ? 'border-[var(--dark-500)]' : 'border-gray-200'} flex items-center gap-6 relative`}>
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
                            e.stopPropagation();
                            // On mobile (touch), toggle the picker. On desktop with picker open, close it.
                            if (isPickerOpen) {
                                setShowReactionPicker(false);
                                setIsPickerOpen(false);
                            } else {
                                // Open picker on tap/click
                                setShowReactionPicker(true);
                                setIsPickerOpen(true);
                            }
                        }}
                        className={`flex items-center gap-2 transition-colors ${getReactionDisplay().color}`}
                    >
                        <span className={`transition-transform ${isAnimating ? 'scale-125' : 'scale-100'}`}>
                            <ReactionIcon type={getReactionDisplay().icon as ReactionType} className="w-6 h-6" />
                        </span>
                        <span className="font-medium">{totalReactions || 0}</span>
                    </button>

                    {/* Reaction Picker - fixed position on mobile for better accessibility */}
                    {(showReactionPicker || isPickerOpen) && (
                        <>
                            {/* Mobile: Fixed bottom sheet style */}
                            <div 
                                className={`sm:hidden fixed bottom-20 left-4 right-4 ${darkMode ? 'bg-[var(--dark-500)] border-[var(--dark-400)]' : 'bg-white border-gray-200'} rounded-2xl shadow-2xl border p-4 flex justify-around z-[100]`}
                            >
                                {(Object.keys(REACTION_COLORS) as ReactionType[]).map((reactionType) => {
                                    const pickerColors: Record<ReactionType, string> = {
                                        LIKE: 'text-[var(--brand-purple)]',
                                        LOVE: 'text-[var(--brand-primary)]',
                                        LAUGH: 'text-[var(--brand-third)]',
                                        WOW: 'text-[var(--brand-sky)]',
                                        SAD: 'text-[var(--brand-blue)]',
                                        ANGRY: 'text-[var(--brand-red)]',
                                    };
                                    return (
                                        <button
                                            key={reactionType}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleReaction(reactionType);
                                            }}
                                            className={`active:scale-90 transition-transform p-2 cursor-pointer ${darkMode ? pickerColors[reactionType] : REACTION_COLORS[reactionType]}`}
                                            title={reactionType}
                                        >
                                            <ReactionIcon type={reactionType} className="w-8 h-8" />
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Mobile backdrop */}
                            <div 
                                className="sm:hidden fixed inset-0 bg-black/50 z-[99]"
                                onClick={() => {
                                    setShowReactionPicker(false);
                                    setIsPickerOpen(false);
                                }}
                            />
                            
                            {/* Desktop: Original positioned picker */}
                            <div 
                                className={`hidden sm:flex absolute bottom-full left-0 ${darkMode ? 'bg-[var(--dark-500)] border-[var(--dark-400)]' : 'bg-white border-gray-200'} rounded-full shadow-xl border p-2 gap-1 z-50`}
                                onMouseEnter={openPicker}
                                onMouseLeave={scheduleClose}
                                style={{ 
                                    marginBottom: '8px',
                                    transform: 'translateY(0)',
                                }}
                            >
                                {/* Invisible bridge area to fill any gap */}
                                <div 
                                    className="absolute -bottom-3 left-0 right-0 h-4"
                                    onMouseEnter={openPicker}
                                />
                                
                                {(Object.keys(REACTION_COLORS) as ReactionType[]).map((reactionType) => {
                                    const pickerColors: Record<ReactionType, string> = {
                                        LIKE: 'text-[var(--brand-purple)]',
                                        LOVE: 'text-[var(--brand-primary)]',
                                        LAUGH: 'text-[var(--brand-third)]',
                                        WOW: 'text-[var(--brand-sky)]',
                                        SAD: 'text-[var(--brand-blue)]',
                                        ANGRY: 'text-[var(--brand-red)]',
                                    };
                                    return (
                                        <button
                                            key={reactionType}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleReaction(reactionType);
                                            }}
                                            onMouseEnter={openPicker}
                                            className={`hover:scale-125 active:scale-110 transition-transform p-1 cursor-pointer ${darkMode ? pickerColors[reactionType] : REACTION_COLORS[reactionType]}`}
                                            title={reactionType}
                                        >
                                            <ReactionIcon type={reactionType} className="w-6 h-6" />
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Reaction Breakdown Tooltip */}
                {totalReactions > 0 && (
                    <div className={`flex items-center gap-1 text-xs ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                        {Object.entries(reactionBreakdown).map(([type, count]) => (
                            count > 0 && (
                                <span key={type} className="flex items-center gap-1">
                                    <ReactionIcon type={type as ReactionType} className="w-4 h-4" />
                                    <span>{count}</span>
                                </span>
                            )
                        ))}
                    </div>
                )}

                {post.allow_comments ? (
                    <button 
                        onClick={toggleComments}
                        className={`flex items-center gap-2 ${darkMode ? 'text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)]' : 'text-gray-600 hover:text-[#6D6DD4]'} transition-colors ml-auto`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="font-medium">{commentCount}</span>
                    </button>
                ) : (
                    <div className={`flex items-center gap-2 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-500'} cursor-not-allowed ml-auto`} title={t('commentsDisabled')}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="font-medium">{commentCount}</span>
                    </div>
                )}
            </div>

            {/* Comments Section */}
            {showComments && post.allow_comments && (
                <div className={`px-4 py-3 border-t ${darkMode ? 'border-[var(--dark-500)] bg-[var(--dark-600)]' : 'border-gray-200 bg-gray-50'}`}>
                    {/* Moderation Notice */}
                    {post.require_moderation && (
                        <div className={`mb-3 p-2 ${darkMode ? 'bg-[var(--brand-secondary)]/20 border-[var(--brand-secondary)]/30' : 'bg-[#4D4DA4]/20 border-[#4D4DA4]/30'} border rounded-lg flex items-start gap-2`}>
                            <svg className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#6D6DD4]'} flex-shrink-0 mt-0.5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/80' : 'text-gray-700'}`}>
                                {t('commentsModerated')}
                            </p>
                        </div>
                    )}

                    {/* Success Message */}
                    {commentSubmitted && post.require_moderation && (
                        <div className="mb-3 p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-start gap-2">
                            <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-emerald-400">
                                {t('commentPendingApproval')}
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
                                    placeholder={t('writeComment')}
                                    className={`w-full px-3 py-2 border ${darkMode ? 'border-[var(--dark-400)] bg-[var(--dark-700)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)]' : 'border-gray-200 bg-white text-gray-800 placeholder-gray-500 focus:ring-[#4D4DA4] focus:border-[#4D4DA4]'} rounded-lg resize-none focus:outline-none focus:ring-2`}
                                    rows={2}
                                    maxLength={1000}
                                />
                                <div className="flex justify-end mt-2">
                                    <button
                                        type="submit"
                                        disabled={!newComment.trim() || submittingComment}
                                        className={`px-4 py-1.5 ${darkMode ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/80' : 'bg-[#4D4DA4] text-white hover:bg-[#5D5DB4] shadow-lg shadow-[#4D4DA4]/20'} rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                                    >
                                        {submittingComment ? t('posting') : t('post')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Comments List */}
                    {loadingComments ? (
                        <div className={`text-center py-4 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'} text-sm`}>{t('loadingComments')}</div>
                    ) : comments.length === 0 ? (
                        <div className={`text-center py-4 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'} text-sm`}>{t('noCommentsYet')}</div>
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
                                        <div className={`${darkMode ? 'bg-[var(--dark-700)] border-[var(--dark-400)]' : 'bg-white border-gray-200'} rounded-lg px-3 py-2 border`}>
                                            <div className="flex items-baseline gap-2 mb-1 justify-between">
                                                <div className="flex items-baseline gap-2">
                                                    <span className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'} text-sm`}>
                                                        {comment.author.first_name} {comment.author.last_name}
                                                    </span>
                                                    <span className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-600'}`}>
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
                                                        className={`${darkMode ? 'text-[var(--brand-light)]/50 hover:text-[var(--brand-red)]' : 'text-gray-600 hover:text-[#FF5485]'} transition-colors`}
                                                        title={t('deleteComment')}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                            <p className={`${darkMode ? 'text-[var(--brand-light)]/80' : 'text-gray-700'} text-sm whitespace-pre-wrap`}>{comment.content}</p>
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
                                                            <div className={`${darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' : 'bg-gray-50 border-gray-200'} rounded-lg px-3 py-2 border`}>
                                                                <div className="flex items-baseline gap-2 mb-1 justify-between">
                                                                    <div className="flex items-baseline gap-2">
                                                                        <span className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'} text-xs`}>
                                                                            {reply.author.first_name} {reply.author.last_name}
                                                                        </span>
                                                                        <span className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-600'}`}>
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
                                                                            className={`${darkMode ? 'text-[var(--brand-light)]/50 hover:text-[var(--brand-red)]' : 'text-gray-600 hover:text-[#FF5485]'} transition-colors`}
                                                                            title={t('deleteReply')}
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                            </svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <p className={`${darkMode ? 'text-[var(--brand-light)]/80' : 'text-gray-700'} text-xs whitespace-pre-wrap`}>{reply.content}</p>
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

            {/* Delete Comment Confirmation Modal */}
            <ConfirmationModal
                isVisible={showDeleteCommentModal}
                onClose={() => {
                    if (!isDeletingComment) {
                        setShowDeleteCommentModal(false);
                        setCommentToDelete(null);
                    }
                }}
                onConfirm={handleDeleteCommentConfirm}
                title={t('deleteComment')}
                message={t('deleteCommentConfirm')}
                confirmButtonText={tCommon('delete')}
                cancelButtonText={tCommon('cancel')}
                isLoading={isDeletingComment}
                variant="danger"
            />
        </div>
    );
}

