'use client';

import BookingResourceForm from '../../../../../components/bookings/BookingResourceForm';

export default function CreateSuperBookingResourcePage() {
  return (
    <div className="p-6">
       <BookingResourceForm redirectPath="/admin/super/bookings/resources" />
    </div>
  );
}

