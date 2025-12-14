'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import LiveAttendanceList from '@/app/components/visits/LiveAttendanceList';
import VisitsTabs from '@/app/components/visits/VisitsTabs';
import { Button } from '@/components/ui/button';

export default function SuperClubVisitsPage() {
  const params = useParams();
  const clubId = params?.id as string;
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!clubId) return <div className="p-8 text-gray-400">Loading...</div>;

  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Back Link */}
      <div>
        <Link href={`/admin/super/clubs/${clubId}`}>
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back to Club
          </Button>
        </Link>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Visits & Attendance</h1>
          <p className="text-gray-500 mt-1">View check-ins for this club</p>
        </div>
      </div>

      {/* Tabs */}
      <VisitsTabs clubId={clubId} basePath="/admin/super/clubs" />

      {/* Main Content Area */}
      <LiveAttendanceList 
        clubId={clubId} 
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}

