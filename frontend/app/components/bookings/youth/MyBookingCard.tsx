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
  darkMode?: boolean;
}

export default function MyBookingCard({ booking, onClick, darkMode = false }: MyBookingCardProps) {
  const startDate = new Date(booking.start_time);
  const endDate = new Date(booking.end_time);

  const getStatusStyle = (s: string) => {
    if (darkMode) {
      switch (s) {
        case 'APPROVED': return 'bg-[var(--brand-third)]/20 text-[var(--brand-third)] border-[var(--brand-third)]/30';
        case 'REJECTED': return 'bg-[var(--brand-red)]/20 text-[var(--brand-red)] border-[var(--brand-red)]/30';
        case 'CANCELLED': return 'bg-[var(--dark-600)] text-[var(--brand-light)]/50 border-[var(--dark-500)]';
        default: return 'bg-[var(--brand-peach)]/20 text-[var(--brand-peach)] border-[var(--brand-peach)]/30';
      }
    }
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
      className={`w-full p-4 flex flex-col gap-3 text-left transition-all cursor-pointer ${
        darkMode 
          ? 'bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] hover:border-[var(--brand-primary)]/30 hover:bg-[var(--dark-700)]' 
          : 'bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className={`font-bold ${darkMode ? 'text-[var(--brand-light)]' : 'text-gray-900'}`}>{booking.resource_name}</h4>
          {booking.club_name && (
             <div className={`flex items-center gap-1 text-xs mt-1 ${darkMode ? 'text-[var(--brand-light)]/60' : 'text-gray-500'}`}>
               <MapPin className="w-3 h-3" />
               {booking.club_name}
             </div>
          )}
        </div>
        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${getStatusStyle(booking.status)}`}>
          {booking.status}
        </span>
      </div>

      <div className={`flex items-center gap-3 text-sm p-2 rounded-lg ${
        darkMode ? 'bg-[var(--dark-700)] text-[var(--brand-light)]/80' : 'bg-gray-50 text-gray-600'
      }`}>
        <div className="flex items-center gap-1.5">
          <Calendar className={`w-4 h-4 ${darkMode ? 'text-[var(--brand-primary)]' : 'text-gray-400'}`} />
          <span className="font-medium">{format(startDate, 'MMM d')}</span>
        </div>
        <div className={`w-px h-4 ${darkMode ? 'bg-[var(--dark-500)]' : 'bg-gray-300'}`}></div>
        <div className="flex items-center gap-1.5">
          <Clock className={`w-4 h-4 ${darkMode ? 'text-[var(--brand-purple)]' : 'text-gray-400'}`} />
          <span>
            {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
          </span>
        </div>
      </div>
    </button>
  );
}
