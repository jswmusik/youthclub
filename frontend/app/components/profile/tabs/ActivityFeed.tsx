'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { fetchUserActivityFeed, visits, rewards } from '@/lib/api';
import PostCard from '@/app/components/posts/PostCard';
import { Post } from '@/types/post';
import { getMediaUrl } from '@/app/utils';

type TimeFilter = 'day' | 'week' | 'month' | 'forever';

interface ActivityFeedProps {
  showTimeFilter?: boolean;
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

type TimelineItem = {
  type: 'post' | 'visit' | 'reward_redemption';
  date: Date;
  data: Post | Visit | RewardRedemption;
};

export default function ActivityFeed({ showTimeFilter = true }: ActivityFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [visitsData, setVisitsData] = useState<Visit[]>([]);
  const [rewardRedemptions, setRewardRedemptions] = useState<RewardRedemption[]>([]);
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
      
      // Only fetch visits and reward redemptions on initial load (not on pagination)
      // This ensures they don't interfere with pagination and sorting
      let visitsRes, rewardsRes;
      if (!append) {
        [visitsRes, rewardsRes] = await Promise.all([
          visits.getMyVisits(),
          rewards.getMyRedemptions()
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
        }
        
        setVisitsData(filteredVisits);
        setRewardRedemptions(filteredRedemptions);
      }
      
      // Check if there are more pages (only for posts)
      setHasMore(!!postsRes.data.next);
    } catch (err) {
      console.error("Failed to load activity feed", err);
      setError("Could not load activity history.");
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
    
    // Add posts
    posts.forEach(post => {
      const postDate = post.published_at ? new Date(post.published_at) : new Date(post.created_at);
      // Ensure date is valid
      if (!isNaN(postDate.getTime())) {
        items.push({ type: 'post', date: postDate, data: post });
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
    
    // Sort by date (newest first) - ensure proper numeric comparison
    return items.sort((a, b) => {
      const timeA = a.date.getTime();
      const timeB = b.date.getTime();
      return timeB - timeA; // Descending order (newest first)
    });
  }, [posts, visitsData, rewardRedemptions]);

  const timeFilterOptions: { value: TimeFilter; label: string }[] = [
    { value: 'day', label: 'Last Day' },
    { value: 'week', label: 'Last Week' },
    { value: 'month', label: 'Last Month' },
    { value: 'forever', label: 'Forever' },
  ];

  if (loading) {
    return (
      <div className={showTimeFilter ? "grid grid-cols-1 lg:grid-cols-4 gap-6" : ""}>
        {/* Sidebar skeleton */}
        {showTimeFilter && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-4 h-64 animate-pulse shadow-sm border border-gray-100">
              <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Content skeleton */}
        <div className={showTimeFilter ? "lg:col-span-3 space-y-4" : "space-y-4"}>
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 h-48 animate-pulse shadow-sm">
              <div className="flex gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                  <div className="h-3 w-20 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="h-20 bg-gray-200 rounded mb-4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-gray-500 py-8">{error}</div>;
  }

  return (
    <div className={showTimeFilter ? "grid grid-cols-1 lg:grid-cols-4 gap-6" : ""}>
      {/* Left Sidebar - Time Filter */}
      {showTimeFilter && (
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 sticky top-[120px] z-30">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-4">Time Period</h3>
            <div className="space-y-2">
              {timeFilterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeFilter(option.value)}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                    timeFilter === option.value
                      ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                      : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100 hover:border-gray-200'
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
          <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
            <p className="text-gray-500">No recent activity found.</p>
            <p className="text-sm text-gray-400 mt-1">Join a club to see posts here!</p>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-800 px-1">Latest Activity</h3>
            {timelineItems.map((item) => {
              if (item.type === 'post') {
                return <PostCard key={`post-${item.data.id}`} post={item.data as Post} />;
              } else if (item.type === 'reward_redemption') {
                const redemption = item.data as RewardRedemption;
                const redemptionDate = new Date(redemption.redeemed_at);
                const weekday = redemptionDate.toLocaleDateString('en-US', { weekday: 'long' });
                const dateStr = redemptionDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = redemptionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={`reward-${redemption.id}`} className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500 p-6">
                    <div className="flex items-start gap-4">
                      {/* Reward Image/Icon */}
                      <div className="flex-shrink-0">
                        {redemption.reward_image ? (
                          <img 
                            src={getMediaUrl(redemption.reward_image) || ''} 
                            alt={redemption.reward_name} 
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg">
                            🎁
                          </div>
                        )}
                      </div>
                      
                      {/* Reward Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{redemption.reward_name}</h4>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            Redeemed
                          </span>
                        </div>
                        {redemption.reward_description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {redemption.reward_description}
                          </p>
                        )}
                        {redemption.sponsor && (
                          <p className="text-xs text-gray-500 mb-2">
                            Sponsored by: {redemption.sponsor}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          {weekday}, {dateStr} at {timeStr}
                        </p>
                      </div>
                      
                      {/* Gift Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                          <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } else {
                const visit = item.data as Visit;
                const visitDate = new Date(visit.check_in_at);
                const weekday = visitDate.toLocaleDateString('en-US', { weekday: 'long' });
                const dateStr = visitDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = visitDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={`visit-${visit.id}`} className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500 p-6">
                    <div className="flex items-start gap-4">
                      {/* Club Avatar */}
                      <div className="flex-shrink-0">
                        {visit.club_avatar ? (
                          <img 
                            src={getMediaUrl(visit.club_avatar) || ''} 
                            alt={visit.club_name || 'Club'} 
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
                            {(visit.club_name || 'C')[0]}
                          </div>
                        )}
                      </div>
                      
                      {/* Visit Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{visit.club_name || 'Club Visit'}</h4>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            Check-in
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {weekday}, {dateStr} at {timeStr}
                        </p>
                        {visit.check_out_at && (
                          <p className="text-xs text-gray-500">
                            Checked out: {new Date(visit.check_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {!visit.check_out_at && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Active Now
                          </span>
                        )}
                      </div>
                      
                      {/* Scanner Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                          <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h-4v-4H8m13-9v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2m-3-2v2M5 3v2m0 12v2m0-6v2m14-8v2m0 6v2m-4-6h2m-6 0h2" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
            
            {/* Infinite Scroll Trigger */}
            <div ref={observerTarget} className="h-10 flex items-center justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Loading more posts...</span>
                </div>
              )}
              {!hasMore && timelineItems.length > 0 && (
                <div className="text-center pt-4 pb-8 text-sm text-gray-400">
                  End of timeline
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

