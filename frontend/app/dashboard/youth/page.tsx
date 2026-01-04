'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { fetchYouthFeed } from '../../../lib/api';
import api from '../../../lib/api';
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
import { X, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { 
    DashboardFeedSkeleton, 
    WelcomeBannerSkeleton, 
    ClubCardSkeleton, 
    SidebarCardSkeleton 
} from '../../components/ui/Skeleton';
import Footer from '@/app/components/Footer';
import Link from 'next/link';
import { getMediaUrl } from '@/app/utils';
import TrialBanner from '../../components/TrialBanner';

// Define interface for the mixed feed items
interface FeedItem {
    id: any;
    feed_type: 'POST' | 'REWARD' | 'QUESTIONNAIRE' | 'EVENT';
    [key: string]: any; // Allow other props
}

export default function YouthDashboard() {
    const t = useTranslations('dashboard');
    const tEvents = useTranslations('events');
    const tErrors = useTranslations('errors');
    const locale = useLocale();
    const dateLocale = locale === 'sv' ? sv : enUS;
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [minLoadingComplete, setMinLoadingComplete] = useState(false);
    const [nextEvent, setNextEvent] = useState<any>(null);
    
    // Minimum skeleton display time (in ms) for better UX
    const MIN_LOADING_TIME = 400;
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [unfinishedCount, setUnfinishedCount] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);
    const pageRef = useRef(1);
    const hasMoreRef = useRef(true);
    const loadingMoreRef = useRef(false);
    const loadingRef = useRef(false);
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    
    // Avoid hydration mismatch for theme
    useEffect(() => {
        setMounted(true);
    }, []);
    
    const darkMode = !mounted || theme === 'dark';

    const loadFeed = useCallback(async (pageNum: number, append: boolean = false) => {
        try {
            if (append) {
                setLoadingMore(true);
                loadingMoreRef.current = true;
            } else {
                setError(null);
                setLoading(true);
                loadingRef.current = true;
            }
            
            const res = await fetchYouthFeed(pageNum);
            
            // Handle pagination response structure
            const newItems = res.data.results || res.data;
            
            // DEBUG: Log feed items
            console.log('[FEED DEBUG] Feed response:', res.data);
            console.log('[FEED DEBUG] New items count:', newItems.length);
            console.log('[FEED DEBUG] Has next page:', !!res.data.next);
            const questionnaireItems = newItems.filter((item: any) => item.feed_type === 'QUESTIONNAIRE');
            console.log('[FEED DEBUG] Questionnaire items:', questionnaireItems);
            console.log('[FEED DEBUG] All feed types:', newItems.map((item: any) => item.feed_type));
            
            if (append) {
                setFeedItems(prev => [...prev, ...newItems]);
            } else {
                setFeedItems(newItems);
            }
            
            // Check if there are more pages
            const hasNext = !!res.data.next;
            setHasMore(hasNext);
            hasMoreRef.current = hasNext;
        } catch (err: any) {
            console.error('Failed to load feed:', err);
            if (err?.response?.status === 401) {
                // Unauthorized - redirect to login
                Cookies.remove('access_token');
                Cookies.remove('refresh_token');
                setError(tErrors('sessionExpired'));
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            } else {
                setError(tErrors('serverError'));
            }
            setHasMore(false);
            hasMoreRef.current = false;
        } finally {
            setLoading(false);
            setLoadingMore(false);
            loadingRef.current = false;
            loadingMoreRef.current = false;
        }
    }, [router, tErrors]);

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

    const loadNextEvent = async () => {
        try {
            // Fetch user's event registrations (the API filters by user automatically for YOUTH_MEMBER)
            const res = await api.get('/registrations/?page_size=100');
            const registrations = res.data.results || res.data;
            
            // Filter for approved registrations with future events
            const now = new Date();
            const upcomingRegistrations = registrations
                .filter((reg: any) => {
                    // Only show APPROVED registrations (user has a confirmed spot)
                    if (reg.status !== 'APPROVED') return false;
                    
                    // Only show future events
                    const eventStartDate = reg.event_detail?.start_date || reg.event?.start_date;
                    if (!eventStartDate) return false;
                    
                    const eventDate = new Date(eventStartDate);
                    return eventDate > now;
                })
                .sort((a: any, b: any) => {
                    // Sort by event start date, earliest first
                    const dateA = new Date(a.event_detail?.start_date || a.event?.start_date);
                    const dateB = new Date(b.event_detail?.start_date || b.event?.start_date);
                    return dateA.getTime() - dateB.getTime();
                });
            
            // Get the next upcoming event
            if (upcomingRegistrations.length > 0) {
                const nextReg = upcomingRegistrations[0];
                setNextEvent(nextReg.event_detail || nextReg.event);
            } else {
                setNextEvent(null);
            }
        } catch (err) {
            console.error('Failed to load next event:', err);
            setNextEvent(null);
        }
    };

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
        
        pageRef.current = 1;
        hasMoreRef.current = true;
        setPage(1);
        setHasMore(true);
        loadFeed(1, false);
        loadUnfinishedCount();
        loadNextEvent();
        
        return () => clearTimeout(minLoadingTimer);
    }, [user, router, loadFeed]);

    const handleQuestionnaireComplete = useCallback(() => {
        // Reload feed and unfinished count when a questionnaire is completed
        loadFeed(1, false);
        loadUnfinishedCount();
    }, [loadFeed]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        // Update refs when state changes
        pageRef.current = page;
        hasMoreRef.current = hasMore;
        loadingMoreRef.current = loadingMore;
        loadingRef.current = loading;
    }, [page, hasMore, loadingMore, loading]);

    useEffect(() => {
        // Only set up observer if we have feed items and potentially more to load
        if (feedItems.length === 0 || !hasMore) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const target = entries[0];
                if (target.isIntersecting) {
                    console.log('[SCROLL DEBUG] Observer triggered:', {
                        hasMore: hasMoreRef.current,
                        loadingMore: loadingMoreRef.current,
                        loading: loadingRef.current,
                        currentPage: pageRef.current
                    });
                    
                    if (hasMoreRef.current && !loadingMoreRef.current && !loadingRef.current) {
                        const nextPage = pageRef.current + 1;
                        console.log('[SCROLL DEBUG] Loading page:', nextPage);
                        pageRef.current = nextPage;
                        setPage(nextPage);
                        loadFeed(nextPage, true);
                    }
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        // Use a small delay to ensure the DOM element is rendered
        const timeoutId = setTimeout(() => {
            const currentTarget = observerTarget.current;
            if (currentTarget) {
                console.log('[SCROLL DEBUG] Observing target element');
                observer.observe(currentTarget);
            } else {
                console.log('[SCROLL DEBUG] Observer target not found!');
            }
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            const currentTarget = observerTarget.current;
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [loadFeed, feedItems.length, hasMore]);


    return (
        <div className="min-h-screen flex flex-col bg-[var(--dark-900)]">
            <div className="flex-1">
            <NavBar onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} darkMode={darkMode} />
            
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
                    <h1 className="text-xl font-bold text-[var(--brand-primary)]">{t('menu')}</h1>
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
            <div className="md:pt-16">
                <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 relative">
                    {/* Desktop Sidebar - Fixed position aligned with container */}
                    <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
                        <YouthSidebar activePath={pathname} darkMode />
                    </aside>
                    
                    {/* Content wrapper with left margin for sidebar */}
                    <div className="md:ml-60 pt-2 sm:p-4 md:p-6 pb-24 md:pb-6">
                        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                                {/* Main Feed */}
                                <main className="flex-1 min-w-0 sm:px-0">
                                    {/* Welcome Banner - Using brand colors with gradient */}
                                    <div className={`relative rounded-none sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 overflow-hidden border-y sm:border sm:mx-0 ${
                                        darkMode 
                                            ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
                                            : 'bg-white border-[#4D4DA4]/15 shadow-sm'
                                    }`}>
                                        {/* Gradient accent line at top */}
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-purple)] to-[var(--brand-third)]" />
                                        {/* Subtle glow effect */}
                                        <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl ${
                                            darkMode ? 'bg-[var(--brand-primary)] opacity-10' : 'bg-[#4D4DA4] opacity-20'
                                        }`} />
                                        <div className={`absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-3xl ${
                                            darkMode ? 'bg-[var(--brand-purple)] opacity-10' : 'bg-[var(--brand-primary)] opacity-15'
                                        }`} />
                                                <h1 className={`text-2xl font-bold mb-2 relative z-10 ${
                                                    darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
                                                }`}>{t('welcomeBack')}</h1>
                                                        <p className={`relative z-10 ${
                                                            darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'
                                                        }`}>{t('whatsHappening')}</p>
                                                    </div>
                                                    
                                                    {/* Trial Period Banner - Show for unverified users in trial */}
                                                    {user?.trial_info?.is_in_trial && user.trial_info.trial_days_remaining !== null && (
                                                        <div className="px-4 sm:px-0 mb-6">
                                                            <TrialBanner 
                                                                daysRemaining={user.trial_info.trial_days_remaining}
                                                                clubName={user.trial_info.club_info?.name}
                                                            />
                                                        </div>
                                                    )}

                                                    {(loading || !minLoadingComplete) ? (
                                        <DashboardFeedSkeleton />
                                    ) : error ? (
                                        <div className={`text-center py-10 rounded-xl border ${
                                            darkMode 
                                                ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
                                                : 'bg-red-50 border-red-200'
                                        }`}>
                                            <p className="text-[var(--brand-red)] font-medium">{error}</p>
                                        </div>
                                    ) : feedItems.length === 0 ? (
                                        <div className={`text-center py-10 rounded-xl border border-dashed ${
                                            darkMode 
                                                ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
                                                : 'bg-[#EBEBFE]/50 border-[#4D4DA4]/30'
                                        }`}>
                                            <p className={darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}>{t('noPostsYet')}</p>
                                        </div>
                                    ) : (
                                        <div>
                                            {feedItems.map((item, index) => {
                            let postContent;
                            const isSpecialCard = item.feed_type === 'REWARD' || item.feed_type === 'QUESTIONNAIRE' || item.feed_type === 'EVENT';
                            
                            // Use a unique key combining feed_type and id to avoid duplicates
                            const uniqueKey = `${item.feed_type}-${item.id}-${index}`;
                            
                            if (item.feed_type === 'REWARD') {
                                // RENDER REWARD CARD - Theme responsive with brand accents
                                postContent = (
                                    <div className={`relative rounded-none sm:rounded-xl p-6 overflow-hidden border-y sm:border ${
                                        darkMode 
                                            ? 'bg-[var(--dark-600)] border-[var(--dark-400)]' 
                                            : 'bg-white border-[var(--brand-primary)]/15 shadow-sm'
                                    }`}>
                                        {/* Gradient accent */}
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--brand-third)] via-[var(--brand-primary)] to-[var(--brand-purple)]" />
                                        <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-xs font-bold ${
                                            darkMode 
                                                ? 'bg-[var(--brand-third)] text-[var(--dark-900)]' 
                                                : 'bg-[var(--brand-primary)] text-gray-900'
                                        }`}>
                                            {t('newReward')}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={`h-16 w-16 rounded-lg flex items-center justify-center text-3xl border ${
                                                darkMode 
                                                    ? 'bg-[var(--dark-500)] border-[var(--brand-third)]/30' 
                                                    : 'bg-white border-[var(--brand-primary)]/20 shadow-sm'
                                            }`}>
                                                🎁
                                            </div>
                                            <div>
                                                <h3 className={`text-xl font-bold ${
                                                    darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'
                                                }`}>{item.title}</h3>
                                                <p className={`text-sm mt-1 ${
                                                    darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'
                                                }`}>{item.description}</p>
                                                {item.sponsor && (
                                                    <p className={`text-xs mt-2 ${
                                                        darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                                                    }`}>{t('sponsoredBy')} {item.sponsor}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => router.push('/dashboard/youth/profile?tab=wallet')}
                                            className={`mt-4 w-full font-bold py-2 rounded-lg transition-colors ${
                                                darkMode 
                                                    ? 'bg-[var(--brand-primary)] text-[var(--dark-900)] hover:bg-[var(--brand-primary)]/80' 
                                                    : 'bg-[var(--brand-primary)] text-gray-900 hover:bg-[var(--brand-primary)]/90 shadow-lg shadow-[var(--brand-primary)]/20'
                                            }`}
                                        >
                                            {t('claimInWallet')}
                                        </button>
                                    </div>
                                );
                            } else if (item.feed_type === 'QUESTIONNAIRE') {
                                // RENDER QUESTIONNAIRE CARD (with inline answering)
                                postContent = (
                                    <QuestionnaireCard 
                                        questionnaire={item}
                                        onComplete={handleQuestionnaireComplete}
                                        darkMode={darkMode}
                                    />
                                );
                            } else if (item.feed_type === 'EVENT') {
                                // RENDER EVENT CARD
                                postContent = (
                                    <EventCard event={item as any} darkMode={darkMode} />
                                );
                            } else {
                                // RENDER STANDARD POST CARD
                                postContent = <PostCard post={item as any} darkMode={darkMode} />;
                            }

                            return (
                                <div key={uniqueKey} className={isSpecialCard ? 'my-6' : ''}>
                                    {postContent}
                                    
                                    {/* Show Recommended Clubs after the first item */}
                                    {index === 0 && (
                                        <div className="my-6">
                                            <RecommendedClubs darkMode={darkMode} />
                                        </div>
                                    )}
                                    
                                    {/* Show Recommended Groups after the 4th item */}
                                    {index === 3 && <div className="my-6"><RecommendedGroups darkMode={darkMode} /></div>}
                                </div>
                            );
                        })}
                                            
                                            {/* Fallback: If total items < 4, show RecommendedGroups at the very end */}
                                            {feedItems.length < 4 && feedItems.length > 0 && (
                                                <div className="my-6"><RecommendedGroups darkMode={darkMode} /></div>
                                            )}
                                            
                                            {/* Loading More Indicator / Observer Target */}
                                            <div ref={observerTarget} className="h-20 flex items-center justify-center py-4">
                                                {loadingMore && (
                                                    <div className="flex items-center gap-2 text-[var(--brand-light)]/50">
                                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--brand-primary)]"></div>
                                                        <span className="text-sm">{t('loadingMore')}</span>
                                                    </div>
                                                )}
                                                {!hasMore && feedItems.length > 0 && (
                                                    <p className="text-sm text-[var(--brand-light)]/40">{t('noMorePosts') || 'No more posts'}</p>
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
                                                <PreferredClubCard club={user?.preferred_club || null} darkMode={darkMode} />
                                                
                                                {/* Next Upcoming Event - Only show if user has a confirmed event */}
                                                {nextEvent && (
                                                    <Link 
                                                        href={`/dashboard/youth/events/${nextEvent.id}`}
                                                        className={`block rounded-xl overflow-hidden transition-all group ${
                                                            darkMode 
                                                                ? 'bg-[var(--dark-700)] border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50' 
                                                                : 'bg-white border border-[#4D4DA4]/15 hover:border-[#4D4DA4]/40 shadow-sm'
                                                        }`}
                                                    >
                                                        {/* Event Image */}
                                                        {nextEvent.cover_image && (
                                                            <div className="relative h-24 overflow-hidden">
                                                                <img 
                                                                    src={getMediaUrl(nextEvent.cover_image) || ''} 
                                                                    alt={nextEvent.title}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                />
                                                                <div className={`absolute inset-0 bg-gradient-to-t ${
                                                                    darkMode ? 'from-[var(--dark-700)]' : 'from-white'
                                                                } to-transparent`} />
                                                            </div>
                                                        )}
                                                        
                                                        <div className="p-4">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h3 className={`font-bold text-sm ${
                                                                    darkMode ? 'text-[var(--brand-light)]' : 'text-[#4D4DA4]'
                                                                }`}>{t('upcomingEvents')}</h3>
                                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                                    darkMode 
                                                                        ? 'bg-[var(--brand-green)]/20 text-[var(--brand-green)]' 
                                                                        : 'bg-emerald-100 text-emerald-600'
                                                                }`}>
                                                                    {tEvents('goingStatus')}
                                                                </span>
                                                            </div>
                                                            
                                                            <h4 className={`font-bold line-clamp-2 mb-2 transition-colors ${
                                                                darkMode 
                                                                    ? 'text-[var(--brand-light)] group-hover:text-[var(--brand-primary)]' 
                                                                    : 'text-gray-800 group-hover:text-[#4D4DA4]'
                                                            }`}>
                                                                {nextEvent.title}
                                                            </h4>
                                                            
                                                            <div className={`space-y-1.5 text-xs ${
                                                                darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                                                            }`}>
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar className={`w-3.5 h-3.5 ${
                                                                        darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
                                                                    }`} />
                                                                    <span>
                                                                        {format(new Date(nextEvent.start_date), 'EEE, d MMM HH:mm', { locale: dateLocale })}
                                                                    </span>
                                                                </div>
                                                                {nextEvent.location_name && (
                                                                    <div className="flex items-center gap-2">
                                                                        <MapPin className={`w-3.5 h-3.5 ${
                                                                            darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
                                                                        }`} />
                                                                        <span className="line-clamp-1">{nextEvent.location_name}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            <div className={`flex items-center justify-end mt-3 text-xs font-medium group-hover:gap-2 transition-all ${
                                                                darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
                                                            }`}>
                                                                <span>{tEvents('viewDetails')}</span>
                                                                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        </div>
                                                    </Link>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </aside>
                            </div>
                    </div>
                </div>
            </div>
            </div>
            
            {/* Footer */}
            <Footer />
        </div>
    );
}