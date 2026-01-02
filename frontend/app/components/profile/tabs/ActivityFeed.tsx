'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { format } from 'date-fns';
import { enUS, sv, da, nb, fi, type Locale } from 'date-fns/locale';

import { fetchUserActivityFeed, visits, rewards } from '@/lib/api';
import api from '@/lib/api';
import { sanitizeHtml } from '@/lib/sanitize';
import PostCard from '@/app/components/posts/PostCard';
import { Post } from '@/types/post';
import { getMediaUrl } from '@/app/utils';
import { Users, Package, CheckCircle2, ClipboardCheck, Calendar, Gift, ChevronRight, QrCode, Activity, Clock } from 'lucide-react';

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

interface ActivityFeedProps {
  showTimeFilter?: boolean;
  darkMode?: boolean;
}

interface Visit {
  id: number;
  club: number;
  club_name?: string;
  club_avatar?: string | null;
  check_in_at: string;
  check_out_at: string | null;
  method: string;
}

interface RewardRedemption {
  id: number;
  type: 'reward_redemption';
  reward_id: number;
  reward_name: string;
  reward_description: string;
  reward_image: string | null;
  sponsor: string;
  redeemed_at: string;
  created_at: string;
}

interface Booking {
  id: number;
  resource: number;
  resource_name: string;
  start_time: string;
  end_time: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  club_name?: string;
  created_at?: string;
}

type TimelineItem = {
  type: 'post' | 'visit' | 'reward_redemption' | 'group_join' | 'inventory_borrow' | 'inventory_return' | 'inventory_complete' | 'questionnaire_complete' | 'booking_confirmed';
  date: Date;
  data: Post | Visit | RewardRedemption | Booking | Post; // group_join, inventory activities and questionnaire completions use Post type
};

export default function ActivityFeed({ showTimeFilter = true, darkMode = false }: ActivityFeedProps) {
  const router = useRouter();
  const t = useTranslations('activity');
  const locale = useLocale();
  const dateLocale = localeMap[locale] || enUS;
  const [posts, setPosts] = useState<Post[]>([]);
  const [visitsData, setVisitsData] = useState<Visit[]>([]);
  const [rewardRedemptions, setRewardRedemptions] = useState<RewardRedemption[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('forever');
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage(1);
    loadFeed(1, false);
  }, [timeFilter]);

  const loadFeed = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError('');
      }
      
      // Fetch posts (always fetch on pagination)
      const postsRes = await fetchUserActivityFeed(pageNum, timeFilter);
      
      // Only fetch visits, reward redemptions, and bookings on initial load (not on pagination)
      // This ensures they don't interfere with pagination and sorting
      let visitsRes, rewardsRes, bookingsRes;
      if (!append) {
        [visitsRes, rewardsRes, bookingsRes] = await Promise.all([
          visits.getMyVisits(),
          rewards.getMyRedemptions(),
          api.get('/bookings/bookings/?status=APPROVED&page_size=100')
        ]);
      }
      
      // Handle pagination results vs flat list for posts
      const newPosts = postsRes.data.results ? postsRes.data.results : postsRes.data;
      
      if (append) {
        // On pagination, only update posts
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        // On initial load, fetch and filter all data
        setPosts(newPosts);
        
        // Handle visits (apply time filter on frontend)
        const allVisits = visitsRes?.data?.results || visitsRes?.data || [];
        let filteredVisits = allVisits;
        
        // Handle reward redemptions (apply time filter on frontend)
        const allRedemptions = rewardsRes?.data || [];
        let filteredRedemptions = allRedemptions;
        
        // Handle bookings (only APPROVED ones)
        const allBookingsData = bookingsRes?.data?.results || bookingsRes?.data || [];
        const allBookings = Array.isArray(allBookingsData) ? allBookingsData : [];
        let filteredBookings = allBookings;
        
        if (timeFilter !== 'forever') {
          const thresholdDate = new Date();
          if (timeFilter === 'day') {
            thresholdDate.setDate(thresholdDate.getDate() - 1);
          } else if (timeFilter === 'week') {
            thresholdDate.setDate(thresholdDate.getDate() - 7);
          } else if (timeFilter === 'month') {
            thresholdDate.setDate(thresholdDate.getDate() - 30);
          }
          
          filteredVisits = allVisits.filter((visit: Visit) => {
            const visitDate = new Date(visit.check_in_at);
            return visitDate >= thresholdDate;
          });
          
          filteredRedemptions = allRedemptions.filter((redemption: RewardRedemption) => {
            const redemptionDate = new Date(redemption.redeemed_at);
            return redemptionDate >= thresholdDate;
          });
          
          filteredBookings = allBookings.filter((booking: Booking) => {
            // Use the date when booking was confirmed (created_at for when it was created/approved)
            const bookingDate = new Date(booking.created_at || booking.start_time);
            return bookingDate >= thresholdDate;
          });
        }
        
        setVisitsData(filteredVisits);
        setRewardRedemptions(filteredRedemptions);
        setBookings(filteredBookings);
      }
      
      // Check if there are more pages (only for posts)
      setHasMore(!!postsRes.data.next);
    } catch (err) {
      console.error("Failed to load activity feed", err);
      setError(t('couldNotLoadHistory'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [timeFilter]);

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

  // Merge and sort timeline items
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];
    
    // Add posts (check if it's a group join or inventory activity post)
    posts.forEach(post => {
      const postDate = post.published_at ? new Date(post.published_at) : new Date(post.created_at);
      // Ensure date is valid
      if (!isNaN(postDate.getTime())) {
        // Check if this is a group join post (title starts with "Joined")
        // Backend now only returns the user's own "Joined" posts
        if (post.title && post.title.startsWith('Joined ')) {
          items.push({ type: 'group_join', date: postDate, data: post });
        } else if (post.title && post.title.startsWith('Borrowed ')) {
          // Check if content contains "Returned" - means it's a completed borrow/return cycle
          const isReturned = post.content && post.content.includes('Returned');
          if (isReturned) {
            items.push({ type: 'inventory_complete', date: postDate, data: post });
          } else {
            items.push({ type: 'inventory_borrow', date: postDate, data: post });
          }
        } else if (post.title && post.title.startsWith('Returned ')) {
          items.push({ type: 'inventory_return', date: postDate, data: post });
        } else if (post.title && post.title.startsWith('Completed Questionnaire: ')) {
          items.push({ type: 'questionnaire_complete', date: postDate, data: post });
        } else {
          items.push({ type: 'post', date: postDate, data: post });
        }
      }
    });
    
    // Add visits
    visitsData.forEach(visit => {
      const visitDate = new Date(visit.check_in_at);
      if (!isNaN(visitDate.getTime())) {
        items.push({ type: 'visit', date: visitDate, data: visit });
      }
    });
    
    // Add reward redemptions
    rewardRedemptions.forEach(redemption => {
      const redemptionDate = new Date(redemption.redeemed_at);
      // Ensure date is valid and use redeemed_at (not created_at) for sorting
      if (!isNaN(redemptionDate.getTime())) {
        items.push({ type: 'reward_redemption', date: redemptionDate, data: redemption });
      }
    });
    
    // Add bookings (only APPROVED ones)
    bookings.forEach(booking => {
      // Use created_at as the date for sorting (when the booking was confirmed/approved)
      // Fallback to start_time if created_at is not available
      const bookingDate = new Date(booking.created_at || booking.start_time);
      if (!isNaN(bookingDate.getTime())) {
        items.push({ type: 'booking_confirmed', date: bookingDate, data: booking });
      }
    });
    
    // Sort by date (newest first) - ensure proper numeric comparison
    return items.sort((a, b) => {
      const timeA = a.date.getTime();
      const timeB = b.date.getTime();
      return timeB - timeA; // Descending order (newest first)
    });
  }, [posts, visitsData, rewardRedemptions, bookings]);

  const timeFilterOptions: { value: TimeFilter; label: string }[] = [
    { value: 'day', label: t('lastDay') },
    { value: 'week', label: t('lastWeek') },
    { value: 'month', label: t('lastMonth') },
    { value: 'forever', label: t('forever') },
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

  // Activity card component for non-post items (lighter background than posts)
  const ActivityCard = ({ 
    children, 
    accentColor 
  }: { 
    children: React.ReactNode; 
    accentColor: string;
  }) => (
    <div className={`rounded-none sm:rounded-xl border-l-4 p-4 sm:p-6 border-t sm:border ${
      darkMode 
        ? 'bg-[var(--dark-700)] border-[var(--dark-500)]' 
        : 'bg-white shadow-sm border-[#4D4DA4]/15'
    }`} style={{ borderLeftColor: accentColor }}>
      {children}
    </div>
  );

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
              darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'
            }`}>
              <Clock className="w-5 h-5" />
              {t('timePeriod')}
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
            <p className={darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}>{t('noRecentActivity')}</p>
            <p className={`text-sm mt-1 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-500'}`}>{t('joinClubToSeePosts')}</p>
          </div>
        ) : (
          <div>
            <h3 className={`text-xl font-bold px-1 mb-6 flex items-center gap-3 font-heading ${
              darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'
            }`}>
              <Activity className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'}`} />
              {t('latestActivity')}
            </h3>
            {timelineItems.map((item) => {
              if (item.type === 'group_join') {
                const groupPost = item.data as Post;
                const groupName = groupPost.title.replace('Joined ', '');
                const joinDate = item.date;
                const weekday = format(joinDate, 'EEEE', { locale: dateLocale });
                const dateStr = format(joinDate, 'MMMM d, yyyy', { locale: dateLocale });
                const timeStr = format(joinDate, 'HH:mm');
                
                const groupImage = groupPost.images && groupPost.images.length > 0 
                  ? groupPost.images[0].image 
                  : null;
                
                const contentMatch = groupPost.content?.match(/href=['"]([^'"]+)['"]/);
                const groupUrl = contentMatch ? contentMatch[1] : null;
                
                return (
                  <div key={`group-join-${groupPost.id}`} className="mb-4">
                    <ActivityCard accentColor={darkMode ? 'var(--brand-purple)' : '#4D4DA4'}>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {groupImage ? (
                            <img 
                              src={getMediaUrl(groupImage) || ''} 
                              alt={groupName} 
                              className={`w-12 h-12 rounded-full object-cover border-2 ${
                                darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/15'
                              }`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              darkMode ? 'bg-[var(--brand-purple)]/20' : 'bg-[#4D4DA4]/20'
                            }`}>
                              <Users className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#6D6DD4]'}`} />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{groupName}</h4>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              darkMode 
                                ? 'bg-[var(--brand-purple)]/20 text-[var(--brand-purple)] border border-[var(--brand-purple)]/30'
                                : 'bg-[#4D4DA4]/20 text-[#6D6DD4] border border-[#4D4DA4]/30'
                            }`}>
                              {t('joined')}
                            </span>
                          </div>
                          <p className={`text-sm mb-2 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                            {weekday}, {dateStr} {t('at')} {timeStr}
                          </p>
                          {groupUrl && (
                            <button
                              onClick={() => router.push(groupUrl)}
                              className={`text-sm font-medium inline-flex items-center gap-1 transition-colors ${
                                darkMode 
                                  ? 'text-[var(--brand-purple)] hover:text-[var(--brand-primary)]'
                                  : 'text-[#6D6DD4] hover:text-[#FF5485]'
                              }`}
                            >
                              {t('viewGroup')}
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        <div className="flex-shrink-0 hidden sm:block">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            darkMode ? 'bg-[var(--brand-purple)]/20' : 'bg-[#4D4DA4]/20'
                          }`}>
                            <Users className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-[#6D6DD4]'}`} />
                          </div>
                        </div>
                      </div>
                    </ActivityCard>
                  </div>
                );
              } else if (item.type === 'inventory_borrow' || item.type === 'inventory_return' || item.type === 'inventory_complete') {
                const inventoryPost = item.data as Post;
                const isComplete = item.type === 'inventory_complete';
                const isBorrow = item.type === 'inventory_borrow';
                
                const itemName = inventoryPost.title.replace('Borrowed ', '').replace('Returned ', '');
                const actionDate = item.date;
                
                let returnDateStr: string | null = null;
                if (isComplete && inventoryPost.content) {
                  const returnMatch = inventoryPost.content.match(/Returned to[^<]*on ([^<]+) at ([^<]+)/);
                  if (returnMatch) {
                    returnDateStr = `${returnMatch[1]} ${t('at')} ${returnMatch[2]}`;
                  }
                }
                const weekday = format(actionDate, 'EEEE', { locale: dateLocale });
                const dateStr = format(actionDate, 'MMMM d, yyyy', { locale: dateLocale });
                const timeStr = format(actionDate, 'HH:mm');
                
                const itemImage = inventoryPost.images && inventoryPost.images.length > 0 
                  ? inventoryPost.images[0].image 
                  : null;

                const accentColor = darkMode 
                  ? (isComplete ? 'var(--brand-purple)' : (isBorrow ? 'var(--brand-sky)' : 'var(--brand-third)'))
                  : (isComplete ? '#4D4DA4' : (isBorrow ? '#6D6DD4' : '#10B981'));
                
                return (
                  <div key={`inventory-${inventoryPost.id}`} className="mb-4">
                    <ActivityCard accentColor={accentColor}>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {itemImage ? (
                            <img 
                              src={getMediaUrl(itemImage) || ''} 
                              alt={itemName} 
                              className={`w-12 h-12 rounded-full object-cover border-2 ${
                                darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/15'
                              }`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              darkMode 
                                ? (isComplete ? 'bg-[var(--brand-purple)]/20' : (isBorrow ? 'bg-[var(--brand-sky)]/20' : 'bg-[var(--brand-third)]/20'))
                                : (isComplete ? 'bg-[#4D4DA4]/20' : (isBorrow ? 'bg-[#6D6DD4]/20' : 'bg-[#10B981]/20'))
                            }`}>
                              {isComplete ? (
                                <div className="flex items-center gap-0.5">
                                  <Package className={`w-4 h-4 ${darkMode ? 'text-[var(--brand-sky)]' : 'text-[#6D6DD4]'}`} />
                                  <CheckCircle2 className={`w-4 h-4 ${darkMode ? 'text-[var(--brand-third)]' : 'text-[#10B981]'}`} />
                                </div>
                              ) : isBorrow ? (
                                <Package className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-sky)]' : 'text-[#6D6DD4]'}`} />
                              ) : (
                                <CheckCircle2 className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-third)]' : 'text-[#10B981]'}`} />
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{itemName}</h4>
                            {isComplete ? (
                              <>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  darkMode 
                                    ? 'bg-[var(--brand-sky)]/20 text-[var(--brand-sky)] border border-[var(--brand-sky)]/30'
                                    : 'bg-[#6D6DD4]/20 text-[#6D6DD4] border border-[#6D6DD4]/30'
                                }`}>
                                  {t('borrowed')}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  darkMode 
                                    ? 'bg-[var(--brand-third)]/20 text-[var(--brand-third)] border border-[var(--brand-third)]/30'
                                    : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                                }`}>
                                  {t('returned')}
                                </span>
                              </>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                isBorrow 
                                  ? (darkMode ? 'bg-[var(--brand-sky)]/20 text-[var(--brand-sky)] border border-[var(--brand-sky)]/30' : 'bg-[#6D6DD4]/20 text-[#6D6DD4] border border-[#6D6DD4]/30')
                                  : (darkMode ? 'bg-[var(--brand-third)]/20 text-[var(--brand-third)] border border-[var(--brand-third)]/30' : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30')
                              }`}>
                                {isBorrow ? t('borrowed') : t('returned')}
                              </span>
                            )}
                          </div>
                          {isComplete && returnDateStr ? (
                            <div className="space-y-1">
                              <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                                <span className={`font-medium ${darkMode ? 'text-[var(--brand-light)]/80' : 'text-gray-700'}`}>{t('borrowed')}:</span> {weekday}, {dateStr} {t('at')} {timeStr}
                              </p>
                              <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                                <span className={`font-medium ${darkMode ? 'text-[var(--brand-light)]/80' : 'text-gray-700'}`}>{t('returned')}:</span> {returnDateStr}
                              </p>
                            </div>
                          ) : (
                            <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                              {weekday}, {dateStr} {t('at')} {timeStr}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex-shrink-0 hidden sm:block">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            darkMode 
                              ? (isComplete ? 'bg-[var(--brand-purple)]/20' : (isBorrow ? 'bg-[var(--brand-sky)]/20' : 'bg-[var(--brand-third)]/20'))
                              : (isComplete ? 'bg-[#4D4DA4]/20' : (isBorrow ? 'bg-[#6D6DD4]/20' : 'bg-[#10B981]/20'))
                          }`}>
                            {isComplete ? (
                              <div className="flex items-center gap-0.5">
                                <Package className={`w-4 h-4 ${darkMode ? 'text-[var(--brand-sky)]' : 'text-[#6D6DD4]'}`} />
                                <CheckCircle2 className={`w-4 h-4 ${darkMode ? 'text-[var(--brand-third)]' : 'text-[#10B981]'}`} />
                              </div>
                            ) : isBorrow ? (
                              <Package className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-sky)]' : 'text-[#6D6DD4]'}`} />
                            ) : (
                              <CheckCircle2 className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-third)]' : 'text-[#10B981]'}`} />
                            )}
                          </div>
                        </div>
                      </div>
                    </ActivityCard>
                  </div>
                );
              } else if (item.type === 'questionnaire_complete') {
                const questionnairePost = item.data as Post;
                const questionnaireDate = new Date(questionnairePost.published_at || questionnairePost.created_at);
                const weekday = format(questionnaireDate, 'EEEE', { locale: dateLocale });
                const dateStr = format(questionnaireDate, 'MMMM d, yyyy', { locale: dateLocale });
                const timeStr = format(questionnaireDate, 'HH:mm');
                
                const questionnaireTitle = questionnairePost.title.replace('Completed Questionnaire: ', '');
                
                return (
                  <div key={`questionnaire-${questionnairePost.id}`} className="mb-4">
                    <ActivityCard accentColor={darkMode ? 'var(--brand-third)' : '#4D4DA4'}>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            darkMode ? 'bg-[var(--brand-third)]/20' : 'bg-[#4D4DA4]/20'
                          }`}>
                            <div className="flex items-center gap-0.5">
                              <ClipboardCheck className={`w-5 h-5 ${darkMode ? 'text-[var(--brand-third)]' : 'text-[#6D6DD4]'}`} />
                              <CheckCircle2 className={`w-4 h-4 ${darkMode ? 'text-[var(--brand-third)]' : 'text-[#10B981]'}`} />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{questionnaireTitle}</h4>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              darkMode 
                                ? 'bg-[var(--brand-third)]/20 text-[var(--brand-third)] border border-[var(--brand-third)]/30'
                                : 'bg-[#4D4DA4]/20 text-[#6D6DD4] border border-[#4D4DA4]/30'
                            }`}>
                              {t('completed')}
                            </span>
                          </div>
                          <p className={`text-sm mb-2 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                            {weekday}, {dateStr} at {timeStr}
                          </p>
                          {questionnairePost.content && (
                            <div 
                              className={`text-sm max-w-none ${
                                darkMode 
                                  ? 'text-[var(--brand-light)]/70 [&_a]:text-[var(--brand-purple)] [&_strong]:text-[var(--brand-light)] [&_p]:text-[var(--brand-light)]/70'
                                  : 'text-gray-700 [&_a]:text-[#6D6DD4] [&_strong]:text-gray-800'
                              }`}
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(questionnairePost.content) }}
                            />
                          )}
                        </div>
                        
                        <div className="flex-shrink-0 hidden sm:block">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            darkMode ? 'bg-[var(--brand-third)]/20' : 'bg-[#4D4DA4]/20'
                          }`}>
                            <CheckCircle2 className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-third)]' : 'text-[#6D6DD4]'}`} />
                          </div>
                        </div>
                      </div>
                    </ActivityCard>
                  </div>
                );
              } else if (item.type === 'post') {
                return (
                  <div key={`post-${item.data.id}`} className="mb-6">
                    <PostCard post={item.data as Post} darkMode={darkMode} />
                  </div>
                );
              } else if (item.type === 'booking_confirmed') {
                const booking = item.data as Booking;
                const bookingDate = new Date(booking.start_time);
                const weekday = format(bookingDate, 'EEEE', { locale: dateLocale });
                const dateStr = format(bookingDate, 'MMMM d, yyyy', { locale: dateLocale });
                const startTimeStr = format(bookingDate, 'HH:mm');
                const endDate = new Date(booking.end_time);
                const endTimeStr = format(endDate, 'HH:mm');
                
                return (
                  <div key={`booking-${booking.id}`} className="mb-4">
                    <ActivityCard accentColor={darkMode ? 'var(--brand-sky)' : '#0EA5E9'}>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            darkMode ? 'bg-[var(--brand-sky)]/20' : 'bg-[#0EA5E9]/20'
                          }`}>
                            <Calendar className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-sky)]' : 'text-[#0EA5E9]'}`} />
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{booking.resource_name}</h4>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              darkMode 
                                ? 'bg-[var(--brand-sky)]/20 text-[var(--brand-sky)] border border-[var(--brand-sky)]/30'
                                : 'bg-[#0EA5E9]/20 text-[#0EA5E9] border border-[#0EA5E9]/30'
                            }`}>
                              {t('confirmed')}
                            </span>
                          </div>
                          {booking.club_name && (
                            <p className={`text-sm mb-1 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                              {booking.club_name}
                            </p>
                          )}
                          <p className={`text-sm mb-2 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                            {weekday}, {dateStr}
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                            {startTimeStr} - {endTimeStr}
                          </p>
                          <button
                            onClick={() => router.push('/dashboard/youth/bookings')}
                            className={`text-sm font-medium inline-flex items-center gap-1 transition-colors mt-2 ${
                              darkMode 
                                ? 'text-[var(--brand-sky)] hover:text-[var(--brand-primary)]'
                                : 'text-[#0EA5E9] hover:text-[#0284C7]'
                            }`}
                          >
                            {t('viewBooking')}
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="flex-shrink-0 hidden sm:block">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            darkMode ? 'bg-[var(--brand-sky)]/20' : 'bg-[#0EA5E9]/20'
                          }`}>
                            <CheckCircle2 className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-sky)]' : 'text-[#0EA5E9]'}`} />
                          </div>
                        </div>
                      </div>
                    </ActivityCard>
                  </div>
                );
              } else if (item.type === 'reward_redemption') {
                const redemption = item.data as RewardRedemption;
                const redemptionDate = new Date(redemption.redeemed_at);
                const weekday = format(redemptionDate, 'EEEE', { locale: dateLocale });
                const dateStr = format(redemptionDate, 'MMMM d, yyyy', { locale: dateLocale });
                const timeStr = format(redemptionDate, 'HH:mm');
                
                return (
                  <div key={`reward-${redemption.id}`} className="mb-4">
                    <ActivityCard accentColor={darkMode ? 'var(--brand-primary)' : '#FF5485'}>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {redemption.reward_image ? (
                            <img 
                              src={getMediaUrl(redemption.reward_image) || ''} 
                              alt={redemption.reward_name} 
                              className={`w-12 h-12 rounded-full object-cover border-2 ${
                                darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/15'
                              }`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              darkMode ? 'bg-[var(--brand-primary)]/20' : 'bg-[#FF5485]/20'
                            }`}>
                              <Gift className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'}`} />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{redemption.reward_name}</h4>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              darkMode 
                                ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30'
                                : 'bg-[#FF5485]/20 text-[#FF5485] border border-[#FF5485]/30'
                            }`}>
                              {t('redeemed')}
                            </span>
                          </div>
                          {redemption.reward_description && (
                            <p className={`text-sm mb-2 line-clamp-2 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                              {redemption.reward_description}
                            </p>
                          )}
                          {redemption.sponsor && (
                            <p className={`text-xs mb-2 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-500'}`}>
                              {t('sponsoredBy')} {redemption.sponsor}
                            </p>
                          )}
                          <p className={`text-sm ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                            {weekday}, {dateStr} {t('at')} {timeStr}
                          </p>
                        </div>
                        
                        <div className="flex-shrink-0 hidden sm:block">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            darkMode ? 'bg-[var(--brand-primary)]/20' : 'bg-[#FF5485]/20'
                          }`}>
                            <Gift className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-[#FF5485]'}`} />
                          </div>
                        </div>
                      </div>
                    </ActivityCard>
                  </div>
                );
              } else {
                const visit = item.data as Visit;
                const visitDate = new Date(visit.check_in_at);
                const weekday = format(visitDate, 'EEEE', { locale: dateLocale });
                const dateStr = format(visitDate, 'MMMM d, yyyy', { locale: dateLocale });
                const timeStr = format(visitDate, 'HH:mm');
                
                return (
                  <div key={`visit-${visit.id}`} className="mb-4">
                    <ActivityCard accentColor={darkMode ? 'var(--brand-third)' : '#10B981'}>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {visit.club_avatar ? (
                            <img 
                              src={getMediaUrl(visit.club_avatar) || ''} 
                              alt={visit.club_name || 'Club'} 
                              className={`w-12 h-12 rounded-full object-cover border-2 ${
                                darkMode ? 'border-[var(--dark-500)]' : 'border-[#4D4DA4]/15'
                              }`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                              darkMode 
                                ? 'bg-[var(--brand-third)]/20 text-[var(--brand-third)]'
                                : 'bg-[#10B981]/20 text-[#10B981]'
                            }`}>
                              {(visit.club_name || 'C')[0]}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className={`font-semibold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-800'}`}>{visit.club_name || t('clubVisit')}</h4>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              darkMode 
                                ? 'bg-[var(--brand-third)]/20 text-[var(--brand-third)] border border-[var(--brand-third)]/30'
                                : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                            }`}>
                              {t('checkIn')}
                            </span>
                          </div>
                          <p className={`text-sm mb-2 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-600'}`}>
                            {weekday}, {dateStr} {t('at')} {timeStr}
                          </p>
                          {visit.check_out_at && (
                            <p className={`text-xs ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-500'}`}>
                              {t('checkedOut')} {format(new Date(visit.check_out_at), 'HH:mm')}
                            </p>
                          )}
                          {!visit.check_out_at && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              darkMode 
                                ? 'bg-[var(--brand-third)]/20 text-[var(--brand-third)] border border-[var(--brand-third)]/30'
                                : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                            }`}>
                              {t('activeNow')}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-shrink-0 hidden sm:block">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            darkMode ? 'bg-[var(--brand-third)]/20' : 'bg-[#10B981]/20'
                          }`}>
                            <QrCode className={`w-6 h-6 ${darkMode ? 'text-[var(--brand-third)]' : 'text-[#10B981]'}`} />
                          </div>
                        </div>
                      </div>
                    </ActivityCard>
                  </div>
                );
              }
            })}
            
            {/* Infinite Scroll Trigger */}
            <div ref={observerTarget} className="h-10 flex items-center justify-center">
              {loadingMore && (
                <div className={`flex items-center gap-2 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`}>
                  <div className={`animate-spin rounded-full h-5 w-5 border-b-2 ${
                    darkMode ? 'border-[var(--brand-primary)]' : 'border-[#4D4DA4]'
                  }`}></div>
                  <span className="text-sm">{t('loadingMorePosts')}</span>
                </div>
              )}
              {!hasMore && timelineItems.length > 0 && (
                <div className={`text-center pt-4 pb-8 text-sm ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-500'}`}>
                  {t('endOfTimeline')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
