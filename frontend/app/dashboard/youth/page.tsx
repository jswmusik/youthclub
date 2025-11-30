'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchYouthFeed } from '../../../lib/api';
import PostCard from '../../components/posts/PostCard';
import { Post } from '../../../types/post';
import { useAuth } from '../../../context/AuthContext';
import Cookies from 'js-cookie';
import NavBar from '../../components/NavBar';
import RecommendedClubs from '../../components/RecommendedClubs';
import PreferredClubCard from '../../components/PreferredClubCard';

export default function YouthDashboard() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const observerTarget = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        // Check if user is authenticated
        const token = Cookies.get('access_token');
        if (!token) {
            router.push('/login');
            return;
        }
        
        // Check if user has correct role
        if (user && user.role !== 'YOUTH_MEMBER') {
            router.push('/login');
            return;
        }
        
        loadFeed(1, false);
    }, [user, router]);

    const loadFeed = useCallback(async (pageNum: number, append: boolean = false) => {
        try {
            if (append) {
                setLoadingMore(true);
            } else {
                setError(null);
                setLoading(true);
            }
            
            const res = await fetchYouthFeed(pageNum);
            const newPosts = res.data.results || res.data;
            
            if (append) {
                setPosts(prev => [...prev, ...newPosts]);
            } else {
                setPosts(newPosts);
            }
            
            // Check if there are more pages
            setHasMore(!!res.data.next);
        } catch (err: any) {
            console.error('Failed to load feed:', err);
            if (err?.response?.status === 401) {
                // Unauthorized - redirect to login
                Cookies.remove('access_token');
                Cookies.remove('refresh_token');
                setError('Your session has expired. Please log in again.');
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            } else {
                setError('Failed to load your feed. Please try again later.');
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [router]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    loadFeed(nextPage, true);
                }
            },
            { threshold: 0.1 }
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [hasMore, loadingMore, loading, page, loadFeed]);

    return (
        <div className="min-h-screen bg-gray-100">
            <NavBar />
            <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
            <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar (Navigation) - Styled like groups page */}
            <aside className="w-full md:w-64 flex-shrink-0 space-y-8 md:sticky md:top-[72px] md:self-start md:max-h-[calc(100vh-88px)] md:overflow-y-auto">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">Your Activity & Navigation</p>
                </div>

                {/* Navigation Menu */}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Navigation</label>
                    <div className="space-y-1">
                        {/* Your Feed - Current page, just scroll to top */}
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors bg-blue-50 text-blue-700 font-medium"
                        >
                            Your Feed
                        </button>
                        
                        {/* Groups - Link to groups page */}
                        <button
                            onClick={() => router.push('/dashboard/youth/groups')}
                            className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50 flex items-center justify-between group"
                        >
                            <span className="group-hover:text-blue-600">Groups</span>
                            {(() => {
                                const memberships = (user as any)?.my_memberships || [];
                                const approvedCount = memberships.filter((m: any) => m.status === 'APPROVED').length;
                                return approvedCount > 0 ? (
                                    <span className="bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                        {approvedCount}
                                    </span>
                                ) : null;
                            })()}
                        </button>
                        
                        {/* My Groups - Link to profile clubs tab */}
                        <button
                            onClick={() => router.push('/dashboard/youth/profile?tab=clubs')}
                            className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50"
                        >
                            My Groups
                        </button>
                        
                        {/* My Guardians */}
                        <button
                            onClick={() => router.push('/dashboard/youth/profile?tab=guardians')}
                            className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50"
                        >
                            My Guardians
                        </button>
                        
                        {/* My Club - Link to preferred club */}
                        {user?.preferred_club?.id ? (
                            <button
                                onClick={() => router.push(`/dashboard/youth/club/${user.preferred_club.id}`)}
                                className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50"
                            >
                                My Club
                            </button>
                        ) : (
                            <button
                                disabled
                                className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-400 cursor-not-allowed"
                            >
                                My Club
                            </button>
                        )}
                        
                        {/* News */}
                        <button
                            onClick={() => router.push('/dashboard/youth/news')}
                            className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors text-gray-600 hover:bg-gray-50"
                        >
                            News
                        </button>
                        
                        {/* Events - No link, but show badge */}
                        <button
                            disabled
                            className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-400 cursor-not-allowed flex items-center justify-between"
                        >
                            <span>Events</span>
                            <span className="bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                6
                            </span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Feed */}
            <main className="flex-1">
                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg mb-8">
                    <h1 className="text-2xl font-bold mb-2">Welcome back! 👋</h1>
                    <p className="opacity-90">Here is what's happening in your club today.</p>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading your feed...</div>
                ) : error ? (
                    <div className="text-center py-10 bg-red-50 rounded-xl border border-red-200">
                        <p className="text-red-600 font-medium">{error}</p>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-dashed">
                        No posts yet. Join some groups to see more!
                    </div>
                ) : (
                    <div className="space-y-6">
                        {posts.map((post, index) => (
                            <div key={post.id}>
                                <PostCard post={post} />
                                {/* Show Recommended Clubs after the first post */}
                                {index === 0 && <RecommendedClubs />}
                            </div>
                        ))}
                        
                        {/* Infinite Scroll Trigger */}
                        <div ref={observerTarget} className="h-10 flex items-center justify-center">
                            {loadingMore && (
                                <div className="flex items-center gap-2 text-gray-500">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                    <span className="text-sm">Loading more posts...</span>
                                </div>
                            )}
                            {!hasMore && posts.length > 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">
                                    You've reached the end of your feed
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Right Sidebar (Trending/Events) */}
            <aside className="lg:w-1/4 hidden lg:block">
                <div className="sticky top-[72px] self-start max-h-[calc(100vh-88px)] overflow-y-auto">
                    {/* Preferred Club Card */}
                    <PreferredClubCard club={user?.preferred_club || null} />
                    
                    {/* Placeholders for upcoming features */}
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                        <h3 className="font-bold text-gray-800 mb-4">Upcoming Events</h3>
                        <p className="text-sm text-gray-500">No events scheduled.</p>
                    </div>
                </div>
            </aside>
            </div>
        </div>
        </div>
    );
}