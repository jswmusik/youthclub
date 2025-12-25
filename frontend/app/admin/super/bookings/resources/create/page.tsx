'use client';

import { Suspense } from 'react';
import BookingResourceForm from '../../../../../components/bookings/BookingResourceForm';
import { Package } from 'lucide-react';

function BookingResourceCreatePageContent() {
  return <BookingResourceForm redirectPath="/admin/super/bookings/resources" />;
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="bg-[var(--dark-900)] min-h-screen flex items-center justify-center p-4 sm:p-8">
        <div className="flex flex-col items-center text-[var(--brand-light)]/50">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-purple)] flex items-center justify-center mb-4 animate-pulse">
            <Package className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg font-medium">Loading Resource Form...</p>
        </div>
      </div>
    }>
      <BookingResourceCreatePageContent />
    </Suspense>
  );
}

