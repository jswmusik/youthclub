'use client';

import { Suspense } from 'react';
import BookingResourceManager from '../../../../components/bookings/BookingResourceManager';
import { Building } from 'lucide-react';

function SuperBookingResourcesPageContent() {
  return (
    <BookingResourceManager 
      basePath="/admin/super/bookings/resources" 
      scope="SUPER" 
    />
  );
}

export default function SuperBookingResourcesPage() {
  return (
    <div className="min-h-screen bg-[var(--dark-900)]">
      <Suspense fallback={
        <div className="min-h-screen bg-[var(--dark-900)] flex flex-col justify-center items-center py-20 gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center animate-pulse">
            <Building className="w-6 h-6 text-white" />
          </div>
          <div className="text-[var(--brand-light)]/60 animate-pulse">Loading resources...</div>
        </div>
      }>
        <SuperBookingResourcesPageContent />
      </Suspense>
    </div>
  );
}
