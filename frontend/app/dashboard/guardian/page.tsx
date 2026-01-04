'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useTheme } from 'next-themes';
import { format } from 'date-fns';
import { enUS, sv } from 'date-fns/locale';
import api from '../../../lib/api';
import PostCard from '../../components/posts/PostCard';
import QuestionnaireCard from '../../components/questionnaires/QuestionnaireCard';
import EventCard from '../../components/events/youth/EventCard';
import { useAuth } from '../../../context/AuthContext';
import Cookies from 'js-cookie';
import GuardianSidebar from '../../components/guardian/GuardianSidebar';
import GuardianNavBar from '../../components/guardian/GuardianNavBar';
import { questionnaireApi } from '../../../lib/questionnaire-api';
import { Calendar, User, X, Users, MapPin, ArrowRight } from 'lucide-react';
import { getMediaUrl } from '../../utils';
import Link from 'next/link';
import Footer from '@/app/components/Footer';
import { 
    DashboardFeedSkeleton, 
    ClubCardSkeleton, 
    SidebarCardSkeleton 
} from '../../components/ui/Skeleton';

// Define interface for the mixed feed items
interface FeedItem {
    id: any;
    feed_type: 'POST' | 'QUESTIONNAIRE' | 'EVENT';
    [key: string]: any;
}

// Fetch guardian-specific feed (posts from children's clubs, excluding rewards)
async function fetchGuardianFeed(page: number = 1) {
    return api.get(`/posts/feed/?page=${page}`);
}

export default function GuardianDashboardPage() {
    const t = useTranslations('dashboard');
    const tEvents = useTranslations('events');
    const tErrors = useTranslations('errors');
    const locale = useLocale();
    const dateLocale = locale === 'sv' ? sv : enUS;
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [minLoadingComplete, setMinLoadingComplete] = useState(false);
    const [nextEvent, setNextEvent] = useState<any>(null);
    
    // Avoid hydration mismatch for theme
    useEffect(() => {
        setMounted(true);
    }, []);
    
    const darkMode = !mounted || theme === 'dark';
    
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
            
            const res = await fetchGuardianFeed(pageNum);
            const newItems = res.data.results || res.data;
            
            // Filter out REWARD items for guardians
            const filteredItems = newItems.filter((item: FeedItem) => item.feed_type !== 'REWARD');
            
            if (append) {
                setFeedItems(prev => [...prev, ...filteredItems]);
            } else {
                setFeedItems(filteredItems);
            }
            
            const hasNext = !!res.data.next;
            setHasMore(hasNext);
            hasMoreRef.current = hasNext;
        } catch (err: any) {
            console.error('Failed to load feed:', err);
            if (err?.response?.status === 401) {
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
            let pageNum = 1;
            
            do {
                const params = new URLSearchParams();
                params.set('page', pageNum.toString());
                params.set('page_size', '100');
                
                const res = await questionnaireApi.getFeed(params);
                const data = res.data;
                
                const pageQuestionnaires = Array.isArray(data) ? data : data.results || [];
                allQuestionnaires = [...allQuestionnaires, ...pageQuestionnaires];
                
                nextUrl = data.next || null;
                pageNum++;
                
                if (pageNum > 100) break;
            } while (nextUrl);
            
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

    const loadNextEvent = useCallback(async () => {
        try {
            // Fetch all registrations for guardian's children
            const res = await api.get('/registrations/?page_size=1000');
            const registrations = res.data.results || res.data;

            const now = new Date();
            
            // Filter for APPROVED registrations with future events
            const upcomingApprovedRegistrations = registrations
                .filter((reg: any) => {
                    if (reg.status !== 'APPROVED') return false;
                    const eventDate = new Date(reg.event_detail?.start_date || reg.event?.start_date);
                    return eventDate > now;
                })
                .sort((a: any, b: any) => {
                    const dateA = new Date(a.event_detail?.start_date || a.event?.start_date);
                    const dateB = new Date(b.event_detail?.start_date || b.event?.start_date);
                    return dateA.getTime() - dateB.getTime();
                });

            if (upcomingApprovedRegistrations.length > 0) {
                const nextReg = upcomingApprovedRegistrations[0];
                // Include the child's name for display
                setNextEvent({
                    ...nextReg.event_detail,
                    child_name: nextReg.user_detail?.first_name || nextReg.user?.first_name || ''
                });
            } else {
                setNextEvent(null);
            }
        } catch (e) {
            console.error("Failed to load next event", e);
            setNextEvent(null);
        }
    }, []);

    useEffect(() => {
        const token = Cookies.get('access_token');
        if (!token) {
            router.push('/login');
            return;
        }
        
        if (user && user.role !== 'GUARDIAN') {
            router.push('/login');
            return;
        }
        
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
    }, [user, router, loadFeed, loadNextEvent]);

    const handleQuestionnaireComplete = useCallback(() => {
        loadFeed(1, false);
        loadUnfinishedCount();
    }, [loadFeed]);

    useEffect(() => {
        pageRef.current = page;
        hasMoreRef.current = hasMore;
        loadingMoreRef.current = loadingMore;
        loadingRef.current = loading;
    }, [page, hasMore, loadingMore, loading]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        if (feedItems.length === 0 || !hasMore) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const target = entries[0];
                if (target.isIntersecting) {
                    if (hasMoreRef.current && !loadingMoreRef.current && !loadingRef.current) {
                        const nextPage = pageRef.current + 1;
                        pageRef.current = nextPage;
                        setPage(nextPage);
                        loadFeed(nextPage, true);
                    }
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        const timeoutId = setTimeout(() => {
            const currentTarget = observerTarget.current;
            if (currentTarget) {
                observer.observe(currentTarget);
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

    if (!user) return null;

    return (
        <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-[var(--dark-900)]' : 'bg-[#F8F7FE]'}`}>
            <div className="flex-1">
            <GuardianNavBar onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
            
            {/* Mobile Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-black/70 z-40 md:hidden transition-opacity duration-300 ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsSidebarOpen(false)}
            />
            
            {/* Mobile Sidebar */}
            <aside 
                className={`fixed top-0 left-0 h-screen w-64 z-50 transform transition-transform duration-300 md:hidden ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } ${darkMode ? 'bg-[var(--dark-800)]' : 'bg-white'}`}
            >
                <div className={`flex items-center justify-between h-14 sm:h-16 px-4 border-b ${
                    darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/10'
                }`}>
                    <h1 className="text-xl font-bold text-[var(--brand-primary)]">{t('menu')}</h1>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl ${
                            darkMode ? 'text-[var(--brand-light)] hover:bg-[var(--dark-600)]' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]">
                    <GuardianSidebar unfinishedCount={unfinishedCount} />
                </div>
            </aside>
            
            {/* Main Layout */}
            <div className="pt-14 sm:pt-16">
                <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 relative">
                    {/* Desktop Sidebar - Fixed position aligned with container */}
                    <aside className="hidden md:block fixed top-16 w-56 h-[calc(100vh-4rem)] overflow-y-auto py-4 z-30" style={{ left: 'max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))' }}>
                        <GuardianSidebar unfinishedCount={unfinishedCount} />
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
                                    }`}>
                                        {t('welcomeBack')}, {user.first_name} 👋
                                    </h1>
                                    <p className={`relative z-10 ${
                                        darkMode ? 'text-[var(--brand-light)]/70' : 'text-gray-600'
                                    }`}>
                                        {t('guardianDashboardSubtitle') || "Here's what's happening with your children's clubs today."}
                                    </p>
                                </div>

                                {/* Questionnaires Section */}
                                {unfinishedCount > 0 && (
                                    <div className={`relative rounded-none sm:rounded-xl p-6 mb-6 overflow-hidden border-y sm:border ${
                                        darkMode 
                                            ? 'bg-[var(--dark-600)] border-[var(--dark-400)]' 
                                            : 'bg-white border-[#4D4DA4]/15 shadow-sm'
                                    }`}>
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--brand-sky)] via-[var(--brand-primary)] to-[var(--brand-purple)]" />
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                                                darkMode 
                                                    ? 'bg-[var(--dark-500)] border-[var(--brand-sky)]/30' 
                                                    : 'bg-[#EBEBFE] border-[#4D4DA4]/20'
                                            }`}>
                                                <ClipboardListIcon className="w-5 h-5 text-[var(--brand-sky)]" />
                                            </div>
                                            <div className="flex-1">
                                                <h2 className={`font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>
                                                    {t('surveysForYou') || "Surveys for You"}
                                                </h2>
                                                <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
                                                    {t('surveysDescription') || "You have questionnaires waiting for your response."}
                                                </p>
                                            </div>
                                            <span className="bg-[var(--brand-primary)] text-[var(--dark-900)] text-xs font-bold px-2.5 py-1 rounded-full">
                                                {unfinishedCount}
                                            </span>
                                        </div>
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
                                            const uniqueKey = `${item.feed_type}-${item.id}-${index}`;
                                            const isSpecialCard = item.feed_type === 'QUESTIONNAIRE' || item.feed_type === 'EVENT';
                                            
                                            let postContent;
                                            if (item.feed_type === 'QUESTIONNAIRE') {
                                                postContent = (
                                                    <QuestionnaireCard 
                                                        questionnaire={item}
                                                        onComplete={handleQuestionnaireComplete}
                                                        darkMode={darkMode}
                                                    />
                                                );
                                            } else if (item.feed_type === 'EVENT') {
                                                postContent = (
                                                    <EventCard event={item as any} darkMode={darkMode} basePath="guardian" />
                                                );
                                            } else {
                                                postContent = <PostCard post={item as any} darkMode={darkMode} basePath="guardian" />;
                                            }

                                            return (
                                                <div key={uniqueKey} className={isSpecialCard ? 'my-6' : ''}>
                                                    {postContent}
                                                </div>
                                            );
                                        })}
                                        
                                        {/* Loading More Indicator / Observer Target */}
                                        <div ref={observerTarget} className="h-20 flex items-center justify-center py-4">
                                            {loadingMore && (
                                                <div className={`flex items-center gap-2 ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--brand-primary)]"></div>
                                                    <span className="text-sm">{t('loadingMore')}</span>
                                                </div>
                                            )}
                                            {!hasMore && feedItems.length > 0 && (
                                                <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`}>{t('noMorePosts') || 'No more posts'}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </main>
                            
                            {/* Right Sidebar */}
                            <aside className="lg:w-1/4 hidden lg:block flex-shrink-0">
                                <div className="sticky top-[72px] space-y-6">
                                    {(loading || !minLoadingComplete) ? (
                                        <>
                                            <ClubCardSkeleton />
                                            <SidebarCardSkeleton />
                                        </>
                                    ) : (
                                        <>
                                            {/* My Children Card */}
                                            <div className={`rounded-xl border p-6 ${
                                                darkMode 
                                                    ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
                                                    : 'bg-white border-[#4D4DA4]/15 shadow-sm'
                                            }`}>
                                                <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${
                                                    darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                                                }`}>
                                                    {t('myChildren') || "MY CHILDREN"}
                                                </h3>
                                                <div className="space-y-3">
                                                    {user.youth_members && user.youth_members.length > 0 ? (
                                                        user.youth_members.map((child: any) => (
                                                            <div 
                                                                key={child.id} 
                                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                                                    darkMode ? 'hover:bg-[var(--dark-600)]' : 'hover:bg-[#EBEBFE]'
                                                                }`}
                                                                onClick={() => router.push(`/dashboard/guardian/children/${child.id}`)}
                                                            >
                                                                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                                                                    {child.avatar ? (
                                                                        <img src={getMediaUrl(child.avatar) || ''} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full bg-[var(--brand-primary)] flex items-center justify-center">
                                                                            <span className="text-sm font-bold text-[var(--dark-900)]">
                                                                                {(child.first_name?.[0] || '').toUpperCase()}{(child.last_name?.[0] || '').toUpperCase()}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className={`font-bold text-sm ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{child.first_name} {child.last_name}</div>
                                                                    <div className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                                                                        {t('viewProfile') || "View Profile"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-center py-4">
                                                            <Users className={`w-8 h-8 mx-auto mb-2 ${darkMode ? 'text-[var(--brand-light)]/30' : 'text-gray-300'}`} />
                                                            <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                                                                {t('noChildrenLinked') || "No children linked yet"}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Upcoming Events Card - Only show if there's a next event */}
                                            {nextEvent && (
                                                <Link
                                                    href={`/dashboard/guardian/events/${nextEvent.id}`}
                                                    className={`block rounded-xl overflow-hidden transition-all group ${
                                                        darkMode 
                                                            ? 'bg-[var(--dark-700)] border border-[var(--dark-500)] hover:border-[var(--brand-primary)]/50' 
                                                            : 'bg-white border border-[#4D4DA4]/15 hover:border-[#4D4DA4]/40 shadow-sm'
                                                    }`}
                                                >
                                                    {nextEvent.cover_image && (
                                                        <div className="relative h-24 overflow-hidden">
                                                            <img
                                                                src={getMediaUrl(nextEvent.cover_image)}
                                                                alt={nextEvent.title}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                            />
                                                            <div className={`absolute inset-0 bg-gradient-to-t ${
                                                                darkMode ? 'from-[var(--dark-700)]' : 'from-white'
                                                            } to-transparent`} />
                                                            <div className="absolute top-2 left-2">
                                                                <span className="px-2 py-0.5 bg-[var(--brand-primary)] text-[var(--dark-900)] text-xs font-bold rounded-full">
                                                                    {tEvents('upcoming') || 'Upcoming'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Calendar className={`w-4 h-4 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'}`} />
                                                            <h3 className={`text-xs font-bold uppercase tracking-wider ${
                                                                darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                                                            }`}>
                                                                {t('upcomingEvents') || "UPCOMING EVENTS"}
                                                            </h3>
                                                        </div>
                                                        <h4 className={`font-bold mb-1 line-clamp-1 transition-colors ${
                                                            darkMode 
                                                                ? 'text-[var(--brand-light)] group-hover:text-[var(--brand-primary)]' 
                                                                : 'text-gray-800 group-hover:text-[#4D4DA4]'
                                                        }`}>
                                                            {nextEvent.title}
                                                        </h4>
                                                        <div className={`flex items-center gap-2 text-xs mb-2 ${
                                                            darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                                                        }`}>
                                                            <Calendar className="w-3 h-3" />
                                                            <span>
                                                                {nextEvent.start_date && format(new Date(nextEvent.start_date), 'PPP', { locale: dateLocale })}
                                                            </span>
                                                        </div>
                                                        {nextEvent.location && (
                                                            <div className={`flex items-center gap-2 text-xs mb-2 ${
                                                                darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'
                                                            }`}>
                                                                <MapPin className="w-3 h-3" />
                                                                <span className="line-clamp-1">{nextEvent.location}</span>
                                                            </div>
                                                        )}
                                                        {nextEvent.child_name && (
                                                            <div className={`flex items-center gap-2 text-xs mt-2 ${
                                                                darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
                                                            }`}>
                                                                <User className="w-3 h-3" />
                                                                <span>{nextEvent.child_name}</span>
                                                            </div>
                                                        )}
                                                        <div className={`flex items-center justify-end mt-2 group-hover:translate-x-1 transition-transform ${
                                                            darkMode ? 'text-[var(--brand-primary)]' : 'text-[#4D4DA4]'
                                                        }`}>
                                                            <ArrowRight className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                </Link>
                                            )}

                                            {/* Municipality Card */}
                                            {user.assigned_municipality && (
                                                <div className={`rounded-xl border p-6 ${
                                                    darkMode 
                                                        ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
                                                        : 'bg-white border-[#4D4DA4]/15 shadow-sm'
                                                }`}>
                                                    <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 ${
                                                        darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'
                                                    }`}>
                                                        {t('myMunicipality') || "MY MUNICIPALITY"}
                                                    </h3>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center ${
                                                            darkMode ? 'bg-[var(--dark-500)]' : 'bg-[#EBEBFE]'
                                                        }`}>
                                                            {user.assigned_municipality.avatar ? (
                                                                <img 
                                                                    src={getMediaUrl(user.assigned_municipality.avatar)} 
                                                                    alt={user.assigned_municipality.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <span className="text-lg">🏛️</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className={`font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>
                                                                {user.assigned_municipality.name}
                                                            </h4>
                                                            <p className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/50' : 'text-gray-500'}`}>
                                                                {t('guardianAccount') || "Guardian Account"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
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

function ClipboardListIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <path d="M9 12v-1h6v1"/>
            <path d="M11 17h2"/>
            <path d="M12 17v-1"/>
        </svg>
    );
}
