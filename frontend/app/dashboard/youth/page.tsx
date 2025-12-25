'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchYouthFeed } from '../../../lib/api';
import PostCard from '../../components/posts/PostCard';
import QuestionnaireCard from '../../components/questionnaires/QuestionnaireCard';
import EventCard from '../../components/events/youth/EventCard';
import { useAuth } from '../../../context/AuthContext';
import Cookies from 'js-cookie';
import NavBar from '../../components/NavBar';
import YouthSidebar from '../../components/youth/YouthSidebar';
import RecommendedClubs from '../../components/RecommendedClubs';
import RecommendedGroups from '../../components/RecommendedGroups';
import PreferredClubCard from '../../components/PreferredClubCard';
import { questionnaireApi } from '../../../lib/questionnaire-api';
import { X } from 'lucide-react';
import { 
    DashboardFeedSkeleton, 
    WelcomeBannerSkeleton, 
    ClubCardSkeleton, 
    SidebarCardSkeleton 
} from '../../components/ui/Skeleton';
import YouthFooter from '../../components/youth/YouthFooter';

// Define interface for the mixed feed items
interface FeedItem {
    id: any;
    feed_type: 'POST' | 'REWARD' | 'QUESTIONNAIRE' | 'EVENT';
    [key: string]: any; // Allow other props
}

export default function YouthDashboard() {
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [minLoadingComplete, setMinLoadingComplete] = useState(false);
    
    // Minimum skeleton display time (in ms) for better UX
    const MIN_LOADING_TIME = 400;
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [unfinishedCount, setUnfinishedCount] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();
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
        
        // Start minimum loading timer
        const minLoadingTimer = setTimeout(() => {
            setMinLoadingComplete(true);
        }, MIN_LOADING_TIME);
        
        loadFeed(1, false);
        loadUnfinishedCount();
        
        return () => clearTimeout(minLoadingTimer);
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


    return (
        <div className="min-h-screen bg-[var(--dark-900)]">
            <NavBar onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} darkMode />
            
            {/* Mobile Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-black/70 z-40 md:hidden transition-opacity duration-300 ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsSidebarOpen(false)}
            />
            
            {/* Mobile Sidebar */}
            <aside 
                className={`fixed top-0 left-0 h-screen w-64 z-50 bg-[var(--dark-800)] transform transition-transform duration-300 md:hidden ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between h-14 sm:h-16 px-4 border-b border-[var(--dark-500)]">
                    <h1 className="text-xl font-bold text-[var(--brand-primary)]">Menu</h1>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]">
                    <YouthSidebar activePath={pathname} darkMode />
                </div>
            </aside>
            
            {/* Main Layout */}
            <div className="">
                <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 relative">
                    {/* Desktop Sidebar - Fixed position aligned with container */}
                    <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 bg-[var(--dark-900)] z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
                        <YouthSidebar activePath={pathname} darkMode />
                    </aside>
                    
                    {/* Content wrapper with left margin for sidebar */}
                    <div className="md:ml-60 pt-2 sm:p-4 md:p-6 pb-24 md:pb-6">
                        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                                {/* Main Feed */}
                                <main className="flex-1 min-w-0 sm:px-0">
                                    {/* Welcome Banner - Using brand colors with gradient */}
                                    <div className="relative bg-[var(--dark-700)] rounded-none sm:rounded-2xl p-4 sm:p-6 text-white mb-6 sm:mb-8 overflow-hidden border-y sm:border border-[var(--dark-500)] sm:mx-0">
                                        {/* Gradient accent line at top */}
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-purple)] to-[var(--brand-third)]" />
                                        {/* Subtle glow effect */}
                                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[var(--brand-primary)] opacity-10 rounded-full blur-3xl" />
                                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[var(--brand-purple)] opacity-10 rounded-full blur-3xl" />
                                        <h1 className="text-2xl font-bold mb-2 text-[var(--brand-light)] relative z-10">Welcome back! 👋</h1>
                                        <p className="text-[var(--brand-light)]/70 relative z-10">Here is what's happening in your club today.</p>
                                    </div>

                                    {(loading || !minLoadingComplete) ? (
                                        <DashboardFeedSkeleton />
                                    ) : error ? (
                                        <div className="text-center py-10 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
                                            <p className="text-[var(--brand-red)] font-medium">{error}</p>
                                        </div>
                                    ) : feedItems.length === 0 ? (
                                        <div className="text-center py-10 bg-[var(--dark-700)] rounded-xl border border-dashed border-[var(--dark-500)]">
                                            <p className="text-[var(--brand-light)]/60">No posts yet. Join some groups to see more!</p>
                                        </div>
                                    ) : (
                                        <div>
                                            {feedItems.map((item, index) => {
                            let postContent;
                            const isSpecialCard = item.feed_type === 'REWARD' || item.feed_type === 'QUESTIONNAIRE' || item.feed_type === 'EVENT';
                            
                            // Use a unique key combining feed_type and id to avoid duplicates
                            const uniqueKey = `${item.feed_type}-${item.id}-${index}`;
                            
                            if (item.feed_type === 'REWARD') {
                                // RENDER REWARD CARD - Dark themed with brand accents
                                postContent = (
                                    <div className="relative bg-[var(--dark-600)] rounded-none sm:rounded-xl p-6 text-white overflow-hidden border-y sm:border border-[var(--dark-400)]">
                                        {/* Gradient accent */}
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--brand-third)] via-[var(--brand-primary)] to-[var(--brand-purple)]" />
                                        <div className="absolute top-0 right-0 bg-[var(--brand-third)] text-[var(--dark-900)] px-3 py-1 rounded-bl-lg text-xs font-bold">
                                            NEW REWARD
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="h-16 w-16 bg-[var(--dark-500)] rounded-lg flex items-center justify-center text-3xl border border-[var(--brand-third)]/30">
                                                🎁
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-[var(--brand-light)]">{item.title}</h3>
                                                <p className="text-[var(--brand-light)]/70 text-sm mt-1">{item.description}</p>
                                                {item.sponsor && (
                                                    <p className="text-xs text-[var(--brand-light)]/50 mt-2">Sponsored by: {item.sponsor}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => router.push('/dashboard/youth/profile?tab=wallet')}
                                            className="mt-4 w-full bg-[var(--brand-primary)] text-[var(--dark-900)] font-bold py-2 rounded-lg hover:bg-[var(--brand-primary)]/80 transition-colors"
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
                                        darkMode
                                    />
                                );
                            } else if (item.feed_type === 'EVENT') {
                                // RENDER EVENT CARD
                                postContent = (
                                    <EventCard event={item as any} darkMode />
                                );
                            } else {
                                // RENDER STANDARD POST CARD
                                postContent = <PostCard post={item as any} darkMode />;
                            }

                            return (
                                <div key={uniqueKey} className={isSpecialCard ? 'my-6' : ''}>
                                    {postContent}
                                    
                                    {/* Show Recommended Clubs after the first item */}
                                    {index === 0 && (
                                        <div className="my-6">
                                            <RecommendedClubs darkMode />
                                        </div>
                                    )}
                                    
                                    {/* Show Recommended Groups after the 4th item */}
                                    {index === 3 && <div className="my-6"><RecommendedGroups darkMode /></div>}
                                </div>
                            );
                        })}
                                            
                                            {/* Fallback: If total items < 4, show RecommendedGroups at the very end */}
                                            {feedItems.length < 4 && feedItems.length > 0 && (
                                                <div className="my-6"><RecommendedGroups darkMode /></div>
                                            )}
                                            
                                            {/* Loading More Indicator */}
                                            <div ref={observerTarget} className="h-10 flex items-center justify-center">
                                                {loadingMore && (
                                                    <div className="flex items-center gap-2 text-[var(--brand-light)]/50">
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--brand-primary)]"></div>
                                                        <span className="text-sm">Loading more...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </main>
                                
                                {/* Right Sidebar (Trending/Events) */}
                                <aside className="lg:w-1/4 hidden lg:block flex-shrink-0">
                                    <div className="sticky top-[72px] space-y-6">
                                        {(loading || !minLoadingComplete) ? (
                                            <>
                                                <ClubCardSkeleton />
                                                <SidebarCardSkeleton />
                                            </>
                                        ) : (
                                            <>
                                                {/* Preferred Club Card */}
                                                <PreferredClubCard club={user?.preferred_club || null} darkMode />
                                                
                                                {/* Placeholders for upcoming features */}
                                                <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] p-6">
                                                    <h3 className="font-bold text-[var(--brand-light)] mb-4">Upcoming Events</h3>
                                                    <p className="text-sm text-[var(--brand-light)]/60">No events scheduled.</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </aside>
                            </div>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <YouthFooter />
        </div>
    );
}