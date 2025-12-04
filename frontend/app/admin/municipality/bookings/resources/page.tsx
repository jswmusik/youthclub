'use client';

import BookingResourceManager from '../../../../components/bookings/BookingResourceManager';

export default function MuniBookingResourcesPage() {
  return (
    <div className="p-6">
      <BookingResourceManager 
        basePath="/admin/municipality/bookings/resources" 
        scope="MUNICIPALITY" 
      />
    </div>
  );
}

