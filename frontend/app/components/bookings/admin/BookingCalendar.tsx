'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import BookingDetailModal from './BookingDetailModal';
import AdminCreateBookingModal from './AdminCreateBookingModal';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 to 22:00

export default function BookingCalendar({ scope }: { scope?: 'CLUB' | 'MUNICIPALITY' | 'SUPER' }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [bookings, setBookings] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]); // For showing schedule slots
  const [preSelectedSlot, setPreSelectedSlot] = useState<{slot: any, resource: any, date: Date} | null>(null);
  
  // Filters
  const [clubs, setClubs] = useState<any[]>([]);
  const [selectedClub, setSelectedClub] = useState('');
  
  // Initialize selectedResource from URL params or localStorage
  const [selectedResource, setSelectedResource] = useState(() => {
    // First try URL params (from Next.js searchParams)
    const urlResource = searchParams.get('resource');
    if (urlResource) return urlResource;
    
    // Then try localStorage (only on client side)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`booking-calendar-resource-${scope || 'default'}`);
      if (stored) return stored;
    }
    return '';
  });
  
  // Sync selectedResource when URL params change
  useEffect(() => {
    const urlResource = searchParams.get('resource');
    if (urlResource && urlResource !== selectedResource) {
      setSelectedResource(urlResource);
    } else if (!urlResource && selectedResource) {
      // If URL doesn't have resource but state does, check localStorage
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`booking-calendar-resource-${scope || 'default'}`);
        if (stored && stored !== selectedResource) {
          setSelectedResource(stored);
        }
      }
    }
  }, [searchParams, scope]);

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

  // Fetch Available Slots function
  const fetchAvailableSlots = async () => {
    if (!selectedResource) {
      setAvailableSlots([]);
      return;
    }
    try {
      const startStr = format(currentWeekStart, 'yyyy-MM-dd');
      const endStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
      
      console.log('🔍 Fetching slots for resource:', selectedResource, 'from', startStr, 'to', endStr);
      const res = await api.get(`/bookings/resources/${selectedResource}/availability/?start_date=${startStr}&end_date=${endStr}`);
      const slotsData = Array.isArray(res.data) ? res.data : [];
      console.log('✅ Fetched available slots:', slotsData.length, 'slots');
      console.log('📋 Slot data sample:', slotsData[0]);
      console.log('📋 All slots:', slotsData);
      setAvailableSlots(slotsData);
    } catch (e) {
      console.error('❌ Error fetching available slots:', e);
      setAvailableSlots([]);
    }
  };

  // 3. Fetch Bookings
  useEffect(() => {
    fetchBookings();
  }, [currentWeekStart, selectedResource, selectedClub]);

  // 4. Fetch Available Slots (schedule slots) when a resource is selected
  useEffect(() => {
    console.log('🔄 useEffect triggered - selectedResource:', selectedResource, 'currentWeekStart:', currentWeekStart);
    if (selectedResource) {
      console.log('✅ Calling fetchAvailableSlots for resource:', selectedResource);
      const fetchSlots = async () => {
        if (!selectedResource) {
          setAvailableSlots([]);
          return;
        }
        try {
          const startStr = format(currentWeekStart, 'yyyy-MM-dd');
          const endStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
          
          console.log('🔍 Fetching slots for resource:', selectedResource, 'from', startStr, 'to', endStr);
          const url = `/bookings/resources/${selectedResource}/availability/?start_date=${startStr}&end_date=${endStr}`;
          console.log('🌐 API URL:', url);
          const res = await api.get(url);
          console.log('📦 API Response:', res);
          console.log('📦 Response data:', res.data);
          const slotsData = Array.isArray(res.data) ? res.data : [];
          console.log('✅ Fetched available slots:', slotsData.length, 'slots');
          if (slotsData.length > 0) {
            console.log('📋 Slot data sample:', slotsData[0]);
          }
          console.log('📋 All slots:', slotsData);
          setAvailableSlots(slotsData);
        } catch (e: any) {
          console.error('❌ Error fetching available slots:', e);
          console.error('❌ Error details:', e.response?.data || e.message);
          console.error('❌ Error status:', e.response?.status);
          setAvailableSlots([]);
        }
      };
      fetchSlots();
    } else {
      console.log('⚠️ No resource selected, clearing slots');
      setAvailableSlots([]);
    }
  }, [selectedResource, currentWeekStart]);

  const fetchBookings = async () => {
    setLoading(true);
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
      const bookingsData = Array.isArray(res.data) ? res.data : res.data.results || [];
      console.log('Fetched bookings:', bookingsData.length, 'for week', startStr, 'to', endStr);
      setBookings(bookingsData);
    } catch (e) { 
      console.error('Error fetching bookings:', e);
      setBookings([]);
    } finally {
      setLoading(false);
    }
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col h-[calc(100vh-200px)] min-h-[700px]">
      {/* Toolbar - Google Calendar Style */}
      <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap gap-4 justify-between items-center bg-white">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentWeekStart(d => addDays(d, -7))} 
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600"/>
            </button>
            <button 
              onClick={() => setCurrentWeekStart(d => addDays(d, 7))} 
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Next week"
            >
              <ChevronRight className="w-5 h-5 text-gray-600"/>
            </button>
            <button 
              onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} 
              className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors border border-gray-300"
            >
              Today
            </button>
          </div>
          <div className="text-lg font-normal text-gray-900">
            {format(currentWeekStart, 'MMMM d')} - {format(addDays(currentWeekStart, 6), 'd, yyyy')}
          </div>
        </div>

        <div className="flex gap-3 items-center">
            {(scope === 'MUNICIPALITY' || scope === 'SUPER') && (
                <select 
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[150px] bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm min-w-[200px] bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={selectedResource}
            onChange={e => {
              const newResourceId = e.target.value;
              console.log('📋 Resource dropdown changed to:', newResourceId, typeof newResourceId);
              setSelectedResource(newResourceId);
              
              // Update URL params
              const params = new URLSearchParams(searchParams.toString());
              if (newResourceId) {
                params.set('resource', newResourceId);
              } else {
                params.delete('resource');
              }
              router.replace(`${pathname}?${params.toString()}`);
              
              // Persist to localStorage
              if (typeof window !== 'undefined') {
                if (newResourceId) {
                  localStorage.setItem(`booking-calendar-resource-${scope || 'default'}`, newResourceId);
                } else {
                  localStorage.removeItem(`booking-calendar-resource-${scope || 'default'}`);
                }
              }
            }}
            >
            <option value="">All Resources</option>
            {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>

            {/* New Booking Button - Google Calendar Style */}
            <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-md font-medium text-sm flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-colors"
            >
                <Plus className="w-4 h-4" /> Create
            </button>
        </div>
      </div>

      {/* Calendar Grid - Google Calendar Style */}
      <div className="flex-1 overflow-y-auto flex bg-white">
        {/* Time Column - Google Calendar Style */}
        <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-white pt-12">
          {HOURS.map(h => (
            <div key={h} className="h-[60px] text-right pr-3 text-xs text-gray-500 font-normal -mt-2">
              {h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}
            </div>
          ))}
        </div>

        {/* Days Columns - Google Calendar Style */}
        <div className="flex-1 flex min-w-[800px]">
          {weekDays.map(day => {
            const dayBookings = bookings.filter(b => {
              try {
                return isSameDay(parseISO(b.start_time), day);
              } catch (e) {
                console.error('Error parsing booking date:', b.start_time, e);
                return false;
              }
            });
            
            const daySlots = selectedResource ? availableSlots.filter(slot => {
              try {
                // Handle both ISO string and datetime object formats
                let slotDate: Date;
                if (typeof slot.start === 'string') {
                  slotDate = parseISO(slot.start);
                } else if (slot.start instanceof Date) {
                  slotDate = slot.start;
                } else {
                  // Try to parse as ISO string
                  slotDate = new Date(slot.start);
                }
                
                if (isNaN(slotDate.getTime())) {
                  console.warn('Invalid slot date:', slot.start);
                  return false;
                }
                
                return isSameDay(slotDate, day);
              } catch (e) {
                console.error('Error filtering slot for day:', slot, e);
                return false;
              }
            }) : [];
            
            const isToday = isSameDay(day, new Date());
            
            return (
              <div key={day.toString()} className="flex-1 border-r border-gray-200 min-w-[120px] relative bg-white">
                {/* Header - Google Calendar Style */}
                <div className={`h-12 border-b border-gray-200 flex flex-col items-center justify-center px-2 ${isToday ? 'bg-blue-50' : 'bg-white'}`}>
                  <div className={`text-xs font-medium uppercase tracking-wide ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-lg font-normal mt-0.5 ${isToday ? 'text-blue-600 font-semibold' : 'text-gray-900'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
                
              {/* Grid Lines - Google Calendar Style */}
              <div className="relative h-[900px]"> 
                {HOURS.map(h => (
                  <div key={h} className="h-[60px] border-b border-gray-100"></div>
                ))}

                {/* Available Slots (Schedule) - Show as green when available, grey when booked */}
                {daySlots.length > 0 && daySlots.map((slot, idx) => {
                    try {
                      // Parse slot times - handle different formats
                      let slotStart: Date;
                      let slotEnd: Date;
                      
                      if (typeof slot.start === 'string') {
                        slotStart = parseISO(slot.start);
                      } else {
                        slotStart = new Date(slot.start);
                      }
                      
                      if (typeof slot.end === 'string') {
                        slotEnd = parseISO(slot.end);
                      } else {
                        slotEnd = new Date(slot.end);
                      }
                      
                      if (isNaN(slotStart.getTime()) || isNaN(slotEnd.getTime())) {
                        console.error('Invalid slot times:', slot);
                        return null;
                      }
                      
                      const startMinutes = (slotStart.getHours() - 8) * 60 + slotStart.getMinutes();
                      const durationMinutes = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60);
                      
                      // Check if this slot overlaps with any APPROVED booking (CANCELLED/REJECTED don't block)
                      const isBooked = dayBookings.some(booking => {
                        try {
                          // Only APPROVED bookings block availability
                          if (booking.status !== 'APPROVED') {
                            return false;
                          }
                          const bookingStart = new Date(booking.start_time);
                          const bookingEnd = new Date(booking.end_time);
                          // Check for overlap: slot overlaps if slotStart < bookingEnd AND slotEnd > bookingStart
                          return slotStart < bookingEnd && slotEnd > bookingStart;
                        } catch {
                          return false;
                        }
                      });
                      
                      return (
                        <button
                          key={`slot-${day.toString()}-${idx}-${slot.start}`}
                          onClick={() => {
                            if (!isBooked && selectedResource) {
                              // Open modal with pre-selected slot
                              const resource = resources.find(r => r.id === parseInt(selectedResource));
                              setShowCreateModal(true);
                              // We'll pass the slot data via a ref or state
                              setPreSelectedSlot({ slot, resource, date: day });
                            }
                          }}
                          disabled={isBooked}
                          style={{
                            top: `${(startMinutes / 60) * 60}px`,
                            height: `${(durationMinutes / 60) * 60}px`,
                            zIndex: 0
                          }}
                          className={`absolute left-0 right-0 border-l-4 ${
                            isBooked 
                              ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed pointer-events-none' 
                              : 'bg-green-50 border-green-400 opacity-70 cursor-pointer hover:bg-green-100 hover:opacity-90 hover:border-green-500 transition-all'
                          }`}
                          title={`${isBooked ? 'Booked' : 'Click to book'}: ${format(slotStart, 'HH:mm')} - ${format(slotEnd, 'HH:mm')}`}
                        >
                          {!isBooked && (
                            <div className="text-[10px] font-medium text-green-700 px-1.5 pt-1 leading-tight">
                              {format(slotStart, 'HH:mm')} - {format(slotEnd, 'HH:mm')}
                            </div>
                          )}
                        </button>
                      );
                    } catch (e) {
                      console.error('❌ Error rendering slot:', slot, e);
                      return null;
                    }
                  })}

                {/* Bookings (Actual Reservations) - Google Calendar Style */}
                {dayBookings.map(b => {
                  const style = getPosition(b);
                  // Only show APPROVED and PENDING bookings prominently (CANCELLED/REJECTED shown faded)
                  const isActive = b.status === 'APPROVED' || b.status === 'PENDING';
                  const isCancelled = b.status === 'CANCELLED';
                  const isRejected = b.status === 'REJECTED';
                  const isInactive = isCancelled || isRejected;
                  
                  // Google Calendar style colors
                  const getStatusStyles = () => {
                    if (b.status === 'APPROVED') {
                      return 'bg-blue-600 border-l-4 border-blue-700 text-white shadow-sm';
                    } else if (b.status === 'PENDING') {
                      return 'bg-yellow-500 border-l-4 border-yellow-600 text-white shadow-sm';
                    } else if (b.status === 'CANCELLED') {
                      return 'bg-gray-200 border-l-4 border-gray-300 text-gray-500 opacity-60 line-through';
                    } else if (b.status === 'REJECTED') {
                      return 'bg-red-200 border-l-4 border-red-300 text-red-600 opacity-10';
                    } else {
                      return 'bg-gray-400 border-l-4 border-gray-500 text-white opacity-50';
                    }
                  };
                  
                  return (
                    <div
                      key={b.id}
                      onClick={() => !isInactive && setSelectedBooking(b)}
                      style={{ 
                        top: style.top, 
                        height: style.height, 
                        zIndex: isActive ? 10 : 0,
                        pointerEvents: isInactive ? 'none' : 'auto',
                        minHeight: '20px'
                      }}
                      className={`absolute left-1 right-1 rounded-md text-xs px-2 py-1 text-left overflow-hidden transition-all
                        ${isInactive ? '' : 'hover:z-20 hover:shadow-lg cursor-pointer'}
                        ${getStatusStyles()}
                      `}
                      title={b.status === 'CANCELLED' ? 'Cancelled - Slot is available (click the green slot below to book)' : 
                             b.status === 'REJECTED' ? 'Rejected - Slot is available (click the green slot below to book)' : 
                             `${b.status} - Click to view details`}
                    >
                      <div className="font-medium truncate text-[11px] leading-tight">
                        {b.user_detail?.first_name && b.user_detail?.last_name 
                          ? `${b.user_detail.first_name} ${b.user_detail.last_name}`
                          : b.user_detail?.first_name || 'Unknown'}
                      </div>
                      {style.height && parseFloat(style.height.replace('px', '')) > 30 && (
                        <div className="truncate text-[10px] opacity-90 mt-0.5 leading-tight">{b.resource_name || 'Unknown Resource'}</div>
                      )}
                      {b.status === 'CANCELLED' && (
                        <div className="text-[9px] uppercase font-semibold mt-0.5">Cancelled</div>
                      )}
                      {b.status === 'REJECTED' && (
                        <div className="text-[9px] uppercase font-semibold mt-0.5">Rejected</div>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Empty State Message - Only show if no bookings AND no available slots */}
      {bookings.length === 0 && !loading && (!selectedResource || availableSlots.length === 0) && (
        <div className="p-8 text-center border-t border-gray-200 bg-gray-50">
          <p className="text-gray-500 font-medium mb-2">
            {selectedResource 
              ? 'No bookings found for this resource this week' 
              : 'No bookings found for this week'}
          </p>
          <p className="text-sm text-gray-400">
            {selectedResource 
              ? 'This resource has no bookings yet. Click "New Booking" to create one, or check the Schedule page to ensure time slots are configured.'
              : 'Create a booking or select a resource to view its schedule.'}
          </p>
        </div>
      )}
      
      {/* Info message when resource is selected and has slots but no bookings */}
      {selectedResource && availableSlots.length > 0 && bookings.length === 0 && !loading && (
        <div className="p-4 text-center border-t border-gray-200 bg-blue-50">
          <p className="text-sm text-blue-700">
            ✓ This resource has {availableSlots.length} available time slot{availableSlots.length !== 1 ? 's' : ''} this week. 
            Click "New Booking" to create a reservation.
          </p>
        </div>
      )}

      {showCreateModal && (
        <AdminCreateBookingModal 
          onClose={() => {
            setShowCreateModal(false);
            setPreSelectedSlot(null);
          }}
          onSuccess={() => {
            fetchBookings(); // Refresh calendar
            // Refresh slots if resource is selected
            if (selectedResource) {
              const refreshSlots = async () => {
                try {
                  const startStr = format(currentWeekStart, 'yyyy-MM-dd');
                  const endStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
                  const res = await api.get(`/bookings/resources/${selectedResource}/availability/?start_date=${startStr}&end_date=${endStr}`);
                  const slotsData = Array.isArray(res.data) ? res.data : [];
                  setAvailableSlots(slotsData);
                } catch (e) {
                  console.error('Error refreshing slots:', e);
                }
              };
              refreshSlots();
            }
            setPreSelectedSlot(null);
          }}
          scope={scope}
          preSelectedSlot={preSelectedSlot}
        />
      )}

      {selectedBooking && (
        <BookingDetailModal 
          booking={selectedBooking} 
          onClose={() => setSelectedBooking(null)}
          onUpdate={() => {
            fetchBookings(); // Refresh bookings
            // Refresh available slots if resource is selected
            if (selectedResource) {
              const refreshSlots = async () => {
                try {
                  const startStr = format(currentWeekStart, 'yyyy-MM-dd');
                  const endStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
                  const res = await api.get(`/bookings/resources/${selectedResource}/availability/?start_date=${startStr}&end_date=${endStr}`);
                  const slotsData = Array.isArray(res.data) ? res.data : [];
                  setAvailableSlots(slotsData);
                } catch (e) {
                  console.error('Error refreshing slots:', e);
                }
              };
              refreshSlots();
            }
          }}
        />
      )}
    </div>
  );
}

