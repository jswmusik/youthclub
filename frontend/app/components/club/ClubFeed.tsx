import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Post } from '@/types/post';
import PostCard from '@/app/components/posts/PostCard';

interface ClubFeedProps {
  clubId: number;
}

export default function ClubFeed({ clubId }: ClubFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPosts = async () => {
    try {
      setLoading(true);
      // Calls the new custom endpoint we created in Step 1
      const response = await api.get(`/posts/${clubId}/club_feed/`);
      setPosts(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching club feed:', err);
      setError('Failed to load posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clubId) {
      fetchPosts();
    }
  }, [clubId]);

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
    </div>
  );
}

