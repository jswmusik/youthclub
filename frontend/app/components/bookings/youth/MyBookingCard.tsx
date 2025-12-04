'use client';

import { format } from 'date-fns';
import { Calendar, Clock, MapPin } from 'lucide-react';

interface BookingProps {
  id: number;
  resource_name: string;
  start_time: string;
  end_time: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  club_name?: string; // Derived from resource
  [key: string]: any; // Allow additional properties
}

interface MyBookingCardProps {
  booking: BookingProps;
  onClick?: () => void;
}

export default function MyBookingCard({ booking, onClick }: MyBookingCardProps) {
  const startDate = new Date(booking.start_time);
  const endDate = new Date(booking.end_time);

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
      case 'CANCELLED': return 'bg-gray-100 text-gray-500 border-gray-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3 text-left hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-gray-900">{booking.resource_name}</h4>
          {booking.club_name && (
             <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
               <MapPin className="w-3 h-3" />
               {booking.club_name}
             </div>
          )}
        </div>
        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${getStatusStyle(booking.status)}`}>
          {booking.status}
        </span>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{format(startDate, 'MMM d')}</span>
        </div>
        <div className="w-px h-4 bg-gray-300"></div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>
            {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
          </span>
        </div>
      </div>
    </button>
  );
}

