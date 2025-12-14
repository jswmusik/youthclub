'use client';

import { useState, useEffect, Suspense } from 'react';
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
      <div className="p-8 text-center">
        <p className="text-gray-500">Loading club details...</p>
      </div>
    );
  }

  return (
    <ClubDetailView 
      clubId={clubId} 
      basePath="/admin/club"
      editPath="/admin/club/settings"
      followersPath="/admin/club/followers"
      visitsPath={null}
      backLabel="Back to Overview"
    />
  );
}

export default function ClubDetailsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <ClubDetailsPageContent />
    </Suspense>
  );
}

