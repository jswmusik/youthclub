'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ClubFollowersList from '@/app/components/ClubFollowersList';

function ClubFollowersPageContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="text-red-500">Not authenticated. Please log in.</div>
      </div>
    );
  }

  // For Club Admin, use assigned_club (the club they manage)
  // Fallback to preferred_club if assigned_club is not available
  const clubId = (user.assigned_club as any)?.id || (typeof user.assigned_club === 'number' ? user.assigned_club : null) || (user.preferred_club as any)?.id || (typeof user.preferred_club === 'number' ? user.preferred_club : null);

  if (!clubId) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-yellow-800 mb-2">No Club Assigned</h2>
          <p className="text-yellow-700">
            You don't have a club assigned. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <Link 
          href="/admin/club"
          className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Club Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Club Followers</h1>
        <p className="text-gray-600 mt-2">View all users who follow your club</p>
      </div>
      <ClubFollowersList clubId={clubId} />
    </div>
  );
}

export default function ClubAdminFollowersPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <ClubFollowersPageContent />
    </Suspense>
  );
}

