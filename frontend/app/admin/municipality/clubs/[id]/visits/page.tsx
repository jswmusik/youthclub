'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LiveAttendanceList from '@/app/components/visits/LiveAttendanceList';

export default function MunicipalityClubVisitsPage() {
  const params = useParams();
  const clubId = params?.id as string;
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!clubId) return <div className="p-8">Loading...</div>;

  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Back Link */}
      <div className="mb-6">
        <Link 
          href={`/admin/municipality/clubs/${clubId}`}
          className="text-purple-600 hover:text-purple-800 font-medium inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Club
        </Link>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visits & Attendance</h1>
          <p className="text-slate-500">View check-ins for this club</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-8">
          <button className="border-b-2 border-emerald-500 pb-4 px-1 text-sm font-medium text-emerald-600">
            Live Attendance
          </button>
          <Link 
            href={`/admin/municipality/clubs/${clubId}/visits/history`}
            className="border-b-2 border-transparent pb-4 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300"
          >
            History Log
          </Link>
          <Link 
            href={`/admin/municipality/clubs/${clubId}/visits/analytics`}
            className="border-b-2 border-transparent pb-4 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300"
          >
            Analytics
          </Link>
        </nav>
      </div>

      {/* Main Content Area */}
      <LiveAttendanceList 
        clubId={clubId} 
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}

