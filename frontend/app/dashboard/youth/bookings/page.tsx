'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../../../lib/api';
import MyBookingCard from '../../../components/bookings/youth/MyBookingCard';
import { Plus } from 'lucide-react';

export default function YouthBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const fetchMyBookings = async () => {
    try {
      const res = await api.get('/bookings/bookings/');
      setBookings(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-gray-900">My Bookings</h1>
        <Link 
          href="/dashboard/youth/bookings/new"
          className="bg-blue-600 text-white p-2 rounded-full shadow-lg active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-500 mb-4">You haven't booked anything yet.</p>
          <Link 
            href="/dashboard/youth/bookings/new"
            className="text-blue-600 font-bold hover:underline"
          >
            Start Booking
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking: any) => (
            <MyBookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}

