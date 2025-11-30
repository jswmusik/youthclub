'use client';

import { useEffect, useState } from 'react';
import { fetchUserActivityFeed } from '@/lib/api';
import PostCard from '@/app/components/posts/PostCard';
import { Post } from '@/types/post';

export default function ActivityFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      setLoading(true);
      const res = await fetchUserActivityFeed();
      // Handle pagination results vs flat list
      const data = res.data.results ? res.data.results : res.data;
      setPosts(data);
    } catch (err) {
      console.error("Failed to load activity feed", err);
      setError("Could not load activity history.");
    } finally {
      setLoading(false);
    }
  };

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
      
      <div className="text-center pt-4 pb-8 text-sm text-gray-400">
        End of timeline
      </div>
    </div>
  );
}

