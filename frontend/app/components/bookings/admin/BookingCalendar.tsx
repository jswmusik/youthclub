'use client';

import { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BookingDetailModal from './BookingDetailModal';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 to 22:00

export default function BookingCalendar({ scope }: { scope?: 'CLUB' | 'MUNICIPALITY' | 'SUPER' }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [bookings, setBookings] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  
  // Filters
  const [clubs, setClubs] = useState<any[]>([]);
  const [selectedClub, setSelectedClub] = useState('');
  const [selectedResource, setSelectedResource] = useState('');

  // 1. Fetch Clubs (if needed)
  useEffect(() => {
    if (scope === 'MUNICIPALITY' || scope === 'SUPER') {
      api.get('/clubs/?page_size=100').then(res => {
        setClubs(Array.isArray(res.data) ? res.data : res.data.results || []);
      });
    }
  }, [scope]);

  // 2. Fetch Resources (Filtered by Club if selected)
  useEffect(() => {
    const fetchResources = async () => {
      try {
        let url = '/bookings/resources/?page_size=100';
        if (selectedClub) url += `&club=${selectedClub}`;
        
        const res = await api.get(url);
        setResources(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (e) { console.error(e); }
    };
    fetchResources();
  }, [selectedClub]); // Re-fetch resources when club changes

  // 3. Fetch Bookings
  useEffect(() => {
    fetchBookings();
  }, [currentWeekStart, selectedResource, selectedClub]);

  const fetchBookings = async () => {
    try {
      const startStr = format(currentWeekStart, 'yyyy-MM-dd');
      const endStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
      
      let url = `/bookings/bookings/?start_date=${startStr}&end_date=${endStr}&page_size=500`;
      
      if (selectedResource) {
          url += `&resource=${selectedResource}`;
      } else if (selectedClub) {
          // If no specific resource picked, but club is picked, filter bookings by club
          url += `&club=${selectedClub}`;
      }
      
      const res = await api.get(url);
      setBookings(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (e) { console.error(e); }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Helper to place booking on grid
  const getPosition = (booking: any) => {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    
    // Calculate top offset (minutes from 8:00)
    const startMinutes = (start.getHours() - 8) * 60 + start.getMinutes();
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    
    return {
      top: `${(startMinutes / 60) * 60}px`, // 60px height per hour
      height: `${(durationMinutes / 60) * 60}px`
    };
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[800px]">
      {/* Toolbar */}
      <div className="p-4 border-b flex flex-wrap gap-4 justify-between items-center bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="flex bg-white rounded-lg border shadow-sm">
            <button onClick={() => setCurrentWeekStart(d => addDays(d, -7))} className="p-2 hover:bg-gray-50"><ChevronLeft className="w-5 h-5"/></button>
            <div className="px-4 py-2 font-bold text-gray-700 min-w-[200px] text-center">
              {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
            </div>
            <button onClick={() => setCurrentWeekStart(d => addDays(d, 7))} className="p-2 hover:bg-gray-50"><ChevronRight className="w-5 h-5"/></button>
          </div>
          <button onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="text-sm text-blue-600 font-bold hover:underline">
            Today
          </button>
        </div>

        <div className="flex gap-2">
            {(scope === 'MUNICIPALITY' || scope === 'SUPER') && (
                <select 
                    className="border rounded p-2 text-sm min-w-[150px]"
                    value={selectedClub}
                    onChange={e => {
                        setSelectedClub(e.target.value);
                        setSelectedResource(''); // Reset resource when club changes
                    }}
                >
                    <option value="">All Clubs</option>
                    {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            )}

            <select 
            className="border rounded p-2 text-sm min-w-[200px]"
            value={selectedResource}
            onChange={e => setSelectedResource(e.target.value)}
            >
            <option value="">All Resources</option>
            {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto flex">
        {/* Time Column */}
        <div className="w-16 border-r flex-shrink-0 bg-gray-50 pt-10">
          {HOURS.map(h => (
            <div key={h} className="h-[60px] text-right pr-2 text-xs text-gray-400 -mt-2">
              {h}:00
            </div>
          ))}
        </div>

        {/* Days Columns */}
        <div className="flex-1 flex min-w-[800px]">
          {weekDays.map(day => (
            <div key={day.toString()} className="flex-1 border-r min-w-[120px] relative bg-white">
              {/* Header */}
              <div className={`h-10 border-b flex items-center justify-center font-bold text-sm ${isSameDay(day, new Date()) ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-700'}`}>
                {format(day, 'EEE d')}
              </div>
              
              {/* Grid Lines */}
              <div className="relative h-[900px]"> 
                {HOURS.map(h => (
                  <div key={h} className="h-[60px] border-b border-gray-50"></div>
                ))}

                {/* Events */}
                {bookings
                  .filter(b => isSameDay(parseISO(b.start_time), day))
                  .map(b => {
                    const style = getPosition(b);
                    return (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBooking(b)}
                        style={{ top: style.top, height: style.height }}
                        className={`absolute left-1 right-1 rounded border text-xs p-1 text-left overflow-hidden transition-all hover:z-10 hover:shadow-md
                          ${b.status === 'APPROVED' ? 'bg-green-100 border-green-200 text-green-800' : 
                            b.status === 'PENDING' ? 'bg-yellow-100 border-yellow-200 text-yellow-800' : 'bg-gray-100 text-gray-500'}
                        `}
                      >
                        <div className="font-bold truncate">{b.user_detail?.first_name}</div>
                        <div className="truncate opacity-75">{b.resource_name}</div>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedBooking && (
        <BookingDetailModal 
          booking={selectedBooking} 
          onClose={() => setSelectedBooking(null)}
          onUpdate={fetchBookings}
        />
      )}
    </div>
  );
}

