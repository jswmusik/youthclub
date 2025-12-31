'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LiveAttendanceList from '@/app/components/visits/LiveAttendanceList';
import VisitsTabs from '@/app/components/visits/VisitsTabs';
import BackButton from '@/app/components/BackButton';

export default function MunicipalityClubVisitsPage() {
  const params = useParams();
  const clubId = params?.id as string;
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!clubId) return <div className="p-8 text-gray-400">Loading...</div>;

  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Back Link */}
      <div>
        <BackButton href={`/admin/municipality/clubs/${clubId}`} label="Back to Club" />
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Visits & Attendance</h1>
          <p className="text-gray-500 mt-1">View check-ins for this club</p>
        </div>
      </div>

      {/* Tabs */}
      <VisitsTabs clubId={clubId} basePath="/admin/municipality/clubs" />

      {/* Main Content Area */}
      <LiveAttendanceList 
        clubId={clubId} 
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}

