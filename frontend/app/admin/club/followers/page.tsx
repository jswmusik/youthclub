'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import ClubFollowersList from '@/app/components/ClubFollowersList';
import api from '@/lib/api';
import BackButton from '@/app/components/BackButton';

function ClubFollowersPageContent() {
  const t = useTranslations('clubFollowers');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');
  const { user, loading } = useAuth();
  const [clubName, setClubName] = useState<string>('');

  // For Club Admin, use assigned_club (the club they manage)
  // Fallback to preferred_club if assigned_club is not available
  const clubId = (user?.assigned_club as any)?.id || (typeof user?.assigned_club === 'number' ? user.assigned_club : null) || (user?.preferred_club as any)?.id || (typeof user?.preferred_club === 'number' ? user.preferred_club : null);

  useEffect(() => {
    if (clubId) {
      api.get(`/clubs/${clubId}/`).then(res => {
        setClubName(res.data.name || t('yourClub'));
      }).catch(() => {});
    }
  }, [clubId, t]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
            <Users className="w-6 h-6 text-[var(--dark-900)]" />
          </div>
          <span className="text-[var(--brand-light)]/60 animate-pulse">{tCommon('loading')}</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--brand-red)]/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-[var(--brand-red)]" />
          </div>
          <p className="text-[var(--brand-red)]">{t('notAuthenticated')}</p>
        </div>
      </div>
    );
  }

  if (!clubId) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--brand-red)]/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-[var(--brand-red)]" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-[var(--brand-light)] mb-2">{t('noClubAssigned')}</h2>
            <p className="text-[var(--brand-light)]/60">
              {t('noClubAssignedDescription')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 sm:py-8 px-0 space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-0">
        <BackButton href="/admin/club/details" label={t('backToClubDashboard')} />
      </div>

      {/* Hero Card */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
        {/* Header Banner */}
        <div className="relative h-24 sm:h-32 bg-gradient-to-br from-[var(--brand-primary)]/30 via-[var(--dark-700)] to-[var(--brand-purple)]/20">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
            <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full bg-[var(--brand-purple)]/20 blur-2xl" />
          </div>
        </div>
        
        {/* Title Section */}
        <div className="relative z-10 px-4 sm:px-6 pb-6 -mt-10 sm:-mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            <div className="relative z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-[var(--dark-800)] shadow-xl bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--dark-900)]" />
            </div>
            <div className="flex-1 space-y-1 pt-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
              <div className="flex items-center gap-2 text-[var(--brand-light)]/50 text-sm">
                <Building2 className="h-4 w-4" />
                <span>{t('usersFollowing', { clubName: clubName || t('yourClub') })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Followers List */}
      <ClubFollowersList clubId={clubId} />
    </div>
  );
}

function LoadingFallback() {
  const t = useTranslations('clubFollowers');
  return (
    <div className="py-20 text-center">
      <div className="inline-flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[var(--brand-primary)] flex items-center justify-center animate-pulse">
          <Users className="w-6 h-6 text-[var(--dark-900)]" />
        </div>
        <span className="text-[var(--brand-light)]/60 animate-pulse">{t('loadingFollowers')}</span>
      </div>
    </div>
  );
}

export default function ClubAdminFollowersPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ClubFollowersPageContent />
    </Suspense>
  );
}

