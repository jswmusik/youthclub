'use client';

import { useState, useEffect, Suspense } from 'react';
import { Building2 } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import ClubDetailView from '../../../components/ClubDetailView';

function ClubDetailsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const [clubId, setClubId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      // Get club ID from user's assigned_club or preferred_club
      const id = (user?.assigned_club as any)?.id || 
                 (typeof user?.assigned_club === 'number' ? String(user.assigned_club) : null) || 
                 (user?.preferred_club as any)?.id || 
                 (typeof user?.preferred_club === 'number' ? String(user.preferred_club) : null);
      setClubId(id);
    }
  }, [user, authLoading]);

  if (authLoading || !clubId) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-[var(--brand-light)]/60 animate-pulse">Loading club details...</span>
        </div>
      </div>
    );
  }

  return (
    <ClubDetailView 
      clubId={clubId} 
      basePath="/admin/club"
      editPath="/admin/club/settings"
      followersPath="/admin/club/followers"
      visitsPath="/admin/club/visits"
      backLabel="Back to Overview"
    />
  );
}

export default function ClubDetailsPage() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-[var(--brand-light)]/60 animate-pulse">Loading...</span>
        </div>
      </div>
    }>
      <ClubDetailsPageContent />
    </Suspense>
  );
}

