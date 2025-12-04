'use client';

import BookingCalendar from '../../../../components/bookings/admin/BookingCalendar';
import Link from 'next/link';

export default function MuniBookingCalendarPage() {
  return (
    <div className="p-6 h-[calc(100vh-64px)] flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/admin/municipality/bookings" className="text-gray-500 hover:text-gray-900 font-bold">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Municipality Booking Calendar</h1>
      </div>
      
      <div className="flex-1 min-h-0">
        <BookingCalendar scope="MUNICIPALITY" />
      </div>
    </div>
  );
}

