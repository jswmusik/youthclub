'use client';

import { useState, useEffect } from 'react';
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
    const [error, setError] = useState<string | null>(null);
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
        
        loadFeed();
    }, [user, router]);

    const loadFeed = async () => {
        try {
            setError(null);
            const res = await fetchYouthFeed();
            setPosts(res.data.results || res.data); // Handle pagination structure
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
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <NavBar />
            <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto p-4 lg:p-8">
            {/* Sidebar (Navigation) - You can extract this to a component */}
            <aside className="lg:w-1/4 hidden lg:block">
                <div className="sticky top-20 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="font-bold text-gray-800 mb-4">Menu</h3>
                        <ul className="space-y-3 text-gray-600">
                            <li className="font-bold text-blue-600">News Feed</li>
                            <li className="hover:text-blue-600 cursor-pointer">My Groups</li>
                            <li className="hover:text-blue-600 cursor-pointer">My Club</li>
                            <li className="hover:text-blue-600 cursor-pointer">Events</li>
                        </ul>
                    </div>
                </div>
            </aside>

            {/* Main Feed */}
            <main className="lg:w-1/2 flex-1">
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
                    </div>
                )}
            </main>

            {/* Right Sidebar (Trending/Events) */}
            <aside className="lg:w-1/4 hidden lg:block">
                <div className="sticky top-20">
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
    );
}