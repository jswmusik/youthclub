'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { enUS, sv, da, nb, fi, type Locale } from 'date-fns/locale';
import api from '@/lib/api';
import PostCard from '../posts/PostCard';
import EventCard from '../events/youth/EventCard';
import { getMediaUrl } from '@/app/utils';
import { Clock, Activity, Users, Calendar, ChevronRight, QrCode, CheckCircle2 } from 'lucide-react';

// Map locale codes to date-fns locales
const localeMap: Record<string, Locale> = {
  en: enUS,
  sv: sv,
  da: da,
  nb: nb,
  fi: fi,
  ar: enUS,
  so: enUS,
  prs: enUS,
};

type TimeFilter = 'day' | 'week' | 'month' | 'forever';

interface GuardianActivityFeedProps {
  showTimeFilter?: boolean;
  darkMode?: boolean;
}

interface FeedItem {
  id: number;
  title: string;
  content?: string;
  published_at?: string;
  created_at: string;
  images?: { image: string }[];
  club?: {
    id: number;
    name: string;
    avatar?: string;
  };
  feed_type?: 'POST' | 'EVENT' | 'QUESTIONNAIRE' | 'REWARD';
}

type TimelineItem = {
  type: 'post' | 'event';
  date: Date;
  data: FeedItem;
};

export default function GuardianActivityFeed({ showTimeFilter = true, darkMode = false }: GuardianActivityFeedProps) {
  const t = useTranslations('activity');
  const tProfile = useTranslations('profile');
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = localeMap[locale] || enUS;
  
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('forever');
  const [error, setError] = useState('');
  const observerTarget = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);

  const loadFeedItems = useCallback(async (pageNum: number, append: boolean = false, filter: TimeFilter = timeFilter) => {
    try {
      if (append) {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      } else {
        setLoading(true);
        setError('');
      }

      // Use the feed endpoint to get guardian-specific posts
      // (posts from children's clubs + followed clubs + global posts)
      const params = new URLSearchParams();
      params.set('page', pageNum.toString());

      const res = await api.get(`/posts/feed/?${params.toString()}`);
      const newItems = res.data.results || res.data;

      if (append) {
        setFeedItems(prev => [...prev, ...newItems]);
      } else {
        setFeedItems(newItems);
      }

      const hasNext = !!res.data.next;
      setHasMore(hasNext);
      hasMoreRef.current = hasNext;
    } catch (err) {
      console.error('Failed to load activity:', err);
      setError(t('couldNotLoadHistory') || 'Could not load activity');
      setHasMore(false);
      hasMoreRef.current = false;
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [timeFilter, t]);

  useEffect(() => {
    pageRef.current = 1;
    hasMoreRef.current = true;
    setPage(1);
    setHasMore(true);
    loadFeedItems(1, false, timeFilter);
  }, [timeFilter]);

  // Sync refs
  useEffect(() => {
    pageRef.current = page;
    hasMoreRef.current = hasMore;
    loadingMoreRef.current = loadingMore;
  }, [page, hasMore, loadingMore]);

  // Infinite scroll
  useEffect(() => {
    if (feedItems.length === 0 || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
          const nextPage = pageRef.current + 1;
          pageRef.current = nextPage;
          setPage(nextPage);
          loadFeedItems(nextPage, true);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
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
  }, [loadFeedItems, feedItems.length, hasMore]);

  // Merge and sort timeline items
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];
    
    feedItems.forEach(item => {
      const itemDate = item.published_at ? new Date(item.published_at) : new Date(item.created_at);
      if (!isNaN(itemDate.getTime())) {
        const itemType = item.feed_type === 'EVENT' ? 'event' : 'post';
        items.push({ type: itemType, date: itemDate, data: item });
      }
    });
    
    // Sort by date (newest first)
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [feedItems]);

  const timeFilterOptions: { value: TimeFilter; label: string }[] = [
    { value: 'day', label: t('lastDay') || 'Last 24 hours' },
    { value: 'week', label: t('lastWeek') || 'Last week' },
    { value: 'month', label: t('lastMonth') || 'Last month' },
    { value: 'forever', label: t('forever') || 'All time' },
  ];

  if (loading) {
    return (
      <div className={showTimeFilter ? "grid grid-cols-1 lg:grid-cols-4 gap-6" : ""}>
        {/* Sidebar skeleton */}
        {showTimeFilter && (
          <div className="lg:col-span-1">
            <div className={`rounded-none sm:rounded-xl p-4 h-64 animate-pulse border-y sm:border ${
              darkMode ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' : 'bg-white shadow-sm border-[#4D4DA4]/15'
            }`}>
              <div className={`h-6 w-32 rounded mb-4 ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#EBEBFE]'}`}></div>
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-10 rounded ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#EBEBFE]'}`}></div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Content skeleton */}
        <div className={showTimeFilter ? "lg:col-span-3 space-y-4" : "space-y-4"}>
          {[1, 2].map((i) => (
            <div key={i} className={`rounded-none sm:rounded-2xl p-4 h-48 animate-pulse border-t sm:border ${
              darkMode ? 'bg-[var(--dark-900)] border-[var(--dark-500)]' : 'bg-white shadow-sm border-[#4D4DA4]/15'
            }`}>
              <div className="flex gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#EBEBFE]'}`}></div>
                <div className="space-y-2">
                  <div className={`h-4 w-32 rounded ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#EBEBFE]'}`}></div>
                  <div className={`h-3 w-20 rounded ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#EBEBFE]'}`}></div>
                </div>
              </div>
              <div className={`h-20 rounded mb-4 ${darkMode ? 'bg-[var(--dark-600)]' : 'bg-[#EBEBFE]'}`}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className={`text-center py-8 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>{error}</div>;
  }

  return (
    <div className={showTimeFilter ? "grid grid-cols-1 lg:grid-cols-4 gap-6" : ""}>
      {/* Left Sidebar - Time Filter */}
      {showTimeFilter && (
        <div className="lg:col-span-1">
          <div className={`rounded-none sm:rounded-2xl p-6 border-y sm:border sticky top-[120px] z-30 ${
            darkMode 
              ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
              : 'bg-gradient-to-br from-white to-[#EBEBFE]/30 shadow-sm border-[#4D4DA4]/10'
          }`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 font-heading ${
              darkMode ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-primary)]'
            }`}>
              <Clock className="w-5 h-5" />
              {t('timePeriod') || 'Time Period'}
            </h3>
            <div className="space-y-2">
              {timeFilterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeFilter(option.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                    timeFilter === option.value
                      ? darkMode
                        ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                        : 'bg-gradient-to-r from-[#4D4DA4] to-[#6D6DD4] text-white shadow-md shadow-[#4D4DA4]/30'
                      : darkMode
                        ? 'bg-[var(--dark-600)] text-[var(--brand-light)]/80 hover:bg-[var(--dark-500)] hover:text-[var(--brand-light)] border border-[var(--dark-500)]'
                        : 'bg-white text-gray-700 hover:bg-[#EBEBFE] hover:text-[#4D4DA4] border border-[#4D4DA4]/15 shadow-sm'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Right Column - Timeline */}
      <div className={showTimeFilter ? "lg:col-span-3" : ""}>
        {timelineItems.length === 0 ? (
          <div className={`text-center py-10 rounded-none sm:rounded-xl border-y sm:border ${
            darkMode 
              ? 'bg-[var(--dark-800)] border-[var(--dark-500)]' 
              : 'bg-white shadow-sm border-[#4D4DA4]/15'
          }`}>
            <Activity className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-[var(--brand-light)]/30' : 'text-gray-400'}`} />
            <p className={darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}>{t('noRecentActivity') || 'No recent activity'}</p>
            <p className={`text-sm mt-1 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-500'}`}>
              {tProfile('activityDescription') || 'Posts and updates from clubs you follow'}
            </p>
          </div>
        ) : (
          <div>
            <h3 className={`text-xl font-bold px-1 mb-6 flex items-center gap-3 font-heading ${
              darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
            }`}>
              <Activity className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-primary)]'}`} />
              {tProfile('latestActivity') || 'Latest Activity'}
            </h3>
            
            {timelineItems.map((item) => (
              <div key={`${item.type}-${item.data.id}`} className="mb-6">
                {item.type === 'event' ? (
                  <EventCard event={item.data as any} darkMode={darkMode} basePath="guardian" />
                ) : (
                  <PostCard post={item.data as any} darkMode={darkMode} basePath="guardian" />
                )}
              </div>
            ))}
            
            {/* Infinite Scroll Trigger */}
            <div ref={observerTarget} className="h-10 flex items-center justify-center">
              {loadingMore && (
                <div className={`flex items-center gap-2 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`}>
                  <div className={`animate-spin rounded-full h-5 w-5 border-b-2 ${
                    darkMode ? 'border-[var(--brand-primary)]' : 'border-[#4D4DA4]'
                  }`}></div>
                  <span className="text-sm">{t('loadingMorePosts') || 'Loading more...'}</span>
                </div>
              )}
              {!hasMore && timelineItems.length > 0 && (
                <div className={`text-center pt-4 pb-8 text-sm ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-500'}`}>
                  {t('endOfTimeline') || 'No more activity'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
