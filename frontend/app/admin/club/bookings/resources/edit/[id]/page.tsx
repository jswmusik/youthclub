'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import api from '../../../../../../../lib/api';
import BookingResourceForm from '../../../../../../components/bookings/BookingResourceForm';

export default function EditBookingResourcePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/bookings/resources/${id}/`)
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, [id]);

  if (!data) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
       <BookingResourceForm 
         initialData={data}
         redirectPath="/admin/club/bookings/resources" 
       />
    </div>
  );
}

