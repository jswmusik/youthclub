'use client';

import { useRef } from 'react';
import BookingCalendar from '../../../../components/bookings/admin/BookingCalendar';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SuperBookingCalendarPage() {
  const calendarRef = useRef<{ openCreateModal: () => void }>(null);

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen">
      {/* Header */}
      <div className="space-y-4">
        {/* Top row: Back button and New Booking button */}
        <div className="flex items-center justify-between">
          <Link href="/admin/super/bookings">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <Button 
            onClick={() => calendarRef.current?.openCreateModal()}
            size="sm" 
            className="gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Booking</span>
          </Button>
        </div>
        
        {/* Title and description */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#121213]">Booking Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage bookings in calendar format.</p>
        </div>
      </div>
      
      <div className="h-[calc(100vh-200px)] min-h-[600px] flex flex-col">
        <BookingCalendar scope="SUPER" ref={calendarRef} />
      </div>
    </div>
  );
}

