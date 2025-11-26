'use client';

import NewsFeed from '../../../components/NewsFeed';

export default function SuperAdminNewsFeed() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">News Feed</h1>
        <p className="text-gray-500">Latest updates and featured stories.</p>
      </div>
      
      {/* We simply render the component here */}
      <NewsFeed basePath="/admin/super/news-feed" />
    </div>
  );
}