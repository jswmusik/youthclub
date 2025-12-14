'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ClubFollowersList from '@/app/components/ClubFollowersList';
import { Button } from '@/components/ui/button';

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
      {/* Back Link */}
      <div>
        <Link href={`/admin/municipality/clubs/${clubId}`}>
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back to Club
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Club Followers</h1>
          <p className="text-gray-500 mt-1">View all users who follow this club</p>
        </div>
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

