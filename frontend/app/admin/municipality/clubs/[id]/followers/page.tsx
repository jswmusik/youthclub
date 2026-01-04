'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Users } from 'lucide-react';
import ClubFollowersList from '@/app/components/ClubFollowersList';
import BackButton from '@/app/components/BackButton';

function MunicipalityClubFollowersPageContent() {
  const t = useTranslations('clubFollowers');
  const params = useParams();
  const clubId = params?.id as string;

  if (!clubId) {
    return (
      <div className="p-8">
        <div className="text-red-500">{t('invalidClubId') || 'Invalid club ID'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8 px-0">
      <div className="sm:max-w-7xl sm:mx-auto sm:px-6 space-y-6">
        {/* Back Link */}
        <div className="px-4 sm:px-0">
          <BackButton href={`/admin/municipality/clubs/${clubId}`} label={t('backToClub') || 'Back to Club'} />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center">
                <Users className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title') || 'Club Followers'}</h1>
                <p className="text-[var(--brand-light)]/50 text-sm mt-1">{t('description') || 'View all users who follow this club'}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-0">
          <ClubFollowersList clubId={clubId} />
        </div>
      </div>
    </div>
  );
}

export default function MunicipalityClubFollowersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--dark-900)] p-8 flex items-center justify-center"><div className="text-[var(--brand-light)]/60">Loading...</div></div>}>
      <MunicipalityClubFollowersPageContent />
    </Suspense>
  );
}

