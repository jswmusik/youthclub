'use client';

import BookingResourceManager from '../../../../components/bookings/BookingResourceManager';

export default function SuperBookingResourcesPage() {
  return (
    <div className="p-6">
      <BookingResourceManager 
        basePath="/admin/super/bookings/resources" 
        scope="SUPER" 
      />
    </div>
  );
}

