import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { Post } from '@/types/post';
import PostCard from '@/app/components/posts/PostCard';

interface ClubFeedProps {
  clubId: number;
  darkMode?: boolean;
  basePath?: 'youth' | 'guardian';
}

export default function ClubFeed({ clubId, darkMode = false, basePath }: ClubFeedProps) {
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
    return (
      <div className={`py-8 text-center ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
        <div className={`w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-3 ${
          darkMode 
            ? 'border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)]' 
            : 'border-blue-600/20 border-t-blue-600'
        }`} />
        Loading updates...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`py-8 text-center ${darkMode ? 'text-[var(--brand-red)]' : 'text-red-500'}`}>
        {error}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={`py-12 text-center rounded-none sm:rounded-xl border-y sm:border mx-0 ${
        darkMode 
          ? 'bg-[var(--dark-800)] border-[var(--dark-600)]' 
          : 'bg-white shadow-sm border-[#4D4DA4]/10'
      }`}>
        <p className={`text-lg ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
          No updates from this club yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0 sm:space-y-4">
      {posts.map((post) => (
        <PostCard 
          key={post.id} 
          post={post}
          darkMode={darkMode}
          basePath={basePath}
        />
      ))}
      
      {/* Infinite Scroll Trigger */}
      <div ref={observerTarget} className="h-10 flex items-center justify-center">
        {loadingMore && (
          <div className={`flex items-center gap-2 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
            <div className={`animate-spin rounded-full h-5 w-5 border-b-2 ${
              darkMode ? 'border-[var(--brand-primary)]' : 'border-blue-600'
            }`}></div>
            <span className="text-sm">Loading more posts...</span>
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className={`text-sm text-center py-4 ${darkMode ? 'text-[var(--brand-light)]/40' : 'text-gray-400'}`}>
            No more updates
          </p>
        )}
      </div>
    </div>
  );
}
