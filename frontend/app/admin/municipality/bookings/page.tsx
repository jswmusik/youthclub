'use client';

import Link from 'next/link';
import BookingRequestList from '../../../../components/bookings/admin/BookingRequestList';
import { Calendar } from 'lucide-react';

export default function MuniBookingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Bookings Dashboard</h1>
        <div className="flex gap-3">
          <Link href="/admin/municipality/bookings/resources" className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-50">
            Manage Resources
          </Link>
          <Link href="/admin/municipality/bookings/calendar" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> View Calendar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Main Action Area with Municipality Scope */}
          <BookingRequestList scope="MUNICIPALITY" />
        </div>
        
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
            <h4 className="font-bold text-blue-900 mb-2">Municipality Overview</h4>
            <p className="text-sm text-blue-800">
              You can see booking requests across all clubs in your municipality. Use the filter to focus on a specific location.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

