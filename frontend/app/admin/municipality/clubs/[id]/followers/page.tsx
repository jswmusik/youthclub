'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ClubFollowersList from '@/app/components/ClubFollowersList';

function MunicipalityClubFollowersPageContent() {
  const params = useParams();
  const clubId = params?.id as string;

  if (!clubId) {
    return (
      <div className="p-8">
        <div className="text-red-500">Invalid club ID</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <Link 
          href={`/admin/municipality/clubs/${clubId}`}
          className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Club Details
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Club Followers</h1>
        <p className="text-gray-600 mt-2">View all users who follow this club</p>
      </div>
      <ClubFollowersList clubId={clubId} />
    </div>
  );
}

export default function MunicipalityClubFollowersPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <MunicipalityClubFollowersPageContent />
    </Suspense>
  );
}

