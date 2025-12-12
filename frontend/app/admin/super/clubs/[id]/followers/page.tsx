'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ClubFollowersList from '@/app/components/ClubFollowersList';
import { Button } from '@/components/ui/button';

function SuperAdminClubFollowersPageContent() {
  const params = useParams();
  const clubId = params?.id as string;

  if (!clubId) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-red-500">Invalid club ID</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4 md:space-y-6">
      <div>
        <Link href={`/admin/super/clubs/${clubId}`}>
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Club Details
          </Button>
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#121213]">Club Followers</h1>
        <p className="text-sm md:text-base text-gray-500 mt-1">View all users who follow this club</p>
      </div>
      <ClubFollowersList clubId={clubId} />
    </div>
  );
}

export default function SuperAdminClubFollowersPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <SuperAdminClubFollowersPageContent />
    </Suspense>
  );
}

