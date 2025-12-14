'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchYouthFeed } from '../../../lib/api';
import PostCard from '../../components/posts/PostCard';
import QuestionnaireCard from '../../components/questionnaires/QuestionnaireCard';
import EventCard from '../../components/events/youth/EventCard';
import { useAuth } from '../../../context/AuthContext';
import Cookies from 'js-cookie';
import NavBar from '../../components/NavBar';
import RecommendedClubs from '../../components/RecommendedClubs';
import RecommendedGroups from '../../components/RecommendedGroups';
import PreferredClubCard from '../../components/PreferredClubCard';
import { questionnaireApi } from '../../../lib/questionnaire-api';

// Define interface for the mixed feed items
interface FeedItem {
    id: any;
    feed_type: 'POST' | 'REWARD' | 'QUESTIONNAIRE';
    [key: string]: any; // Allow other props
}

export default function YouthDashboard() {
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [unfinishedCount, setUnfinishedCount] = useState(0);
    const [isSidebarSticky, setIsSidebarSticky] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLElement>(null);
    const sidebarInitialTopRef = useRef<number | null>(null);
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
        loadUnfinishedCount();
    }, [user, router]);

    const loadUnfinishedCount = async () => {
        try {
            let allQuestionnaires: any[] = [];
            let nextUrl: string | null = null;
            let page = 1;
            
            // Fetch all pages
            do {
                const params = new URLSearchParams();
                params.set('page', page.toString());
                params.set('page_size', '100');
                
                const res = await questionnaireApi.getFeed(params);
                const data = res.data;
                
                const pageQuestionnaires = Array.isArray(data) ? data : data.results || [];
                allQuestionnaires = [...allQuestionnaires, ...pageQuestionnaires];
                
                nextUrl = data.next || null;
                page++;
                
                if (page > 100) break;
            } while (nextUrl);
            
            // Count available questionnaires: not expired, not completed, not started
            const now = new Date();
            const available = allQuestionnaires.filter((q: any) => {
                const expirationDate = new Date(q.expiration_date);
                return expirationDate >= now && !q.is_completed && !q.is_started;
            });
            
            setUnfinishedCount(available.length);
        } catch (err) {
            console.error('Failed to load unfinished questionnaires count:', err);
        }
    };

    const loadFeed = useCallback(async (pageNum: number, append: boolean = false) => {
        try {
            if (append) {
                setLoadingMore(true);
            } else {
                setError(null);
                setLoading(true);
            }
            
            const res = await fetchYouthFeed(pageNum);
            
            // Handle pagination response structure
            const newItems = res.data.results || res.data;
            
            // DEBUG: Log feed items
            console.log('[FEED DEBUG] Feed response:', res.data);
            console.log('[FEED DEBUG] New items count:', newItems.length);
            const questionnaireItems = newItems.filter((item: any) => item.feed_type === 'QUESTIONNAIRE');
            console.log('[FEED DEBUG] Questionnaire items:', questionnaireItems);
            console.log('[FEED DEBUG] All feed types:', newItems.map((item: any) => item.feed_type));
            
            if (append) {
                setFeedItems(prev => [...prev, ...newItems]);
            } else {
                setFeedItems(newItems);
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

    const handleQuestionnaireComplete = useCallback(() => {
        // Reload feed and unfinished count when a questionnaire is completed
        loadFeed(1, false);
        loadUnfinishedCount();
    }, [loadFeed]);

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

    // Handle sidebar sticky behavior - stick when navbar reaches Dashboard text, unstick when scrolling back up
    useEffect(() => {
        // Store initial sidebar position on mount
        if (sidebarRef.current && sidebarInitialTopRef.current === null) {
            const rect = sidebarRef.current.getBoundingClientRect();
            sidebarInitialTopRef.current = rect.top + window.scrollY;
        }
        
        const handleScroll = () => {
            if (!sidebarRef.current || sidebarInitialTopRef.current === null) return;
            
            const scrollY = window.scrollY;
            const initialTop = sidebarInitialTopRef.current;
            const navbarHeight = 56;
            
            // Should stick when: scrolled past the point where sidebar top would be at navbar height
            // Should unstick when: scrolled back up before that point
            const threshold = initialTop - navbarHeight;
            const shouldStick = scrollY >= threshold;
            
            setIsSidebarSticky(shouldStick);
        };
        
        handleScroll();
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isSidebarSticky]);

    return (
        <div className="min-h-screen bg-black">
            <NavBar onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
            
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}
            
            <div className="pt-16">
                <div className="max-w-7xl mx-auto px-6 sm:px-4 py-6 md:py-8">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Sidebar spacer - only visible when sticky to maintain layout */}
                        {isSidebarSticky && <div className="hidden md:block w-64 flex-shrink-0"></div>}
                        {/* Sidebar (Navigation) - Dark Theme with brand colors */}
                        <aside 
                            ref={sidebarRef} 
                            className={`fixed top-0 left-0 h-screen w-64 flex-shrink-0 md:self-start md:max-h-[calc(100vh-56px)] overflow-y-auto md:pb-4 md:pl-0 md:pt-0 z-50 bg-black md:bg-transparent transform transition-transform duration-300 ease-in-out ${
                                isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                            } ${
                                isSidebarSticky 
                                    ? 'md:fixed md:top-[56px] md:left-[calc((100vw-min(1280px,100vw))/2+1rem)] md:z-10' 
                                    : 'md:relative'
                            }`}
                        >
                            {/* Close button for mobile */}
                            <div className="md:hidden flex items-center justify-between p-4 border-b border-[#262626] sticky top-0 bg-black z-10">
                                <h1 className="text-xl font-bold text-[#6D6DD4]">Menu</h1>
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-[#121212] hover:text-[#6D6DD4] transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="p-4 md:p-0 pb-20 md:pb-0">
                                {/* Header */}
                                <div className="mb-6 hidden md:block md:pl-4">
                                    <h1 className="text-2xl font-bold text-[#6D6DD4] mb-1">Dashboard</h1>
                                    <p className="text-sm text-gray-400">Your space to explore</p>
                                </div>

                                {/* Navigation Menu */}
                                <div className="space-y-2 md:pl-4">
                    {/* Your Feed - Start */}
                    <button
                        onClick={() => {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            setIsSidebarOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 bg-[#4D4DA4] text-white shadow-lg shadow-[#4D4DA4]/20 hover:bg-[#5D5DB4] hover:shadow-[#5D5DB4]/30 flex items-center gap-3"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                        </svg>
                        <span>Your Feed</span>
                    </button>
                    
                    {/* Scan to Check In */}
                    <button
                        onClick={() => {
                            router.push('/dashboard/youth/scan');
                            setIsSidebarOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-[#6D6DD4] bg-[#050505] hover:bg-[#0a0a0a] border border-[#262626] hover:border-[#4D4DA4]/40 flex items-center gap-3 group"
                    >
                        <svg className="w-5 h-5 text-[#6D6DD4]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 13h6v-6h-6v6zm1.5-1.5h3v3h-3v-3z"/>
                        </svg>
                        <span>Scan to Check In</span>
                    </button>
                    
                    {/* Borrow Items */}
                    <button
                        onClick={() => {
                            router.push('/dashboard/youth/inventory');
                            setIsSidebarOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-200 bg-[#050505] hover:bg-[#0a0a0a] border border-[#262626] hover:border-[#4D4DA4]/40 flex items-center gap-3 group"
                    >
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-[#6D6DD4]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
                        </svg>
                        <span>Borrow Items</span>
                    </button>
                    
                    {/* Bookings */}
                    <button
                        onClick={() => {
                            router.push('/dashboard/youth/bookings');
                            setIsSidebarOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-200 bg-[#050505] hover:bg-[#0a0a0a] border border-[#262626] hover:border-[#4D4DA4]/40 flex items-center gap-3 group"
                    >
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-[#6D6DD4]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
                        </svg>
                        <span>Bookings</span>
                    </button>
                    
                    {/* Questionnaires */}
                    <button
                        onClick={() => {
                            router.push('/dashboard/youth/questionnaires');
                            setIsSidebarOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-200 bg-[#050505] hover:bg-[#0a0a0a] border border-[#262626] hover:border-[#4D4DA4]/40 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-[#6D6DD4]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                            </svg>
                            <span>Questionnaires</span>
                        </div>
                        {unfinishedCount > 0 && (
                            <span className="bg-[#FF5485] text-white text-xs font-bold px-2 py-1 rounded-full min-w-[22px] text-center shadow-lg shadow-[#FF5485]/30">
                                {unfinishedCount}
                            </span>
                        )}
                    </button>
                    
                    {/* My Groups */}
                    <button
                        onClick={() => {
                            router.push('/dashboard/youth/profile?tab=clubs');
                            setIsSidebarOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-200 bg-[#050505] hover:bg-[#0a0a0a] border border-[#262626] hover:border-[#4D4DA4]/40 flex items-center gap-3 group"
                    >
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-[#6D6DD4]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                        </svg>
                        <span>My Groups</span>
                    </button>
                    
                    {/* My Club */}
                    {user?.preferred_club?.id ? (
                        <button
                            onClick={() => {
                                router.push(`/dashboard/youth/club/${user.preferred_club.id}`);
                                setIsSidebarOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-200 bg-[#050505] hover:bg-[#0a0a0a] border border-[#262626] hover:border-[#4D4DA4]/40 flex items-center gap-3 group"
                        >
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-[#6D6DD4]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                            <span>My Club</span>
                        </button>
                    ) : (
                        <button
                            disabled
                            className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-gray-500 bg-[#050505] border border-[#262626] cursor-not-allowed flex items-center gap-3"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                            <span>My Club</span>
                        </button>
                    )}
                    
                    {/* News */}
                    <button
                        onClick={() => {
                            router.push('/dashboard/youth/news');
                            setIsSidebarOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-200 bg-[#050505] hover:bg-[#0a0a0a] border border-[#262626] hover:border-[#4D4DA4]/40 flex items-center gap-3 group"
                    >
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-[#6D6DD4]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                        </svg>
                        <span>News</span>
                    </button>
                    
                    {/* Events */}
                    <button
                        onClick={() => {
                            router.push('/dashboard/youth/events');
                            setIsSidebarOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-200 bg-[#050505] hover:bg-[#0a0a0a] border border-[#262626] hover:border-[#4D4DA4]/40 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-[#6D6DD4]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17 10H7v2h10v-2zm2-7h-3V1h-2v2H8V1H6v2H3c-1.11 0-1.99.9-1.99 2L1 19c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V8h16v11zm-5-9H7v2h7v-2z"/>
                            </svg>
                            <span>Events</span>
                        </div>
                        <span className="bg-[#FF5485] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg shadow-[#FF5485]/30">
                            6
                        </span>
                    </button>
                                </div>
                            </div>
                        </aside>

                        {/* Main Feed */}
                        <main className="flex-1 min-w-0">
                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-[#4D4DA4] to-[#FF5485] rounded-2xl p-6 text-white shadow-xl shadow-[#4D4DA4]/30 mb-8">
                    <h1 className="text-2xl font-bold mb-2">Welcome back! 👋</h1>
                    <p className="opacity-90">Here is what's happening in your club today.</p>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading your feed...</div>
                ) : error ? (
                    <div className="text-center py-10 bg-[#121212] rounded-xl border border-[#262626]">
                        <p className="text-[#FF5485] font-medium">{error}</p>
                    </div>
                ) : feedItems.length === 0 ? (
                    <div className="text-center py-10 bg-[#121212] rounded-xl border border-dashed border-[#262626]">
                        <p className="text-gray-400">No posts yet. Join some groups to see more!</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {feedItems.map((item, index) => {
                            let postContent;
                            
                            // Use a unique key combining feed_type and id to avoid duplicates
                            const uniqueKey = `${item.feed_type}-${item.id}-${index}`;
                            
                            if (item.feed_type === 'REWARD') {
                                // RENDER REWARD CARD
                                postContent = (
                                    <div className="bg-gradient-to-r from-[#4D4DA4] to-[#FF5485] rounded-xl shadow-xl shadow-[#4D4DA4]/20 p-6 text-white relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-white/20 px-3 py-1 rounded-bl-lg text-xs font-bold">
                                            NEW REWARD
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="h-16 w-16 bg-white/20 rounded-lg flex items-center justify-center text-3xl">
                                                🎁
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold">{item.title}</h3>
                                                <p className="text-white/90 text-sm mt-1">{item.description}</p>
                                                {item.sponsor && (
                                                    <p className="text-xs text-white/70 mt-2">Sponsored by: {item.sponsor}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => router.push('/dashboard/youth/profile?tab=wallet')}
                                            className="mt-4 w-full bg-white text-[#4D4DA4] font-bold py-2 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            Claim in Wallet
                                        </button>
                                    </div>
                                );
                            } else if (item.feed_type === 'QUESTIONNAIRE') {
                                // RENDER QUESTIONNAIRE CARD (with inline answering)
                                postContent = (
                                    <QuestionnaireCard 
                                        questionnaire={item}
                                        onComplete={handleQuestionnaireComplete}
                                    />
                                );
                            } else if (item.feed_type === 'EVENT') {
                                // RENDER EVENT CARD
                                postContent = (
                                    <EventCard event={item as any} />
                                );
                            } else {
                                // RENDER STANDARD POST CARD
                                postContent = <PostCard post={item as any} />;
                            }

                            return (
                                <div key={uniqueKey}>
                                    {postContent}
                                    
                                    {/* Show Recommended Clubs after the first item */}
                                    {index === 0 && (
                                        <div className="mt-8">
                                            <RecommendedClubs />
                                        </div>
                                    )}
                                    
                                    {/* Show Recommended Groups after the 4th item */}
                                    {index === 3 && <RecommendedGroups />}
                                </div>
                            );
                        })}
                        
                        {/* Fallback: If total items < 4, show RecommendedGroups at the very end */}
                        {feedItems.length < 4 && feedItems.length > 0 && (
                            <RecommendedGroups />
                        )}
                        
                        {/* Loading More Indicator */}
                        <div ref={observerTarget} className="h-10 flex items-center justify-center">
                            {loadingMore && (
                                <div className="flex items-center gap-2 text-gray-400">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#4D4DA4]"></div>
                                    <span className="text-sm">Loading more...</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                        </main>

                        {/* Right Sidebar (Trending/Events) */}
                        <aside className="lg:w-1/4 hidden lg:block flex-shrink-0">
                            <div className="sticky top-[56px] self-start max-h-[calc(100vh-56px)] overflow-y-auto">
                                {/* Preferred Club Card */}
                                <PreferredClubCard club={user?.preferred_club || null} />
                                
                                {/* Placeholders for upcoming features */}
                                <div className="bg-[#050505] rounded-xl shadow-lg border border-[#262626] p-6 mb-6">
                                    <h3 className="font-bold text-gray-200 mb-4">Upcoming Events</h3>
                                    <p className="text-sm text-gray-400">No events scheduled.</p>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
}