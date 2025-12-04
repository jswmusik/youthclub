'use client';

import BookingResourceManager from '../../../../components/bookings/BookingResourceManager';

export default function ClubBookingResourcesPage() {
  return (
    <div className="p-6">
      <BookingResourceManager basePath="/admin/club/bookings/resources" scope="CLUB" />
    </div>
  );
}

