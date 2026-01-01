'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { ExternalLink, UserPlus, Users } from 'lucide-react';
import LiveAttendanceList from '@/app/components/visits/LiveAttendanceList';
import ManualCheckInModal from '@/app/components/visits/ManualCheckInModal';
import VisitsTabs from '@/app/components/visits/VisitsTabs';
import BackButton from '@/app/components/BackButton';

export default function VisitsDashboard() {
  const t = useTranslations('clubVisits');
  const { user } = useAuth();
  const [isManualModalOpen, setManualModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Extract club ID from user
  const assignedClub = user?.assigned_club;
  const clubId = typeof assignedClub === 'object' && assignedClub !== null 
    ? String((assignedClub as any).id)
    : typeof assignedClub === 'number' 
    ? String(assignedClub)
    : null;

  // If user is not loaded or not a club admin, handle accordingly
  if (!clubId) {
    return (
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center p-4">
        <div className="flex flex-col items-center text-[var(--brand-light)]/50">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mb-4 animate-pulse">
            <Users className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg font-medium">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-6 md:py-8 px-0">
      <div className="max-w-7xl mx-auto space-y-6 px-0 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div>
          <BackButton href="/admin/club/details" translationKey="clubVisits.backToClub" />
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">{t('title')}</h1>
            </div>
            <p className="text-[var(--brand-light)]/50 text-sm pl-[52px]">{t('description')}</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Button to open the Kiosk in a new tab */}
            <Link 
              href="/admin/club/visits/kiosk" 
              target="_blank"
            >
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--dark-700)] border border-[var(--dark-500)] text-[var(--brand-light)]/70 hover:text-[var(--brand-light)] hover:border-[var(--brand-primary)]/30 transition-all text-sm font-medium">
                <ExternalLink className="h-4 w-4" /> 
                <span className="hidden sm:inline">{t('launchKiosk')}</span>
                <span className="sm:hidden">{t('kiosk')}</span>
              </button>
            </Link>
            
            {/* Button for Manual Entry */}
            <button 
              onClick={() => setManualModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-[var(--dark-900)] font-bold transition-all"
            >
              <UserPlus className="h-4 w-4" /> 
              <span className="hidden sm:inline">{t('manualCheckIn')}</span>
              <span className="sm:hidden">{t('checkIn')}</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <VisitsTabs 
          clubId={clubId} 
          basePath="/admin/club"
          liveHref="/admin/club/visits"
          historyHref="/admin/club/visits/history"
          analyticsHref="/admin/club/visits/analytics"
        />

        {/* Main Content Area */}
        <LiveAttendanceList 
          clubId={clubId} 
          refreshTrigger={refreshTrigger}
        />

        {/* Modals */}
        <ManualCheckInModal 
          isOpen={isManualModalOpen} 
          onClose={() => setManualModalOpen(false)}
          onSuccess={refreshData}
          clubId={clubId}
        />
      </div>
    </div>
  );
}
