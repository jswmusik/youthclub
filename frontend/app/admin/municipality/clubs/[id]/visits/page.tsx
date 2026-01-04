'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Users } from 'lucide-react';
import LiveAttendanceList from '@/app/components/visits/LiveAttendanceList';
import VisitsTabs from '@/app/components/visits/VisitsTabs';
import BackButton from '@/app/components/BackButton';

export default function MunicipalityClubVisitsPage() {
  const t = useTranslations('clubVisits');
  const params = useParams();
  const clubId = params?.id as string;
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!clubId) return <div className="p-8 text-gray-400">{t('loading')}</div>;

  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-8 px-0">
      <div className="sm:max-w-7xl sm:mx-auto sm:px-6 space-y-6">
        {/* Back Link */}
        <div className="px-4 sm:px-0">
          <BackButton href={`/admin/municipality/clubs/${clubId}`} label={t('backToClub')} />
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4 sm:px-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-third)] flex items-center justify-center">
                <Users className="w-5 h-5 text-[var(--dark-900)]" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
                <p className="text-[var(--brand-light)]/50 text-sm mt-1">{t('description')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-0">
          <VisitsTabs clubId={clubId} basePath="/admin/municipality/clubs" />
        </div>

        {/* Main Content Area */}
        <div className="px-4 sm:px-0">
          <LiveAttendanceList 
            clubId={clubId} 
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </div>
  );
}

