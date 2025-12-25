'use client';

import { Suspense, useRef } from 'react';
import BookingCalendar from '../../../../components/bookings/admin/BookingCalendar';
import Link from 'next/link';
import { ArrowLeft, Plus, CalendarDays } from 'lucide-react';

function SuperBookingCalendarPageContent() {
  const calendarRef = useRef<{ openCreateModal: () => void }>(null);

  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <div className="py-4 sm:py-6 px-0 sm:px-4 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="px-4 sm:px-0 space-y-4">
          {/* Top row: Back button and New Booking button */}
          <div className="flex items-center justify-between">
            <Link href="/admin/super/bookings">
              <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--brand-light)]/60 hover:text-[var(--brand-light)] bg-[var(--dark-700)] hover:bg-[var(--dark-600)] rounded-xl transition-colors">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </button>
            </Link>
            <button 
              onClick={() => calendarRef.current?.openCreateModal()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[var(--dark-900)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 rounded-xl transition-colors shadow-lg shadow-[var(--brand-primary)]/20"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Booking</span>
            </button>
          </div>
          
          {/* Title and description */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--brand-light)]">Booking Calendar</h1>
              <p className="text-sm text-[var(--brand-light)]/50 mt-0.5">View and manage bookings in calendar format</p>
            </div>
          </div>
        </div>
        
        <div className="h-[calc(100vh-200px)] min-h-[600px] flex flex-col">
          <BookingCalendar scope="SUPER" ref={calendarRef} />
        </div>
      </div>
    </div>
  );
}

export default function SuperBookingCalendarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
          <CalendarDays className="w-6 h-6 text-white" />
        </div>
        <div className="text-[var(--brand-light)]/60 animate-pulse">Loading calendar...</div>
      </div>
    }>
      <SuperBookingCalendarPageContent />
    </Suspense>
  );
}
