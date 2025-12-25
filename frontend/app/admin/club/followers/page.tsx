'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Building2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ClubFollowersList from '@/app/components/ClubFollowersList';
import api from '@/lib/api';

function ClubFollowersPageContent() {
  const { user, loading } = useAuth();
  const [clubName, setClubName] = useState<string>('');

  // For Club Admin, use assigned_club (the club they manage)
  // Fallback to preferred_club if assigned_club is not available
  const clubId = (user?.assigned_club as any)?.id || (typeof user?.assigned_club === 'number' ? user.assigned_club : null) || (user?.preferred_club as any)?.id || (typeof user?.preferred_club === 'number' ? user.preferred_club : null);

  useEffect(() => {
    if (clubId) {
      api.get(`/clubs/${clubId}/`).then(res => {
        setClubName(res.data.name || 'Club');
      }).catch(() => {});
    }
  }, [clubId]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
            <Users className="w-6 h-6 text-white" />
          </div>
          <span className="text-[var(--brand-light)]/60 animate-pulse">Loading...</span>
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
          <p className="text-[var(--brand-red)]">Not authenticated. Please log in.</p>
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
            <h2 className="text-lg font-bold text-[var(--brand-light)] mb-2">No Club Assigned</h2>
            <p className="text-[var(--brand-light)]/60">
              You don't have a club assigned. Please contact your administrator.
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
        <Link 
          href="/admin/club"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/60 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Club Dashboard
        </Link>
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
            <div className="relative z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-[var(--dark-800)] shadow-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center flex-shrink-0">
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div className="flex-1 space-y-1 pt-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Club Followers</h1>
              <div className="flex items-center gap-2 text-[var(--brand-light)]/50 text-sm">
                <Building2 className="h-4 w-4" />
                <span>Users following {clubName || 'your club'}</span>
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

export default function ClubAdminFollowersPage() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
            <Users className="w-6 h-6 text-white" />
          </div>
          <span className="text-[var(--brand-light)]/60 animate-pulse">Loading followers...</span>
        </div>
      </div>
    }>
      <ClubFollowersPageContent />
    </Suspense>
  );
}

