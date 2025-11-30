'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { fetchUserActivityFeed } from '@/lib/api';
import PostCard from '@/app/components/posts/PostCard';
import { Post } from '@/types/post';

export default function ActivityFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFeed(1, false);
  }, []);

  const loadFeed = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError('');
      }
      
      const res = await fetchUserActivityFeed(pageNum);
      // Handle pagination results vs flat list
      const newPosts = res.data.results ? res.data.results : res.data;
      
      if (append) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
      
      // Check if there are more pages
      setHasMore(!!res.data.next);
    } catch (err) {
      console.error("Failed to load activity feed", err);
      setError("Could not load activity history.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

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

  if (loading) {
    return (
      <div className="space-y-4">
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
    );
  }

  if (error) {
    return <div className="text-center text-gray-500 py-8">{error}</div>;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
        <p className="text-gray-500">No recent activity found.</p>
        <p className="text-sm text-gray-400 mt-1">Join a club to see posts here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-800 px-1">Latest Activity</h3>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
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
          <div className="text-center pt-4 pb-8 text-sm text-gray-400">
            End of timeline
          </div>
        )}
      </div>
    </div>
  );
}

