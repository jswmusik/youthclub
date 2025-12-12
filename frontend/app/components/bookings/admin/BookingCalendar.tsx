'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import BookingDetailModal from './BookingDetailModal';
import AdminCreateBookingModal from './AdminCreateBookingModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 to 22:00

export interface BookingCalendarRef {
  openCreateModal: () => void;
}

const BookingCalendar = forwardRef<BookingCalendarRef, { scope?: 'CLUB' | 'MUNICIPALITY' | 'SUPER' }>(
  ({ scope }, ref) => {
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
  
  // Expose method to open create modal via ref
  useImperativeHandle(ref, () => ({
    openCreateModal: () => setShowCreateModal(true)
  }));
  
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

  if (loading) {
    return (
      <Card className="border-none shadow-sm h-full flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-pulse text-gray-400">Loading calendar...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm h-full flex flex-col min-h-0">
      {/* Header */}
      <CardHeader className="border-b border-gray-200 pb-4 flex-shrink-0">
        <div className="flex flex-col gap-4">
          {/* Date Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-[#4D4DA4]" />
                <CardTitle className="text-lg sm:text-xl font-bold text-[#121213]">
                  {format(currentWeekStart, 'MMMM d')} - {format(addDays(currentWeekStart, 6), 'd, yyyy')}
                </CardTitle>
              </div>
              <div className="flex items-center rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentWeekStart(d => addDays(d, -7))}
                  className="h-9 w-9 rounded-none hover:bg-muted"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                  className="h-9 px-3 text-sm font-medium rounded-none hover:bg-muted border-x border-gray-200"
                >
                  Today
                </Button>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentWeekStart(d => addDays(d, 7))}
                  className="h-9 w-9 rounded-none hover:bg-muted"
                  aria-label="Next week"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {(scope === 'MUNICIPALITY' || scope === 'SUPER') && (
              <select 
                className="flex h-9 w-full sm:w-auto sm:min-w-[150px] rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-1.5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
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
              className="flex h-9 w-full sm:w-auto sm:min-w-[200px] rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-1.5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D4DA4] focus-visible:border-[#4D4DA4]"
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
          </div>
        </div>
      </CardHeader>

      {/* Calendar Grid */}
      <CardContent className="flex-1 p-0 min-h-0 flex flex-col">
        {/* Desktop View */}
        <div className="hidden lg:flex flex-1 overflow-y-auto overflow-x-hidden bg-white min-h-0">
          {/* Time Column */}
          <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50 pt-12 sticky left-0 z-10">
            {HOURS.map(h => (
              <div key={h} className="h-[60px] text-right pr-3 text-xs text-gray-500 font-normal -mt-2">
                {h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}
              </div>
            ))}
          </div>

          {/* Days Columns */}
          <div className="flex-1 flex min-w-0">
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
              <div key={day.toString()} className="flex-1 border-r border-gray-200 min-w-0 relative bg-white last:border-r-0">
                {/* Header */}
                <div className={cn(
                  "h-12 border-b border-gray-200 flex flex-col items-center justify-center px-2",
                  isToday ? 'bg-[#EBEBFE]/30' : 'bg-white'
                )}>
                  <div className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    isToday ? 'text-[#4D4DA4]' : 'text-gray-500'
                  )}>
                    {format(day, 'EEE')}
                  </div>
                  <div className={cn(
                    "text-base font-semibold mt-0.5",
                    isToday ? 'text-[#4D4DA4]' : 'text-[#121213]'
                  )}>
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
                          className={cn(
                            "absolute left-0 right-0 border-l-4 transition-all",
                            isBooked 
                              ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed pointer-events-none' 
                              : 'bg-green-50 border-green-400 opacity-70 cursor-pointer hover:bg-green-100 hover:opacity-90 hover:border-green-500'
                          )}
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
                  
                  // Brand style colors
                  const getStatusStyles = () => {
                    if (b.status === 'APPROVED') {
                      return 'bg-[#4D4DA4] border-l-4 border-[#4D4DA4] text-white shadow-sm';
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

        {/* Mobile View - List of days with bookings */}
        <div className="lg:hidden flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {weekDays.map(day => {
            const dayBookings = bookings.filter(b => {
              try {
                return isSameDay(parseISO(b.start_time), day);
              } catch (e) {
                return false;
              }
            });
            
            const isToday = isSameDay(day, new Date());
            
            return (
              <Card key={day.toString()} className={cn("border-2", isToday && "border-[#4D4DA4]")}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className={cn("text-sm font-semibold", isToday && "text-[#4D4DA4]")}>
                        {format(day, 'EEEE')}
                      </CardTitle>
                      <p className={cn("text-xs text-gray-500 mt-0.5", isToday && "text-[#4D4DA4]")}>
                        {format(day, 'MMMM d')}
                      </p>
                    </div>
                    {isToday && (
                      <Badge className="bg-[#4D4DA4] text-white text-xs">Today</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {dayBookings.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">No bookings</p>
                  ) : (
                    dayBookings.map(b => {
                      const start = new Date(b.start_time);
                      const end = new Date(b.end_time);
                      const isCancelled = b.status === 'CANCELLED';
                      const isRejected = b.status === 'REJECTED';
                      const isInactive = isCancelled || isRejected;
                      
                      return (
                        <div
                          key={b.id}
                          onClick={() => !isInactive && setSelectedBooking(b)}
                          className={cn(
                            "p-2.5 rounded-lg border-2 cursor-pointer transition-all",
                            b.status === 'APPROVED' && 'bg-[#EBEBFE]/30 border-[#4D4DA4]',
                            b.status === 'PENDING' && 'bg-yellow-50 border-yellow-400',
                            b.status === 'CANCELLED' && 'bg-gray-100 border-gray-300 opacity-60 line-through',
                            b.status === 'REJECTED' && 'bg-red-50 border-red-300 opacity-60',
                            !isInactive && 'hover:shadow-md active:scale-[0.98]'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs text-[#121213] truncate">
                                {b.user_detail?.first_name && b.user_detail?.last_name 
                                  ? `${b.user_detail.first_name} ${b.user_detail.last_name}`
                                  : b.user_detail?.first_name || 'Unknown'}
                              </div>
                              <div className="text-[10px] text-gray-500 mt-0.5">
                                {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                              </div>
                              {b.resource_name && (
                                <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                                  {b.resource_name}
                                </div>
                              )}
                            </div>
                            <Badge 
                              variant="outline"
                              className={cn(
                                "shrink-0 text-[10px] px-1.5 py-0",
                                b.status === 'APPROVED' && 'bg-[#4D4DA4] text-white border-[#4D4DA4]',
                                b.status === 'PENDING' && 'bg-yellow-500 text-white border-yellow-500',
                                b.status === 'CANCELLED' && 'bg-gray-300 text-gray-600 border-gray-300',
                                b.status === 'REJECTED' && 'bg-red-300 text-red-700 border-red-300'
                              )}
                            >
                              {b.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {bookings.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-gray-500 font-medium mb-1">
                  {selectedResource 
                    ? 'No bookings found for this resource this week' 
                    : 'No bookings found for this week'}
                </p>
                <p className="text-xs text-gray-400">
                  {selectedResource 
                    ? 'This resource has no bookings yet. Click "New Booking" to create one.'
                    : 'Create a booking or select a resource to view its schedule.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Empty State Message - Desktop */}
        {bookings.length === 0 && !loading && (!selectedResource || availableSlots.length === 0) && (
          <div className="hidden lg:flex p-8 text-center border-t border-gray-200 bg-gray-50 items-center justify-center">
            <div>
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
          </div>
        )}
        
        {/* Info message when resource is selected and has slots but no bookings */}
        {selectedResource && availableSlots.length > 0 && bookings.length === 0 && !loading && (
          <div className="hidden lg:flex p-4 text-center border-t border-gray-200 bg-[#EBEBFE]/30 items-center justify-center">
            <p className="text-sm text-[#4D4DA4]">
              ✓ This resource has {availableSlots.length} available time slot{availableSlots.length !== 1 ? 's' : ''} this week. 
              Click "New Booking" to create a reservation.
            </p>
          </div>
        )}
      </CardContent>

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
    </Card>
  );
});

BookingCalendar.displayName = 'BookingCalendar';

export default BookingCalendar;

