'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Group } from '@/types/organization';
import { Post } from '@/types/post';
import NavBar from '@/app/components/NavBar';
import PostCard from '@/app/components/posts/PostCard';
import { getMediaUrl } from '@/app/utils';
import SuccessModal from '@/app/components/SuccessModal';
import ConfirmationModal from '@/app/components/ConfirmationModal';

export default function GroupDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const groupId = id as string;

    const [group, setGroup] = useState<Group | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(false);
    
    // Modal states
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isLeaving, setIsLeaving] = useState(false);

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
            
            // Try to fetch posts specifically for this group using the new endpoint
            try {
                const url = `/posts/group_feed/?group=${groupId}`;
                console.log('Fetching group feed from:', url);
                const res = await api.get(url);
                groupPosts = res.data.results || res.data;
                if (!Array.isArray(groupPosts)) {
                    groupPosts = [];
                }
                console.log(`Fetched ${groupPosts.length} posts for group ${groupId} from group_feed endpoint`, {
                    groupId,
                    membershipStatus: group?.membership_status,
                    responseData: res.data
                });
            } catch (groupFeedError: any) {
                // Log the full error for debugging
                console.error('Group feed endpoint error - Full error object:', groupFeedError);
                console.error('Error type:', typeof groupFeedError);
                console.error('Error constructor:', groupFeedError?.constructor?.name);
                console.error('Error details:', {
                    status: groupFeedError?.response?.status,
                    statusText: groupFeedError?.response?.statusText,
                    message: groupFeedError?.message,
                    data: groupFeedError?.response?.data,
                    url: groupFeedError?.config?.url || groupFeedError?.request?.url,
                    method: groupFeedError?.config?.method,
                    baseURL: groupFeedError?.config?.baseURL,
                    stack: groupFeedError?.stack,
                    // Try to stringify the whole error
                    stringified: JSON.stringify(groupFeedError, Object.getOwnPropertyNames(groupFeedError))
                });
                
                // If it's a 404, the endpoint might not exist yet
                if (groupFeedError?.response?.status === 404) {
                    console.warn('Group feed endpoint returned 404 - endpoint may not be registered. Falling back to feed filtering.');
                }
                
                // Fallback: fetch from feed and filter client-side
                console.log('Falling back to feed filtering');
                try {
                    const res = await api.get('/posts/feed/');
                    let allPosts = res.data.results || res.data;
                    if (!Array.isArray(allPosts)) {
                        allPosts = [];
                    }
                    
                    // Filter posts that target this group
                    // target_groups is an array of group IDs
                    const groupIdNum = Number(groupId);
                    groupPosts = allPosts.filter((post: Post) => {
                        if (!post.target_groups || !Array.isArray(post.target_groups)) {
                            return false;
                        }
                        // Check if this group ID is in the target_groups array
                        return post.target_groups.some((id: number) => id === groupIdNum);
                    });
                    
                    console.log(`Found ${groupPosts.length} posts for group ${groupId} out of ${allPosts.length} total posts`);
                    if (allPosts.length > 0) {
                        console.log('Sample post target_groups:', allPosts[0]?.target_groups);
                    }
                } catch (feedError: any) {
                    console.error("Failed to fetch posts feed", {
                        error: feedError,
                        status: feedError.response?.status,
                        message: feedError.message
                    });
                    groupPosts = [];
                }
            }
            
            setPosts(groupPosts);
        } catch (error: any) {
            console.error("Failed to fetch posts", {
                error,
                status: error.response?.status,
                message: error.message
            });
            setPosts([]);
        } finally {
            setLoadingPosts(false);
        }
    };

    const handleJoin = async () => {
        if (!group) return;
        try {
            const res = await api.post(`/groups/${group.id}/join/`);
            setSuccessMessage(res.data.message || 'Successfully joined group!');
            setShowSuccessModal(true);
            await fetchGroupDetails();
            // After joining, fetch posts if membership is approved
            if (res.data.status === 'APPROVED') {
                fetchPosts();
            }
        } catch (err: any) {
            setErrorMessage(err.response?.data?.message || "Failed to join group. Please try again.");
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
            setSuccessMessage('Successfully left the group.');
            setShowSuccessModal(true);
            setShowLeaveConfirmModal(false);
            // Navigate back after a short delay to show success message
            setTimeout(() => {
                router.back();
            }, 1500);
        } catch (err: any) {
            setIsLeaving(false);
            setShowLeaveConfirmModal(false);
            setErrorMessage(err.response?.data?.message || "Failed to leave group. Please try again.");
            setShowErrorModal(true);
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <NavBar />
                <div className="flex justify-center items-center min-h-[50vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="min-h-screen bg-gray-50">
                <NavBar />
                <div className="p-10 text-center">
                    <p className="text-red-500 text-lg">Group not found</p>
                    <button 
                        onClick={() => router.back()}
                        className="mt-4 text-blue-600 hover:underline"
                    >
                        ← Back
                    </button>
                </div>
            </div>
        );
    }

    // Handle both old format (string) and new format (object with status and rejection_count)
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

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <main className="pb-20">
                
                {/* Back Button */}
                <div className="max-w-6xl mx-auto md:pt-6 md:px-6 px-4 pt-4">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors group"
                    >
                        <svg 
                            className="w-5 h-5 group-hover:-translate-x-1 transition-transform" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="text-base font-medium">Back</span>
                    </button>
                </div>

                {/* Group Header Container - same width as youth profile */}
                <div className="max-w-6xl mx-auto md:pt-2 md:px-6 px-4">
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                        
                        {/* Cover Image Area */}
                        <div 
                            className="relative h-48 md:h-64 bg-gray-200 w-full bg-cover bg-center"
                            style={{ 
                                backgroundImage: backgroundImageUrl 
                                    ? `url(${backgroundImageUrl})` 
                                    : avatarUrl 
                                    ? `url(${avatarUrl})` 
                                    : 'linear-gradient(to right, #3B82F6, #6366F1)'
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>

                        {/* Profile Info Area */}
                        <div className="relative px-6 pb-6">
                            
                            <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 mb-4">
                                
                                {/* Avatar */}
                                <div className="relative mr-5">
                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-white shadow-md overflow-hidden relative">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={group.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                                                <span className="text-4xl md:text-5xl">👥</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Text Info */}
                                <div className="flex-1 mt-4 md:mt-0 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h1 className="text-2xl font-bold text-gray-900 truncate">
                                            {group.name}
                                        </h1>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                            group.group_type === 'OPEN' 
                                                ? 'bg-green-100 text-green-700 border border-green-200'
                                                : group.group_type === 'CLOSED'
                                                ? 'bg-gray-100 text-gray-700 border border-gray-200'
                                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                                        }`}>
                                            {group.group_type === 'CLOSED' ? 'Private' : group.group_type}
                                        </span>
                                    </div>
                                    
                                    <p className="text-gray-500 text-sm mb-3">
                                        {group.club_name ? `Club: ${group.club_name}` : 
                                         group.municipality_name ? `Municipality: ${group.municipality_name}` : 
                                         "Global Group"}
                                    </p>

                                    {group.description && (
                                        <p className="text-gray-700 text-sm mb-3 line-clamp-2">
                                            {group.description}
                                        </p>
                                    )}

                                    {/* Eligibility Warning */}
                                    {!group.eligibility.is_eligible && !isMember && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                                            <p className="text-sm font-medium text-yellow-800 mb-1">Requirements not met:</p>
                                            <ul className="text-sm text-yellow-700 list-disc list-inside">
                                                {group.eligibility.reasons.map((reason, i) => (
                                                    <li key={i}>{reason}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 mt-4 md:mt-0 md:ml-auto">
                                    {isMember ? (
                                        <button
                                            onClick={handleLeaveClick}
                                            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition shadow-sm"
                                        >
                                            Leave Group
                                        </button>
                                    ) : isPending ? (
                                        <span className="px-6 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-medium">
                                            Application Pending
                                        </span>
                                    ) : maxRejectionsReached ? (
                                        <span className="px-6 py-2 bg-gray-200 text-gray-600 rounded-lg font-medium cursor-not-allowed">
                                            Maximum Applications Reached
                                        </span>
                                    ) : (
                                        <button 
                                            onClick={handleJoin} 
                                            disabled={!group.eligibility.is_eligible || maxRejectionsReached}
                                            className={`px-6 py-2 rounded-lg text-white font-bold shadow-sm transition ${
                                                (group.eligibility.is_eligible && !maxRejectionsReached)
                                                    ? 'bg-blue-600 hover:bg-blue-700' 
                                                    : 'bg-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            {group.eligibility.is_eligible 
                                                ? (group.group_type === 'OPEN' ? 'Join Group' : 'Apply to Join')
                                                : 'Not Eligible'}
                                        </button>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="mt-6">
                    <div className="max-w-6xl mx-auto px-4 md:px-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                            
                            {/* LEFT COLUMN - About Info (Sticky) */}
                            <aside className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-[72px] lg:self-start lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
                                    <h3 className="text-lg font-bold text-gray-900">About</h3>
                                    
                                    {group.description && (
                                        <div>
                                            <p className="text-gray-700 whitespace-pre-line text-sm">
                                                {group.description}
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-4 text-sm">
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <span className="font-semibold block text-gray-900 mb-1">Group Type</span>
                                            <span className="text-gray-600">
                                                {group.group_type === 'OPEN' ? 'Open Group' : group.group_type === 'CLOSED' ? 'Private Group' : 'Application Required'}
                                            </span>
                                        </div>

                                        {(group.min_age || group.max_age) && (
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <span className="font-semibold block text-gray-900 mb-1">Age Range</span>
                                                <span className="text-gray-600">
                                                    {group.min_age || 0} - {group.max_age || 'Any'} years
                                                </span>
                                            </div>
                                        )}

                                        {group.grades && group.grades.length > 0 && (
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <span className="font-semibold block text-gray-900 mb-2">Allowed Grades</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {group.grades.map((grade) => (
                                                        <span key={grade} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                                            Grade {grade}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {group.genders && group.genders.length > 0 && (
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <span className="font-semibold block text-gray-900 mb-2">Allowed Genders</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {group.genders.map((gender) => (
                                                        <span key={gender} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                                            {gender}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <span className="font-semibold block text-gray-900 mb-1">Created</span>
                                            <span className="text-gray-600">
                                                {new Date(group.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Eligibility Info */}
                                    {!group.eligibility.is_eligible && (
                                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-sm font-medium text-yellow-800 mb-2">Requirements not met:</p>
                                            <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                                                {group.eligibility.reasons.map((reason, i) => (
                                                    <li key={i}>{reason}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </aside>

                            {/* RIGHT COLUMN - Posts Feed */}
                            <main className="flex-1 min-w-0">
                                {!isMember ? (
                                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                                        <p className="text-gray-500">You must join this group to see posts and events.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {loadingPosts ? (
                                            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                                                <p className="text-gray-500 mt-4">Loading posts...</p>
                                            </div>
                                        ) : posts.length > 0 ? (
                                            posts.map(post => (
                                                <PostCard 
                                                    key={post.id} 
                                                    post={post}
                                                />
                                            ))
                                        ) : (
                                            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                                                <p className="text-gray-500">No posts yet. Be the first to say hello!</p>
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
                title="Success!"
            />
            
            {/* Leave Confirmation Modal */}
            <ConfirmationModal
                isVisible={showLeaveConfirmModal}
                onClose={() => setShowLeaveConfirmModal(false)}
                onConfirm={handleLeaveConfirm}
                title="Leave Group?"
                message="Are you sure you want to leave this group? You'll need to join again to see posts and events."
                confirmButtonText="Leave Group"
                cancelButtonText="Cancel"
                isLoading={isLeaving}
                variant="warning"
            />
            
            {/* Error Modal - Using SuccessModal with error styling */}
            {showErrorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
                        {/* Header with error icon */}
                        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white text-center">
                            <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold">Error</h2>
                        </div>

                        {/* Message */}
                        <div className="p-6">
                            <p className="text-gray-700 text-center leading-relaxed">
                                {errorMessage}
                            </p>
                        </div>

                        {/* Button */}
                        <div className="p-6 pt-0">
                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg transition-colors"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
