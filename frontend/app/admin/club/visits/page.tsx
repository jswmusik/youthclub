'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, UserPlus } from 'lucide-react';
import LiveAttendanceList from '@/app/components/visits/LiveAttendanceList';
import ManualCheckInModal from '@/app/components/visits/ManualCheckInModal';
import VisitsTabs from '@/app/components/visits/VisitsTabs';
import { Button } from '@/components/ui/button';

export default function VisitsDashboard() {
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
  if (!clubId) return <div className="p-8 text-gray-400">Loading...</div>;

  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Back Link */}
      <div>
        <Link href="/admin/club/details">
          <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Back to Club
          </Button>
        </Link>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Visits & Attendance</h1>
          <p className="text-gray-500 mt-1">Manage check-ins for your club</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Button to open the Kiosk in a new tab */}
          <Link 
            href="/admin/club/visits/kiosk" 
            target="_blank"
          >
            <Button variant="outline" size="sm" className="gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50">
              <ExternalLink className="h-4 w-4" /> Launch Kiosk Screen
            </Button>
          </Link>
          
          {/* Button for Manual Entry */}
          <Button 
            onClick={() => setManualModalOpen(true)}
            size="sm"
            className="gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors"
          >
            <UserPlus className="h-4 w-4" /> Manual Check-in
          </Button>
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
      />
    </div>
  );
}