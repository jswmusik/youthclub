'use client';

import { Suspense } from 'react';
import { Newspaper } from 'lucide-react';
import NewsFeed from '../../../components/NewsFeed';

function NewsFeedContent() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      {/* Header */}
      <div className="bg-[var(--dark-800)] border-b border-[var(--dark-600)]">
        <div className="sm:max-w-6xl sm:mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
              <Newspaper className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">News Feed</h1>
              <p className="text-sm text-[var(--brand-light)]/50 mt-0.5">Latest updates and featured stories</p>
            </div>
          </div>
        </div>
      </div>
      
      <NewsFeed basePath="/admin/club/news-feed" />
    </div>
  );
}

export default function ClubAdminNewsFeed() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Newspaper className="w-8 h-8 text-white" />
          </div>
          <div className="w-8 h-8 border-3 border-[var(--dark-600)] border-t-[var(--brand-primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--brand-light)]/60">Loading news feed...</p>
        </div>
      </div>
    }>
      <NewsFeedContent />
    </Suspense>
  );
}

