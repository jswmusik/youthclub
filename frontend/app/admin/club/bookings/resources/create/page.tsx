'use client';

import BookingResourceForm from '../../../../../components/bookings/BookingResourceForm';
import { useAuth } from '../../../../../../context/AuthContext';

export default function CreateBookingResourcePage() {
  const { user } = useAuth();
  
  // Safe club ID extraction
  const clubId = typeof user?.assigned_club === 'object' ? user.assigned_club.id : user?.assigned_club;

  if (!clubId) return <div>Error: You are not assigned to a club.</div>;

  return (
    <div className="p-6">
       <BookingResourceForm 
         redirectPath="/admin/club/bookings/resources" 
         clubId={clubId}
       />
    </div>
  );
}

