'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import LiveAttendanceList from '@/app/components/visits/LiveAttendanceList';
import ManualCheckInModal from '@/app/components/visits/ManualCheckInModal';

export default function VisitsDashboard() {
  const { user } = useAuth();
  const [isManualModalOpen, setManualModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Extract club ID from user
  const assignedClub = user?.assigned_club;
  const clubId = typeof assignedClub === 'object' && assignedClub !== null 
    ? (assignedClub as any).id 
    : typeof assignedClub === 'number' 
    ? assignedClub 
    : null;

  // If user is not loaded or not a club admin, handle accordingly
  // (Assuming your layout handles auth redirect, but good to be safe)
  if (!clubId) return <div className="p-8">Loading or Unauthorized...</div>;

  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visits & Attendance</h1>
          <p className="text-slate-500">Manage check-ins for your club</p>
        </div>
        
        <div className="flex space-x-3">
          {/* Button to open the Kiosk in a new tab */}
          <Link 
            href="/admin/club/visits/kiosk" 
            target="_blank"
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center shadow-sm"
          >
            Launch Kiosk Screen ↗
          </Link>
          
          {/* Button for Manual Entry */}
          <button 
            onClick={() => setManualModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
          >
            + Manual Check-in
          </button>
        </div>
      </div>

      {/* Tabs (For future expansion: History, Stats, etc) */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-8">
          <button className="border-b-2 border-emerald-500 pb-4 px-1 text-sm font-medium text-emerald-600">
            Live Attendance
          </button>
          <Link 
            href="/admin/club/visits/history"
            className="border-b-2 border-transparent pb-4 px-1 text-sm font-medium text-slate-500 hover:text-slate-700 hover:border-slate-300"
          >
            History Log
          </Link>
          <Link 
            href="/admin/club/visits/analytics"
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

      {/* Modals */}
      <ManualCheckInModal 
        isOpen={isManualModalOpen} 
        onClose={() => setManualModalOpen(false)}
        onSuccess={refreshData}
      />
    </div>
  );
}