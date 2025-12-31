'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import ScheduleEditor from '../../../../../../components/bookings/ScheduleEditor';
import BackButton from '@/app/components/BackButton';

function SchedulePageContent() {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-[var(--dark-900)] py-4 sm:py-6 md:py-8 px-0">
      {/* Header */}
      <div className="space-y-4 px-4 sm:px-6 mb-6">
        {/* Back button */}
        <BackButton href="/admin/municipality/bookings/resources" label="Back to Resources" />
        
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-light)]">Manage Schedule</h1>
            <p className="text-[var(--brand-light)]/50 text-sm">Define when this resource is available for booking.</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6">
        <ScheduleEditor resourceId={Number(id)} />
      </div>
    </div>
  );
}

export default function MuniResourceSchedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] animate-pulse">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <p className="text-[var(--brand-light)]/60">Loading schedule...</p>
        </div>
      </div>
    }>
      <SchedulePageContent />
    </Suspense>
  );
}
