'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchUserActivityFeed, visits, rewards } from '@/lib/api';
import api from '@/lib/api';
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
  data: Post | Visit | RewardRedemption | Booking | Post; // group_join, inventory activities, and questionnaire completions use Post type
};

export default function ActivityFeed({ showTimeFilter = true }: ActivityFeedProps) {
  const router = useRouter();
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
    
    // Add posts (check if it's a group join or inventory activity post)
    posts.forEach(post => {
      const postDate = post.published_at ? new Date(post.published_at) : new Date(post.created_at);
      // Ensure date is valid
      if (!isNaN(postDate.getTime())) {
        // Check if this is a group join post (title starts with "Joined")
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
              if (item.type === 'group_join') {
                const groupPost = item.data as Post;
                // Extract group name from title (format: "Joined {Group Name}")
                const groupName = groupPost.title.replace('Joined ', '');
                const joinDate = item.date;
                const weekday = joinDate.toLocaleDateString('en-US', { weekday: 'long' });
                const dateStr = joinDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = joinDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
                // Extract group image from post images if available
                const groupImage = groupPost.images && groupPost.images.length > 0 
                  ? groupPost.images[0].image 
                  : null;
                
                // Extract group URL from post content (if available)
                const contentMatch = groupPost.content?.match(/href=['"]([^'"]+)['"]/);
                const groupUrl = contentMatch ? contentMatch[1] : null;
                
                return (
                  <div key={`group-join-${groupPost.id}`} className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500 p-6">
                    <div className="flex items-start gap-4">
                      {/* Group Image/Icon */}
                      <div className="flex-shrink-0">
                        {groupImage ? (
                          <img 
                            src={getMediaUrl(groupImage) || ''} 
                            alt={groupName} 
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                            👥
                          </div>
                        )}
                      </div>
                      
                      {/* Group Join Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{groupName}</h4>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Joined
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {weekday}, {dateStr} at {timeStr}
                        </p>
                        {groupUrl && (
                          <button
                            onClick={() => router.push(groupUrl)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 transition-colors"
                          >
                            View Group
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      {/* Group Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } else if (item.type === 'inventory_borrow' || item.type === 'inventory_return' || item.type === 'inventory_complete') {
                const inventoryPost = item.data as Post;
                const isComplete = item.type === 'inventory_complete';
                const isBorrow = item.type === 'inventory_borrow';
                
                // Extract item name from title (format: "Borrowed {Item Name}")
                const itemName = inventoryPost.title.replace('Borrowed ', '').replace('Returned ', '');
                
                // For complete posts, use published_at as borrow date (it's set to borrow_date in backend)
                const actionDate = item.date;
                
                // Try to extract return date from content if it's a complete post
                let returnDateStr: string | null = null;
                if (isComplete && inventoryPost.content) {
                  // Extract return date/time from HTML content
                  // Format: "Returned to {club} on {date} at {time}"
                  const returnMatch = inventoryPost.content.match(/Returned to[^<]*on ([^<]+) at ([^<]+)/);
                  if (returnMatch) {
                    returnDateStr = `${returnMatch[1]} at ${returnMatch[2]}`;
                  }
                }
                const weekday = actionDate.toLocaleDateString('en-US', { weekday: 'long' });
                const dateStr = actionDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = actionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
                // Extract item image from post images if available
                const itemImage = inventoryPost.images && inventoryPost.images.length > 0 
                  ? inventoryPost.images[0].image 
                  : null;
                
                return (
                  <div key={`inventory-${inventoryPost.id}`} className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${isComplete ? 'border-l-blue-500' : (isBorrow ? 'border-l-indigo-500' : 'border-l-green-500')} p-6`}>
                    <div className="flex items-start gap-4">
                      {/* Item Image/Icon */}
                      <div className="flex-shrink-0">
                        {itemImage ? (
                          <img 
                            src={getMediaUrl(itemImage) || ''} 
                            alt={itemName} 
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-full ${isComplete ? 'bg-blue-100' : (isBorrow ? 'bg-indigo-100' : 'bg-green-100')} flex items-center justify-center ${isComplete ? 'text-blue-700' : (isBorrow ? 'text-indigo-700' : 'text-green-700')} font-bold text-lg`}>
                            {isComplete ? '📦✅' : (isBorrow ? '📦' : '✅')}
                          </div>
                        )}
                      </div>
                      
                      {/* Inventory Activity Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{itemName}</h4>
                          {isComplete ? (
                            <>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                Borrowed
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Returned
                              </span>
                            </>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isBorrow ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                              {isBorrow ? 'Borrowed' : 'Returned'}
                            </span>
                          )}
                        </div>
                        {isComplete && returnDateStr ? (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Borrowed:</span> {weekday}, {dateStr} at {timeStr}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Returned:</span> {returnDateStr}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600">
                            {weekday}, {dateStr} at {timeStr}
                          </p>
                        )}
                      </div>
                      
                      {/* Package/Check Icon */}
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full ${isComplete ? 'bg-blue-50' : (isBorrow ? 'bg-indigo-50' : 'bg-green-50')} flex items-center justify-center`}>
                          {isComplete ? (
                            <div className="flex items-center gap-1">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : isBorrow ? (
                            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } else if (item.type === 'questionnaire_complete') {
                const questionnairePost = item.data as Post;
                const questionnaireDate = new Date(questionnairePost.published_at || questionnairePost.created_at);
                const weekday = questionnaireDate.toLocaleDateString('en-US', { weekday: 'long' });
                const dateStr = questionnaireDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = questionnaireDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
                // Extract questionnaire title from post title (format: "Completed Questionnaire: {title}")
                const questionnaireTitle = questionnairePost.title.replace('Completed Questionnaire: ', '');
                
                return (
                  <div key={`questionnaire-${questionnairePost.id}`} className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500 p-6">
                    <div className="flex items-start gap-4">
                      {/* Questionnaire Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                          📋✅
                        </div>
                      </div>
                      
                      {/* Questionnaire Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{questionnaireTitle}</h4>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Completed
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {weekday}, {dateStr} at {timeStr}
                        </p>
                        {/* Show post content if available (includes description and rewards) */}
                        {questionnairePost.content && (
                          <div 
                            className="text-sm text-gray-700 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: questionnairePost.content }}
                          />
                        )}
                      </div>
                      
                      {/* Check Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } else if (item.type === 'post') {
                return <PostCard key={`post-${item.data.id}`} post={item.data as Post} />;
              } else if (item.type === 'booking_confirmed') {
                const booking = item.data as Booking;
                const bookingDate = new Date(booking.start_time);
                const weekday = bookingDate.toLocaleDateString('en-US', { weekday: 'long' });
                const dateStr = bookingDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                const startTimeStr = bookingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const endDate = new Date(booking.end_time);
                const endTimeStr = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={`booking-${booking.id}`} className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500 p-6">
                    <div className="flex items-start gap-4">
                      {/* Calendar Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                          📅
                        </div>
                      </div>
                      
                      {/* Booking Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{booking.resource_name}</h4>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Confirmed
                          </span>
                        </div>
                        {booking.club_name && (
                          <p className="text-sm text-gray-600 mb-1">
                            {booking.club_name}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 mb-2">
                          {weekday}, {dateStr}
                        </p>
                        <p className="text-sm text-gray-600">
                          {startTimeStr} - {endTimeStr}
                        </p>
                        <button
                          onClick={() => router.push('/dashboard/youth/bookings')}
                          className="text-sm text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1 transition-colors mt-2"
                        >
                          View Booking
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Check Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                );
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

