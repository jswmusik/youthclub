'use client';

import Link from 'next/link';
import BookingRequestList from '../../../components/bookings/admin/BookingRequestList';
import { Calendar, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SuperBookingsPage() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#121213]">Global Bookings Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage booking requests and resources across all clubs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/super/bookings/resources">
            <Button variant="outline" className="gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50">
              <Package className="h-4 w-4" />
              Manage Resources
            </Button>
          </Link>
          <Link href="/admin/super/bookings/calendar">
            <Button className="gap-2 bg-[#4D4DA4] hover:bg-[#FF5485] text-white rounded-full transition-colors">
              <Calendar className="h-4 w-4" />
              View Calendar
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Action Area with Super Scope */}
      <BookingRequestList scope="SUPER" />
    </div>
  );
}

