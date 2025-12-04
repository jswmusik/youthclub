'use client';

import BookingResourceForm from '../../../../../components/bookings/BookingResourceForm';

export default function CreateMuniBookingResourcePage() {
  // We do NOT pass clubId here. The Form will detect this and show a dropdown
  // populated with clubs belonging to this municipality.
  return (
    <div className="p-6">
       <BookingResourceForm 
         redirectPath="/admin/municipality/bookings/resources" 
       />
    </div>
  );
}

