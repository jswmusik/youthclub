'use client';

import Link from 'next/link';
import BookingRequestList from '../../../components/bookings/admin/BookingRequestList';
import { Calendar } from 'lucide-react';

export default function ClubBookingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Bookings Dashboard</h1>
        <div className="flex gap-3">
          <Link href="/admin/club/bookings/resources" className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50">
            Manage Resources
          </Link>
          <Link href="/admin/club/bookings/calendar" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> View Calendar
          </Link>
        </div>
      </div>

      {/* Main Action Area */}
      <BookingRequestList scope="CLUB" />
    </div>
  );
}

