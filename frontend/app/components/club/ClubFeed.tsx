import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { Post } from '@/types/post';
import PostCard from '@/app/components/posts/PostCard';

interface ClubFeedProps {
  clubId: number;
}

export default function ClubFeed({ clubId }: ClubFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError('');
      }
      
      // Calls the new custom endpoint we created in Step 1
      const response = await api.get(`/posts/${clubId}/club_feed/?page=${pageNum}`);
      const newPosts = response.data.results || response.data;
      
      if (append) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
      
      // Check if there are more pages
      setHasMore(!!response.data.next);
    } catch (err) {
      console.error('Error fetching club feed:', err);
      setError('Failed to load posts.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [clubId]);

  useEffect(() => {
    if (clubId) {
      // Reset state when clubId changes
      setPage(1);
      setHasMore(true);
      setPosts([]);
      fetchPosts(1, false);
    }
  }, [clubId, fetchPosts]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading && clubId) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPosts(nextPage, true);
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
  }, [hasMore, loadingMore, loading, page, clubId, fetchPosts]);

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Loading updates...</div>;
  }

  if (error) {
    return <div className="py-8 text-center text-red-500">{error}</div>;
  }

  if (posts.length === 0) {
    return (
      <div className="py-12 text-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          No updates from this club yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard 
          key={post.id} 
          post={post}
        />
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
          <p className="text-sm text-gray-400 text-center py-4">
            No more updates
          </p>
        )}
      </div>
    </div>
  );
}

